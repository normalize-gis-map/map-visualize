import type { FeatureCollection, GeoJsonProperties, Geometry, Position } from "geojson";

import {
  classifyGreenArea,
  type GreenAreaRenderMode,
} from "@/features/map/lib/classify-green-area";
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

function getSpacingDeg(
  zoom: number,
  mode: GreenAreaRenderMode,
): { lng: number; lat: number } {
  const baseSpacing = zoom >= 17 ? 0.00038 : zoom >= 15 ? 0.0005 : 0.00072;
  const adjusted = mode === "tree_rich" ? baseSpacing * 0.92 : baseSpacing * 1.85;
  return { lng: adjusted, lat: adjusted * 0.9 };
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
  if (typeRoll < 0.22) return "tall";
  if (typeRoll < 0.75) return "compact";
  return "ornamental";
}

function minDistanceToRing(lng: number, lat: number, ring: Position[]): number {
  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = ring[index];
    const end = ring[index + 1];
    if (!start || !end) continue;

    const vx = end[0] - start[0];
    const vy = end[1] - start[1];
    const wx = lng - start[0];
    const wy = lat - start[1];
    const c1 = wx * vx + wy * vy;
    const c2 = vx * vx + vy * vy;
    const t = c2 <= 0 ? 0 : Math.max(0, Math.min(1, c1 / c2));
    const projLng = start[0] + t * vx;
    const projLat = start[1] + t * vy;
    const distance = Math.hypot(lng - projLng, lat - projLat);
    minDistance = Math.min(minDistance, distance);
  }
  return minDistance;
}

function getTreeBudget(
  zoom: number,
  detailPreset: "balanced" | "high",
  mode: GreenAreaRenderMode,
): number {
  const base =
    zoom >= 17
      ? detailPreset === "high"
        ? 260
        : 190
      : zoom >= 15
        ? detailPreset === "high"
          ? 150
          : 110
        : 65;

  return mode === "tree_rich" ? base : Math.max(16, Math.floor(base * 0.28));
}

function getGlobalTreeBudget(
  zoom: number,
  detailPreset: "balanced" | "high",
): number {
  if (zoom >= 17) return detailPreset === "high" ? 320 : 240;
  if (zoom >= 15) return detailPreset === "high" ? 200 : 150;
  return 90;
}

function buildClusterCenters(
  seed: number,
  clipped: Bounds,
  rings: Position[][],
  mode: GreenAreaRenderMode,
): Array<[number, number]> {
  if (mode !== "tree_rich") return [];
  const centerCount = 2 + Math.floor(unitFromStableHash(seed, "cluster-count") * 3);
  const centers: Array<[number, number]> = [];

  for (let index = 0; index < centerCount; index += 1) {
    const lng =
      clipped.west +
      unitFromStableHash(seed, "cluster", index, "lng") * (clipped.east - clipped.west);
    const lat =
      clipped.south +
      unitFromStableHash(seed, "cluster", index, "lat") * (clipped.north - clipped.south);
    if (pointInPolygon(lng, lat, rings)) {
      centers.push([lng, lat]);
    }
  }

  return centers;
}

function acceptCandidate(params: {
  mode: GreenAreaRenderMode;
  seed: number;
  cellX: number;
  cellY: number;
  lng: number;
  lat: number;
  spacingLng: number;
  ring: Position[];
  clusterCenters: Array<[number, number]>;
}): boolean {
  const {
    mode,
    seed,
    cellX,
    cellY,
    lng,
    lat,
    spacingLng,
    ring,
    clusterCenters,
  } = params;

  const roll = unitFromStableHash(seed, cellX, cellY, "accept");
  if (mode === "grass_first") {
    const edgeDistance = minDistanceToRing(lng, lat, ring);
    const edgeThreshold = spacingLng * 0.95;
    const nearEdge = edgeDistance < edgeThreshold;
    return nearEdge ? roll < 0.44 : roll < 0.08;
  }

  if (!clusterCenters.length) {
    return roll < 0.52;
  }

  let nearestCenter = Number.POSITIVE_INFINITY;
  for (const center of clusterCenters) {
    nearestCenter = Math.min(nearestCenter, Math.hypot(lng - center[0], lat - center[1]));
  }
  const denseRadius = spacingLng * 2.3;
  const softRadius = spacingLng * 4.6;

  if (nearestCenter < denseRadius) return roll < 0.94;
  if (nearestCenter < softRadius) return roll < 0.58;
  return roll < 0.2;
}

export function buildViewportVegetation(params: {
  features: GreenFeature[];
  viewportBounds: Bounds;
  mapZoom: number;
  detailPreset: "balanced" | "high";
}): FeatureCollection {
  const { features, viewportBounds, mapZoom, detailPreset } = params;
  const points: FeatureCollection["features"] = [];
  const usedCells = new Set<string>();
  const globalBudget = getGlobalTreeBudget(mapZoom, detailPreset);

  for (const feature of features) {
    if (points.length >= globalBudget) break;
    const polygons = geometryToPolygons(feature.geometry);
    const featureSeed = getStableSeed(
      `${feature.id ?? "none"}|${feature.properties?.name ?? "green"}|${feature.properties?.class ?? "land"}`,
    );

    for (const rings of polygons) {
      if (points.length >= globalBudget) break;
      const outerRing = rings[0];
      if (!outerRing?.length) continue;
      const mode = classifyGreenArea({
        properties: feature.properties,
        outerRing,
      });
      const perPolygonBudget = getTreeBudget(mapZoom, detailPreset, mode);
      let polygonTreeCount = 0;

      const polygonBounds = ringBounds(outerRing);
      if (!polygonBounds || !intersects(polygonBounds, viewportBounds)) continue;
      const clipped = clampBounds(polygonBounds, viewportBounds);
      if (clipped.east <= clipped.west || clipped.north <= clipped.south) continue;

      const spacing = getSpacingDeg(mapZoom, mode);
      const clusterCenters = buildClusterCenters(featureSeed, clipped, rings, mode);
      const minX = Math.floor(clipped.west / spacing.lng);
      const maxX = Math.ceil(clipped.east / spacing.lng);
      const minY = Math.floor(clipped.south / spacing.lat);
      const maxY = Math.ceil(clipped.north / spacing.lat);

      for (let cellX = minX; cellX <= maxX; cellX += 1) {
        for (let cellY = minY; cellY <= maxY; cellY += 1) {
          if (points.length >= globalBudget || polygonTreeCount >= perPolygonBudget)
            break;
          const cellKey = `${mode}:${cellX}:${cellY}`;
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
          if (
            !acceptCandidate({
              mode,
              seed: featureSeed,
              cellX,
              cellY,
              lng,
              lat,
              spacingLng: spacing.lng,
              ring: outerRing,
              clusterCenters,
            })
          ) {
            continue;
          }

          usedCells.add(cellKey);
          points.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: {
              treeType: getTreeType(featureSeed, lng, lat),
              greenMode: mode,
            },
          });
          polygonTreeCount += 1;
        }
      }
    }
  }

  return {
    type: "FeatureCollection",
    features: points,
  };
}
