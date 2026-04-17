import type { FeatureCollection, Geometry, Position } from "geojson";

import { getBoatDensityPlan, getRingBoatAllowance } from "@/features/map/lib/transport/boat-density";
import {
  boatScaleForZoom,
  headingAtRingFraction,
  headingJitter,
  inBounds,
  isFarEnough,
  jitteredFraction,
  minDistanceToRingEdge,
  pointInRing,
  polygonRings,
  ringPerimeter,
  ringArea,
  safeCenterBiasedPointAtRingFraction,
} from "@/features/map/lib/transport/boat-placement";

type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type WaterFeature = {
  geometry?: Geometry;
};

type BuildBoatEntitiesParams = {
  waterFeatures: WaterFeature[];
  zoom: number;
  phase: number;
  bounds: Bounds | null;
  enabled: boolean;
  densityMultiplier?: number;
};

function buildBoatHullPolygon(center: Position, headingDeg: number, scale: number): Position[] {
  const [lng, lat] = center;
  const rad = (headingDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotate = (x: number, y: number): Position => [lng + x * cos - y * sin, lat + x * sin + y * cos];

  return [
    rotate(scale * 2.5, 0),
    rotate(scale * 1.8, scale * 0.24),
    rotate(scale * 0.4, scale * 0.46),
    rotate(-scale * 2.1, scale * 0.42),
    rotate(-scale * 2.45, 0),
    rotate(-scale * 2.1, -scale * 0.42),
    rotate(scale * 0.4, -scale * 0.46),
    rotate(scale * 1.8, -scale * 0.24),
    rotate(scale * 2.5, 0),
  ];
}

function buildBoatCabinPolygon(center: Position, headingDeg: number, scale: number): Position[] {
  const [lng, lat] = center;
  const rad = (headingDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotate = (x: number, y: number): Position => [lng + x * cos - y * sin, lat + x * sin + y * cos];

  return [
    rotate(scale * 0.35, scale * 0.2),
    rotate(-scale * 0.95, scale * 0.21),
    rotate(-scale * 1.1, 0),
    rotate(-scale * 0.95, -scale * 0.21),
    rotate(scale * 0.35, -scale * 0.2),
    rotate(scale * 0.35, scale * 0.2),
  ];
}

function buildBoatDeckLine(center: Position, headingDeg: number, scale: number): Position[] {
  const [lng, lat] = center;
  const rad = (headingDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotate = (x: number, y: number): Position => [lng + x * cos - y * sin, lat + x * sin + y * cos];

  return [rotate(scale * 1.45, 0), rotate(-scale * 1.6, 0)];
}

function buildBoatWakeLine(center: Position, headingDeg: number, scale: number): Position[] {
  const [lng, lat] = center;
  const rad = (headingDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotate = (x: number, y: number): Position => [lng + x * cos - y * sin, lat + x * sin + y * cos];

  return [rotate(-scale * 1.8, 0), rotate(-scale * 4.8, 0)];
}

export function buildBoatEntities({
  waterFeatures,
  zoom,
  phase,
  bounds,
  enabled,
  densityMultiplier = 1,
}: BuildBoatEntitiesParams): FeatureCollection {
  if (!enabled || zoom < 11.75) {
    return { type: "FeatureCollection", features: [] };
  }

  const rings = waterFeatures
    .flatMap((feature) => polygonRings(feature.geometry))
    .map((ring) => ({ ring, area: ringArea(ring) }))
    .filter(({ area }) => area > 0.0000007)
    .sort((a, b) => b.area - a.area)
    .slice(0, zoom >= 16 ? 18 : zoom >= 14 ? 14 : 10);

  const totalVisibleWaterArea = rings.reduce((sum, item) => sum + item.area, 0);
  const densityPlan = getBoatDensityPlan(zoom, totalVisibleWaterArea, densityMultiplier);
  if (!densityPlan.maxBoats) {
    return { type: "FeatureCollection", features: [] };
  }

  const features: FeatureCollection["features"] = [];
  const acceptedCenters: Position[] = [];
  const minSpacing = zoom >= 16 ? 0.00012 : zoom >= 14 ? 0.00017 : 0.00023;
  const targetBoats = densityPlan.maxBoats;

  let fleetIndex = 0;
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex += 1) {
    if (fleetIndex >= targetBoats) break;

    const { ring, area } = rings[ringIndex] ?? {};
    if (!ring) continue;
    const perimeter = ringPerimeter(ring);
    const estimatedWaterHalfWidth = perimeter > 0 ? area / perimeter : 0;
    const shoreBuffer = Math.max(
      estimatedWaterHalfWidth * 0.28,
      (zoom >= 16 ? 0.000045 : zoom >= 14 ? 0.00006 : 0.000075) * 0.7,
    );

    const attempts = Math.max(1, Math.floor(getRingBoatAllowance(area, zoom) * (2 + densityPlan.ringCandidateScale)));
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (fleetIndex >= targetBoats) break;

      const seed = (ringIndex + 1) * 73.1 + (attempt + 1) * 11.7;
      const fraction = jitteredFraction(seed, attempt, phase);
      const center = safeCenterBiasedPointAtRingFraction(ring, fraction, 0.22);
      if (
        !center ||
        !pointInRing(center, ring) ||
        minDistanceToRingEdge(center, ring) < shoreBuffer ||
        !inBounds(center, bounds) ||
        !isFarEnough(center, acceptedCenters, minSpacing)
      ) {
        continue;
      }

      const heading = headingAtRingFraction(ring, fraction);
      if (heading === null) continue;

      const headingDeg = heading + headingJitter(seed);
      const headingRad = (headingDeg * Math.PI) / 180;
      const dirX = Math.cos(headingRad);
      const dirY = Math.sin(headingRad);
      const scale = boatScaleForZoom(zoom, area) * (0.92 + (fleetIndex % 4) * 0.06);
      const speed = Math.min(0.65, 0.12 + (scale * 26000) / Math.max(1, zoom));
      const hull = buildBoatHullPolygon(center, headingDeg, scale);
      const cabin = buildBoatCabinPolygon(center, headingDeg, scale);
      const deckLine = buildBoatDeckLine(center, headingDeg, scale);
      const wakeLine = buildBoatWakeLine(center, headingDeg, scale);
      const shadow = hull.map(([lng, lat]) => [lng + scale * 0.25, lat - scale * 0.18] as Position);

      acceptedCenters.push(center);
      fleetIndex += 1;

      const boatMeta = {
        boatId: `${ringIndex}-${attempt}-${fleetIndex}`,
        centerLng: center[0],
        centerLat: center[1],
        dirX,
        dirY,
        speed,
      };

      features.push(
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [shadow] },
          properties: { part: "shadow", mode: "boats", ...boatMeta },
        },
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [hull] },
          properties: { part: "hull", mode: "boats", ...boatMeta },
        },
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [cabin] },
          properties: { part: "cabin", mode: "boats", ...boatMeta },
        },
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: deckLine },
          properties: { part: "deck", mode: "boats", ...boatMeta },
        },
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: wakeLine },
          properties: { part: "wake", mode: "boats", wakeOpacity: 0.26, ...boatMeta },
        },
      );
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
