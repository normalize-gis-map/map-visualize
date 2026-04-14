import type { FeatureCollection, GeoJsonProperties, Geometry, Position } from "geojson";

import {
  createSeededPoint,
  getStableSeed,
  pointInPolygon,
  unitFromStableHash,
} from "@/features/map/lib/get-stable-seed-points";

type TreeType = "tall" | "compact" | "ornamental";

type GreenFeature = {
  id?: string | number;
  geometry?: Geometry;
  properties?: GeoJsonProperties;
};

type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

const TREE_SPACING_BY_ZOOM: Record<number, number> = {
  0: 0.00062,
  1: 0.00062,
  2: 0.00062,
};

function getSpacingDeg(zoom: number): { lng: number; lat: number } {
  const zoomBucket = zoom >= 17 ? 2 : zoom >= 15 ? 1 : 0;
  const latSpacing = TREE_SPACING_BY_ZOOM[zoomBucket] ?? TREE_SPACING_BY_ZOOM[0];
  return { lng: latSpacing, lat: latSpacing * 0.9 };
}

function geometryToPolygons(geometry?: Geometry): Position[][][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function ringBounds(ring: Position[]): Bounds | null {
  if (!ring.length) return null;

  let west = Number.POSITIVE_INFINITY;
  let east = Number.NEGATIVE_INFINITY;
  let south = Number.POSITIVE_INFINITY;
  let north = Number.NEGATIVE_INFINITY;

  for (const point of ring) {
    if (!point) continue;
    west = Math.min(west, point[0]);
    east = Math.max(east, point[0]);
    south = Math.min(south, point[1]);
    north = Math.max(north, point[1]);
  }

  if (!Number.isFinite(west) || !Number.isFinite(east)) return null;
  return { west, south, east, north };
}

function intersects(a: Bounds, b: Bounds): boolean {
  return !(a.east < b.west || a.west > b.east || a.north < b.south || a.south > b.north);
}

function clampBounds(bounds: Bounds, clip: Bounds): Bounds {
  return {
    west: Math.max(bounds.west, clip.west),
    east: Math.min(bounds.east, clip.east),
    south: Math.max(bounds.south, clip.south),
    north: Math.min(bounds.north, clip.north),
  };
}

function getTreeType(seed: number, lng: number, lat: number): TreeType {
  const typeRoll = unitFromStableHash(seed, Math.round(lng * 1e5), Math.round(lat * 1e5), "type");
  if (typeRoll < 0.2) return "tall";
  if (typeRoll < 0.72) return "compact";
  return "ornamental";
}

export function buildViewportVegetation(params: {
  features: GreenFeature[];
  viewportBounds: Bounds;
  mapZoom: number;
  detailPreset: "balanced" | "high";
}): FeatureCollection {
  const { features, viewportBounds, mapZoom, detailPreset } = params;
  const maxTrees =
    mapZoom >= 17
      ? detailPreset === "high"
        ? 280
        : 210
      : mapZoom >= 15
        ? detailPreset === "high"
          ? 170
          : 120
        : 72;

  const spacing = getSpacingDeg(mapZoom);

  const points: FeatureCollection["features"] = [];
  const usedCells = new Set<string>();

  for (const feature of features) {
    if (points.length >= maxTrees) break;

    const polygons = geometryToPolygons(feature.geometry);
    const featureSeed = getStableSeed(
      `${feature.id ?? "none"}|${feature.properties?.name ?? "park"}|${feature.properties?.class ?? "green"}`,
    );

    for (const rings of polygons) {
      if (points.length >= maxTrees) break;
      const outerRing = rings[0];
      if (!outerRing?.length) continue;

      const polygonBounds = ringBounds(outerRing);
      if (!polygonBounds || !intersects(polygonBounds, viewportBounds)) continue;

      const clipped = clampBounds(polygonBounds, viewportBounds);
      if (clipped.east <= clipped.west || clipped.north <= clipped.south) continue;

      const minX = Math.floor(clipped.west / spacing.lng);
      const maxX = Math.ceil(clipped.east / spacing.lng);
      const minY = Math.floor(clipped.south / spacing.lat);
      const maxY = Math.ceil(clipped.north / spacing.lat);

      for (let cellX = minX; cellX <= maxX; cellX += 1) {
        for (let cellY = minY; cellY <= maxY; cellY += 1) {
          if (points.length >= maxTrees) break;
          const cellKey = `${cellX}:${cellY}`;
          if (usedCells.has(cellKey)) continue;

          const [lng, lat] = createSeededPoint(
            cellX,
            cellY,
            spacing.lng,
            spacing.lat,
            featureSeed,
          );
          if (
            lng < clipped.west ||
            lng > clipped.east ||
            lat < clipped.south ||
            lat > clipped.north
          ) {
            continue;
          }

          if (!pointInPolygon(lng, lat, rings)) continue;

          usedCells.add(cellKey);
          points.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: {
              treeType: getTreeType(featureSeed, lng, lat),
            },
          });
        }
      }
    }
  }

  return {
    type: "FeatureCollection",
    features: points,
  };
}
