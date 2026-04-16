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

function ringCentroid(ring: Position[]): Position | null {
  if (ring.length < 3) return null;
  let x = 0;
  let y = 0;
  let area2 = 0;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    const cross = a[0] * b[1] - b[0] * a[1];
    area2 += cross;
    x += (a[0] + b[0]) * cross;
    y += (a[1] + b[1]) * cross;
  }

  if (Math.abs(area2) < 1e-12) return null;
  return [x / (3 * area2), y / (3 * area2)];
}

export function pointInRing(point: Position, ring: Position[]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const intersects =
      (a[1] > py) !== (b[1] > py) &&
      px < ((b[0] - a[0]) * (py - a[1])) / ((b[1] - a[1]) || 1e-12) + a[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointToSegmentDistance(point: Position, a: Position, b: Position): number {
  const ax = a[0];
  const ay = a[1];
  const bx = b[0];
  const by = b[1];
  const px = point[0];
  const py = point[1];
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 1e-12) {
    return Math.hypot(px - ax, py - ay);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function minDistanceToRingEdge(point: Position, ring: Position[]): number {
  if (ring.length < 2) return 0;
  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    minDistance = Math.min(minDistance, pointToSegmentDistance(point, a, b));
  }
  return Number.isFinite(minDistance) ? minDistance : 0;
}

export function safeCenterBiasedPointAtRingFraction(
  ring: Position[],
  fraction: number,
  centerBias = 0.2,
): Position | null {
  const mid = centerlinePointAtRingFraction(ring, fraction);
  const centroid = ringCentroid(ring);
  if (!mid) return centroid;
  if (!centroid) return mid;

  return [
    mid[0] * (1 - centerBias) + centroid[0] * centerBias,
    mid[1] * (1 - centerBias) + centroid[1] * centerBias,
  ];
}

export function headingAtRingFraction(ring: Position[], fraction: number): number | null {
  const center = safeCenterBiasedPointAtRingFraction(ring, fraction);
  if (!center) return null;

  const lookAhead = safeCenterBiasedPointAtRingFraction(ring, fraction + 0.014) ?? center;
  const lookBehind = safeCenterBiasedPointAtRingFraction(ring, fraction - 0.01) ?? center;

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

export function ringPerimeter(ring: Position[]): number {
  if (ring.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const a = ring[i];
    const b = ring[i + 1];
    if (!a || !b) continue;
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

export function jitteredFraction(seed: number, attempt: number, phase: number): number {
  const stable = seededNoise(seed * 1.9 + attempt * 8.31);
  const movement = phase * 0.00028;
  return stable + movement;
}

export function headingJitter(seed: number): number {
  return (seededNoise(seed * 6.7) - 0.5) * 8;
}
