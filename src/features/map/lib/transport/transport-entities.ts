import type { FeatureCollection, Position } from "geojson";

import type { TransportMode } from "@/features/map/store/map.store";

type RouteLike = {
  coordinates: Position[];
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

function inBounds(point: Position, bounds: Bounds | null) {
  if (!bounds) return true;
  const [lng, lat] = point;
  return lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north;
}

function transportCap(zoom: number, mode: TransportMode) {
  if (mode === "cars" || mode === "boats") return 0;
  if (zoom < 13) return 0;
  if (zoom < 15) return 2;
  if (zoom < 17) return 4;
  return 6;
}

export function buildTransportEntities({
  phase,
  zoom,
  routes,
  bounds,
  transportVisibility,
}: BuildTransportEntitiesParams): FeatureCollection {
  const features: FeatureCollection["features"] = [];

  const activeModes = (Object.entries(transportVisibility) as Array<[
    TransportMode,
    boolean,
  ]>).filter(([, active]) => active && !Number.isNaN(phase));

  for (const [mode] of activeModes) {
    if (mode === "cars") continue;

    const cap = transportCap(zoom, mode);
    if (!cap) continue;

    const routePool = routes;

    for (let index = 0; index < Math.min(cap, routePool.length); index += 1) {
      const route = routePool[index];
      if (!route?.coordinates?.length) continue;

      const speedFactor = mode === "bike" ? 0.0042 : 0.0028;
      const offset = (index * 0.137 + phase * speedFactor) % 1;
      const point = pointAtFraction(route.coordinates, offset);
      if (!point || !inBounds(point, bounds)) continue;

      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: point,
        },
        properties: {
          mode,
          heading: ((offset * 360 + index * 23) % 360) - 180,
        },
      });
    }
  }

  return {
    type: "FeatureCollection",
    features,
  };
}
