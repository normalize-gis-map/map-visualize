import type { FeatureCollection, Position } from "geojson";

import type { AmbientRoadClass } from "@/features/map/lib/traffic/get-road-class-lane-offset";
import type { TransportMode } from "@/features/map/store/map.store";

type RouteLike = {
  coordinates: Position[];
  roadClass?: AmbientRoadClass;
};

type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type BuildTransportEntitiesParams = {
  phase: number;
  zoom: number;
  routes: RouteLike[];
  bounds: Bounds | null;
  transportVisibility: Record<TransportMode, boolean>;
  bikeDensity: number;
  peopleDensity: number;
};

function pointAtFraction(coords: Position[], fraction: number): Position | null {
  if (coords.length < 2) return null;
  const clamped = Math.max(0, Math.min(0.999, fraction));
  const scaled = clamped * (coords.length - 1);
  const index = Math.floor(scaled);
  const t = scaled - index;
  const start = coords[index];
  const end = coords[index + 1] ?? start;
  if (!start || !end) return null;
  return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
}

function headingAtFraction(coords: Position[], fraction: number): number | null {
  if (coords.length < 2) return null;
  const a = pointAtFraction(coords, Math.max(0, fraction - 0.01));
  const b = pointAtFraction(coords, Math.min(0.999, fraction + 0.01));
  if (!a || !b) return null;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (Math.abs(dx) < 1e-8 && Math.abs(dy) < 1e-8) return null;
  return (Math.atan2(dx, dy) * 180) / Math.PI;
}

function hashRoute(route: RouteLike, index: number): number {
  const start = route.coordinates[0];
  const seed = `${start?.[0] ?? 0}:${start?.[1] ?? 0}:${route.roadClass ?? "local"}:${index}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function inBounds(point: Position, bounds: Bounds | null) {
  if (!bounds) return true;
  const [lng, lat] = point;
  return lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north;
}

function transportCap(zoom: number, mode: TransportMode, densityMultiplier: number) {
  if (mode === "cars" || mode === "boats") return 0;

  if (mode === "bike") {
    if (zoom < 13) return 0;
    if (zoom < 15) return Math.round(3 * densityMultiplier);
    if (zoom < 17) return Math.round(7 * densityMultiplier);
    return Math.round(11 * densityMultiplier);
  }

  if (zoom < 14) return 0;
  if (zoom < 16) return Math.round(3 * densityMultiplier);
  if (zoom < 18) return Math.round(7 * densityMultiplier);
  return Math.round(12 * densityMultiplier);
}

function routeEligibleForMode(mode: TransportMode, roadClass: AmbientRoadClass | undefined) {
  if (mode === "bike") {
    return roadClass === "local" || roadClass === "medium";
  }

  if (mode === "people") {
    return roadClass === "local";
  }

  return true;
}

function routeScoreForMode(mode: TransportMode, roadClass: AmbientRoadClass | undefined) {
  if (mode === "bike") {
    if (roadClass === "local") return 1.18;
    if (roadClass === "medium") return 1;
    return 0.25;
  }

  if (mode === "people") {
    if (roadClass === "local") return 1.2;
    if (roadClass === "medium") return 0.62;
    return 0.08;
  }

  return 1;
}

function speedByMode(mode: TransportMode) {
  if (mode === "bike") return 0.0038;
  if (mode === "people") return 0.0018;
  return 0.0028;
}

function phaseShiftByMode(mode: TransportMode, index: number) {
  if (mode === "bike") return index * 0.089;
  if (mode === "people") return index * 0.11;
  return index * 0.137;
}

function offsetPerpendicular(point: Position, headingDeg: number, offset: number): Position {
  const rad = ((headingDeg + 90) * Math.PI) / 180;
  return [point[0] + Math.sin(rad) * offset, point[1] + Math.cos(rad) * offset];
}

export function buildTransportEntities({
  phase,
  zoom,
  routes,
  bounds,
  transportVisibility,
  bikeDensity,
  peopleDensity,
}: BuildTransportEntitiesParams): FeatureCollection {
  const features: FeatureCollection["features"] = [];

  const activeModes = (Object.entries(transportVisibility) as Array<[
    TransportMode,
    boolean,
  ]>).filter(([, active]) => active && !Number.isNaN(phase));

  for (const [mode] of activeModes) {
    if (mode === "cars") continue;

    const cap = transportCap(
      zoom,
      mode,
      mode === "bike" ? bikeDensity : mode === "people" ? peopleDensity : 1,
    );
    if (!cap || cap <= 0) continue;

    const routePool = routes
      .map((route, index) => ({ route, index }))
      .filter(
        ({ route }) =>
          route.coordinates.length > 2 && routeEligibleForMode(mode, route.roadClass),
      )
      .map(({ route, index }) => ({
        route,
        score:
          routeScoreForMode(mode, route.roadClass) +
          (hashRoute(route, index) % 17) * 0.003,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.route);

    if (!routePool.length) continue;

    for (let index = 0; index < Math.min(cap, routePool.length); index += 1) {
      const route = routePool[index];
      if (!route?.coordinates?.length) continue;

      const offset =
        (phaseShiftByMode(mode, index) + phase * speedByMode(mode)) % 1;
      const point = pointAtFraction(route.coordinates, offset);
      if (!point || !inBounds(point, bounds)) continue;
      const heading = headingAtFraction(route.coordinates, offset) ?? ((offset * 360 + index * 17) % 360) - 180;
      const lateralOffset =
        mode === "bike"
          ? (index % 2 === 0 ? 1 : -1) * 0.000022
          : mode === "people"
            ? (index % 2 === 0 ? 1 : -1) * 0.00003
            : 0;
      const placedPoint = lateralOffset ? offsetPerpendicular(point, heading, lateralOffset) : point;
      if (!inBounds(placedPoint, bounds)) continue;

      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: placedPoint,
        },
        properties: {
          mode,
          heading,
          roadClass: route.roadClass ?? "local",
        },
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
