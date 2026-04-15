import type { Position } from "geojson";

import type { WaterFeature } from "@/features/map/lib/water/water-types";

const FLOW_MIN_AXIS_RATIO = 1.4;

function hashNumber(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededDirection(seed: number): [number, number] {
  const angle = ((seed % 3600) / 3600) * Math.PI * 2;
  const x = Math.cos(angle);
  const y = Math.sin(angle);
  return [x, y];
}

function ringVertices(feature: WaterFeature): Position[] {
  const geometry = feature.geometry;
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ?? [];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((polygon) => polygon[0] ?? []);
  }

  return [];
}

function principalAxis(vertices: Position[]): { dir: [number, number]; axisRatio: number } | null {
  if (vertices.length < 3) return null;

  let meanX = 0;
  let meanY = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    meanX += vertices[i]?.[0] ?? 0;
    meanY += vertices[i]?.[1] ?? 0;
  }
  meanX /= vertices.length;
  meanY /= vertices.length;

  let cxx = 0;
  let cxy = 0;
  let cyy = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    const dx = (vertices[i]?.[0] ?? 0) - meanX;
    const dy = (vertices[i]?.[1] ?? 0) - meanY;
    cxx += dx * dx;
    cxy += dx * dy;
    cyy += dy * dy;
  }

  const trace = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const spread = Math.max(0, trace * trace - 4 * det);
  const lambda1 = (trace + Math.sqrt(spread)) / 2;
  const lambda2 = (trace - Math.sqrt(spread)) / 2;
  if (lambda1 <= 0) return null;

  let vx = cxy;
  let vy = lambda1 - cxx;
  if (Math.abs(vx) + Math.abs(vy) < 1e-12) {
    vx = 1;
    vy = 0;
  }
  const length = Math.hypot(vx, vy);
  if (length < 1e-12) return null;

  return {
    dir: [vx / length, vy / length],
    axisRatio: lambda2 > 0 ? lambda1 / lambda2 : 999,
  };
}

export function deriveWaterFlowDirection(
  features: WaterFeature[],
  previous: [number, number] | null,
): [number, number] {
  let sumX = 0;
  let sumY = 0;
  let weight = 0;

  for (let i = 0; i < features.length; i += 1) {
    const vertices = ringVertices(features[i]!);
    const axis = principalAxis(vertices);
    if (!axis || axis.axisRatio < FLOW_MIN_AXIS_RATIO) continue;

    const axisWeight = Math.min(4, axis.axisRatio);
    sumX += axis.dir[0] * axisWeight;
    sumY += axis.dir[1] * axisWeight;
    weight += axisWeight;
  }

  let direction: [number, number] | null = null;
  if (weight > 0) {
    const length = Math.hypot(sumX, sumY);
    if (length > 1e-6) {
      direction = [sumX / length, sumY / length];
    }
  }

  if (!direction) {
    const seedSource = JSON.stringify(features[0]?.geometry ?? "water-default").slice(0, 220);
    direction = seededDirection(hashNumber(seedSource));
  }

  if (previous) {
    const dot = direction[0] * previous[0] + direction[1] * previous[1];
    if (dot < 0) {
      direction = [-direction[0], -direction[1]];
    }
  }

  return direction;
}
