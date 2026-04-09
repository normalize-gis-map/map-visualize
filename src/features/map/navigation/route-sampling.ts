import type { Position } from "geojson";

export type RouteSample = {
  lng: number;
  lat: number;
  bearing: number;
};

export function sampleRouteAtProgress(
  coordinates: Position[],
  progress: number,
): RouteSample | null {
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const clamped = Math.max(0, Math.min(progress, 1));
  const scaled = clamped * (coordinates.length - 1);
  const index = Math.min(coordinates.length - 2, Math.floor(scaled));
  const nextIndex = Math.min(coordinates.length - 1, index + 1);
  const t = scaled - index;

  const pointA = coordinates[index];
  const pointB = coordinates[nextIndex];
  if (!pointA || !pointB) return null;

  const lng = pointA[0] + (pointB[0] - pointA[0]) * t;
  const lat = pointA[1] + (pointB[1] - pointA[1]) * t;
  const bearing = (Math.atan2(pointB[0] - pointA[0], pointB[1] - pointA[1]) * 180) / Math.PI;

  return { lng, lat, bearing };
}

export function buildTrafficProgress(baseProgress: number, count = 7) {
  const offsets = [0.05, 0.12, 0.21, 0.33, 0.46, 0.57, 0.68].slice(0, count);
  return offsets.map((offset, index) => ({
    id: `traffic-${index}`,
    progress: (baseProgress + offset) % 1,
  }));
}
