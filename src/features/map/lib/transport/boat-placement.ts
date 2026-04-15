import type { Geometry, Position } from "geojson";

type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type BoatPlacement = {
  center: Position;
  headingDeg: number;
  scaleDeg: number;
  ringArea: number;
};

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function polygonRings(geometry?: Geometry): Position[][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates[0] ?? []];
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) => polygon[0] ?? []);
  }
  return [];
}

export function ringArea(ring: Position[]): number {
  if (ring.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area / 2);
}

export function pointAtRingFraction(ring: Position[], fraction: number): Position | null {
  if (ring.length < 3) return null;

  const clamped = fraction - Math.floor(fraction);
  const segment = Math.floor(clamped * (ring.length - 1));
  const start = ring[segment];
  const end = ring[segment + 1] ?? ring[0];
  if (!start || !end) return null;

  const t = clamped * (ring.length - 1) - segment;
  return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
}

export function centerlinePointAtRingFraction(ring: Position[], fraction: number): Position | null {
  const edgeA = pointAtRingFraction(ring, fraction);
  const edgeB = pointAtRingFraction(ring, fraction + 0.5);
  if (!edgeA || !edgeB) return edgeA ?? edgeB;

  return [(edgeA[0] + edgeB[0]) * 0.5, (edgeA[1] + edgeB[1]) * 0.5];
}

export function headingAtRingFraction(ring: Position[], fraction: number): number | null {
  const center = centerlinePointAtRingFraction(ring, fraction);
  if (!center) return null;

  const lookAhead = centerlinePointAtRingFraction(ring, fraction + 0.014) ?? center;
  const lookBehind = centerlinePointAtRingFraction(ring, fraction - 0.01) ?? center;

  const deltaLng = lookAhead[0] - lookBehind[0];
  const deltaLat = lookAhead[1] - lookBehind[1];
  if (Math.abs(deltaLng) < 0.0000001 && Math.abs(deltaLat) < 0.0000001) return null;

  return (Math.atan2(deltaLat, deltaLng) * 180) / Math.PI;
}

export function inBounds(point: Position, bounds: Bounds | null): boolean {
  if (!bounds) return true;
  const [lng, lat] = point;
  return lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north;
}

export function isFarEnough(point: Position, accepted: Position[], minDistanceDeg: number): boolean {
  for (const placed of accepted) {
    const dx = point[0] - placed[0];
    const dy = point[1] - placed[1];
    if (dx * dx + dy * dy < minDistanceDeg * minDistanceDeg) {
      return false;
    }
  }
  return true;
}

export function boatScaleForZoom(zoom: number, ringAreaValue: number): number {
  const zoomFactor = zoom >= 16 ? 1.12 : zoom >= 14 ? 1 : 0.9;
  const areaFactor = Math.min(1.22, 0.9 + ringAreaValue / 0.00022);
  return 0.000022 * zoomFactor * areaFactor;
}

export function jitteredFraction(seed: number, attempt: number, phase: number): number {
  const stable = seededNoise(seed * 1.9 + attempt * 8.31);
  const movement = phase * 0.00028;
  return stable + movement;
}

export function headingJitter(seed: number): number {
  return (seededNoise(seed * 6.7) - 0.5) * 8;
}
