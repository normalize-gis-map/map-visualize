import type { Geometry, Position } from "geojson";
import maplibregl from "maplibre-gl";

import type { WaterFeature, WaterGeometryBuffers } from "@/features/map/lib/water/water-types";

function toMercator(point: Position): [number, number] {
  const coord = maplibregl.MercatorCoordinate.fromLngLat({ lng: point[0], lat: point[1] });
  return [coord.x, coord.y];
}

function triangulateRing(ring: Position[]): number[] {
  if (ring.length < 4) return [];

  const vertices: number[] = [];
  const anchor = ring[0];
  if (!anchor) return vertices;
  const [ax, ay] = toMercator(anchor);

  for (let i = 1; i < ring.length - 2; i += 1) {
    const b = ring[i];
    const c = ring[i + 1];
    if (!b || !c) continue;
    const [bx, by] = toMercator(b);
    const [cx, cy] = toMercator(c);

    vertices.push(ax, ay, bx, by, cx, cy);
  }

  return vertices;
}

function collectGeometryTriangles(geometry: Geometry): number[] {
  if (geometry.type === "Polygon") {
    return triangulateRing(geometry.coordinates[0] ?? []);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((polygon) => triangulateRing(polygon[0] ?? []));
  }

  return [];
}

export function buildWaterGeometry(features: WaterFeature[]): WaterGeometryBuffers {
  const vertices = features
    .slice(0, 120)
    .flatMap((feature) => (feature.geometry ? collectGeometryTriangles(feature.geometry) : []));

  const buffer = new Float32Array(vertices);
  return {
    vertices: buffer,
    vertexCount: Math.floor(buffer.length / 2),
  };
}
