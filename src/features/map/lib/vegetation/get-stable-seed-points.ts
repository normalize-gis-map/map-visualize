import type { Position } from "geojson";

type Ring = Position[];

function hashUint(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unitFromHash(...parts: Array<string | number>): number {
  const hash = hashUint(parts.join("|"));
  return hash / 4294967295;
}

export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const start = ring[i];
    const end = ring[j];
    if (!start || !end) continue;
    const intersects =
      start[1] > lat !== end[1] > lat &&
      lng < ((end[0] - start[0]) * (lat - start[1])) / (end[1] - start[1]) + start[0];
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(lng: number, lat: number, rings: Ring[]): boolean {
  const outer = rings[0];
  if (!outer || !pointInRing(lng, lat, outer)) return false;

  for (let index = 1; index < rings.length; index += 1) {
    const hole = rings[index];
    if (hole && pointInRing(lng, lat, hole)) return false;
  }

  return true;
}

export function createSeededPoint(
  cellX: number,
  cellY: number,
  spacingLng: number,
  spacingLat: number,
  seed: number,
): [number, number] {
  const jitterLng = unitFromHash(cellX, cellY, seed, "lng") - 0.5;
  const jitterLat = unitFromHash(cellX, cellY, seed, "lat") - 0.5;

  return [
    (cellX + 0.5) * spacingLng + jitterLng * spacingLng * 0.7,
    (cellY + 0.5) * spacingLat + jitterLat * spacingLat * 0.7,
  ];
}

export function getStableSeed(value: string): number {
  return hashUint(value);
}

export function unitFromStableHash(...parts: Array<string | number>): number {
  return unitFromHash(...parts);
}
