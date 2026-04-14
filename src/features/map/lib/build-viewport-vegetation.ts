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
type TreeArchetype = "pine" | "broadleaf" | "ornamental" | "waterside";

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
  const baseSpacing =
    zoom >= 17 ? 0.00036 : zoom >= 16 ? 0.00046 : zoom >= 15 ? 0.00058 : 0.00078;
  const adjusted =
    mode === "grass_first"
      ? baseSpacing * 2.1
      : mode === "dense_wooded"
        ? baseSpacing * 0.76
        : baseSpacing * 0.96;
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
  if (typeRoll < 0.2) return "tall";
  if (typeRoll < 0.77) return "compact";
  return "ornamental";
}

function getTreeArchetype(
  seed: number,
  lng: number,
  lat: number,
  mode: GreenAreaRenderMode,
): TreeArchetype {
  if (mode === "dense_wooded") {
    return unitFromStableHash(seed, lng, lat, "archetype") < 0.45
      ? "pine"
      : "broadleaf";
  }

  const roll = unitFromStableHash(seed, Math.round(lng * 1e4), Math.round(lat * 1e4), "archetype");
  if (roll < 0.2) return "ornamental";
  if (roll < 0.5) return "pine";
  if (roll < 0.8) return "broadleaf";
  return "waterside";
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
  if (zoom < 16) {
    const midBase = detailPreset === "high" ? 44 : 32;
    if (mode === "dense_wooded") return Math.floor(midBase * 1.12);
    if (mode === "park_trees") return midBase;
    return 0;
  }

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

  if (mode === "grass_first") return Math.max(12, Math.floor(base * 0.2));
  if (mode === "dense_wooded") return Math.floor(base * 1.2);
  return base;
}

function getGlobalTreeBudget(
  zoom: number,
  detailPreset: "balanced" | "high",
): number {
  if (zoom < 16) return detailPreset === "high" ? 56 : 40;
  if (zoom >= 17) return detailPreset === "high" ? 320 : 240;
  if (zoom >= 15) return detailPreset === "high" ? 200 : 150;
  return 90;
}

function readSemanticText(properties?: GeoJsonProperties): string {
  if (!properties) return "";
  return [properties.name, properties.class, properties.type, properties.leisure]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function isStrongTreeAreaSignal(properties?: GeoJsonProperties): boolean {
  const text = readSemanticText(properties);
  return /(park|garden|botanical|arboretum|wood|forest|reserve|waterfront)/i.test(
    text,
  );
}

function buildClusterCenters(
  seed: number,
  clipped: Bounds,
  rings: Position[][],
  mode: GreenAreaRenderMode,
): Array<[number, number]> {
  if (mode === "grass_first") return [];
  const centerCount =
    mode === "dense_wooded"
      ? 3 + Math.floor(unitFromStableHash(seed, "cluster-count") * 3)
      : 2 + Math.floor(unitFromStableHash(seed, "cluster-count") * 2);
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

function buildClearingCenters(
  seed: number,
  clipped: Bounds,
  rings: Position[][],
  mode: GreenAreaRenderMode,
): Array<[number, number]> {
  if (mode === "grass_first") return [];

  const centerCount =
    mode === "dense_wooded"
      ? 1 + Math.floor(unitFromStableHash(seed, "clearing-count") * 2)
      : 1 + Math.floor(unitFromStableHash(seed, "clearing-count") * 3);
  const centers: Array<[number, number]> = [];
  for (let index = 0; index < centerCount; index += 1) {
    const lng =
      clipped.west +
      unitFromStableHash(seed, "clearing", index, "lng") * (clipped.east - clipped.west);
    const lat =
      clipped.south +
      unitFromStableHash(seed, "clearing", index, "lat") * (clipped.north - clipped.south);
    if (pointInPolygon(lng, lat, rings)) centers.push([lng, lat]);
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
  clearingCenters: Array<[number, number]>;
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
    clearingCenters,
  } = params;

  const roll = unitFromStableHash(seed, cellX, cellY, "accept");
  if (mode === "grass_first") {
    const edgeDistance = minDistanceToRing(lng, lat, ring);
    const edgeThreshold = spacingLng * 0.95;
    const nearEdge = edgeDistance < edgeThreshold;
    return nearEdge ? roll < 0.44 : roll < 0.08;
  }

  if (clearingCenters.length) {
    const clearingRadius = mode === "dense_wooded" ? spacingLng * 2.2 : spacingLng * 2.8;
    for (const center of clearingCenters) {
      const dist = Math.hypot(lng - center[0], lat - center[1]);
      if (dist < clearingRadius) return false;
    }
  }

  if (!clusterCenters.length) {
    return mode === "dense_wooded" ? roll < 0.76 : roll < 0.56;
  }

  let nearestCenter = Number.POSITIVE_INFINITY;
  for (const center of clusterCenters) {
    nearestCenter = Math.min(nearestCenter, Math.hypot(lng - center[0], lat - center[1]));
  }
  const denseRadius = mode === "dense_wooded" ? spacingLng * 3.4 : spacingLng * 2.4;
  const softRadius = mode === "dense_wooded" ? spacingLng * 6.2 : spacingLng * 4.8;

  if (nearestCenter < denseRadius) return mode === "dense_wooded" ? roll < 0.97 : roll < 0.88;
  if (nearestCenter < softRadius) return mode === "dense_wooded" ? roll < 0.78 : roll < 0.56;
  return mode === "dense_wooded" ? roll < 0.32 : roll < 0.17;
}

export function buildViewportVegetation(params: {
  features: GreenFeature[];
  viewportBounds: Bounds;
  mapZoom: number;
  detailPreset: "balanced" | "high";
}): FeatureCollection {
  const { features, viewportBounds, mapZoom, detailPreset } = params;
  if (mapZoom < 13) {
    return { type: "FeatureCollection", features: [] };
  }
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
      if (mapZoom < 16 && mode === "grass_first") continue;
      if (mapZoom < 16 && mode === "park_trees") {
        const semanticBoost = isStrongTreeAreaSignal(feature.properties);
        if (!semanticBoost && unitFromStableHash(featureSeed, "midzoom-filter") < 0.55)
          continue;
      }
      const perPolygonBudget = getTreeBudget(mapZoom, detailPreset, mode);
      if (perPolygonBudget <= 0) continue;
      let polygonTreeCount = 0;

      const polygonBounds = ringBounds(outerRing);
      if (!polygonBounds || !intersects(polygonBounds, viewportBounds)) continue;
      const clipped = clampBounds(polygonBounds, viewportBounds);
      if (clipped.east <= clipped.west || clipped.north <= clipped.south) continue;

      const spacing = getSpacingDeg(mapZoom, mode);
      const clusterCenters = buildClusterCenters(featureSeed, clipped, rings, mode);
      const clearingCenters = buildClearingCenters(featureSeed, clipped, rings, mode);
      const gridOffsetLng =
        (unitFromStableHash(featureSeed, "grid-offset-lng") - 0.5) * spacing.lng * 1.8;
      const gridOffsetLat =
        (unitFromStableHash(featureSeed, "grid-offset-lat") - 0.5) * spacing.lat * 1.8;
      const minX = Math.floor((clipped.west - gridOffsetLng) / spacing.lng);
      const maxX = Math.ceil((clipped.east - gridOffsetLng) / spacing.lng);
      const minY = Math.floor((clipped.south - gridOffsetLat) / spacing.lat);
      const maxY = Math.ceil((clipped.north - gridOffsetLat) / spacing.lat);

      for (let cellX = minX; cellX <= maxX; cellX += 1) {
        for (let cellY = minY; cellY <= maxY; cellY += 1) {
          if (points.length >= globalBudget || polygonTreeCount >= perPolygonBudget)
            break;
          const cellKey = `${mode}:${cellX}:${cellY}`;
          if (usedCells.has(cellKey)) continue;

          const [baseLng, baseLat] = createSeededPoint(
            cellX,
            cellY,
            spacing.lng,
            spacing.lat,
            featureSeed,
          );
          const lng = baseLng + gridOffsetLng;
          const lat = baseLat + gridOffsetLat;
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
              clearingCenters,
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
              treeArchetype: getTreeArchetype(featureSeed, lng, lat, mode),
              greenMode: mode,
              treeScale:
                mode === "grass_first"
                  ? 0.86 + unitFromStableHash(featureSeed, cellX, cellY, "scale") * 0.24
                  : mode === "dense_wooded"
                    ? 0.9 + unitFromStableHash(featureSeed, cellX, cellY, "scale") * 0.5
                    : 0.88 + unitFromStableHash(featureSeed, cellX, cellY, "scale") * 0.4,
              treeTone:
                unitFromStableHash(featureSeed, cellX, cellY, "tone") < 0.33
                  ? "cool"
                  : unitFromStableHash(featureSeed, cellX, cellY, "tone") < 0.66
                    ? "neutral"
                    : "warm",
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
