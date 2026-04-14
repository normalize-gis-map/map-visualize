import type { Position } from "geojson";

export type RouteSample = {
  lng: number;
  lat: number;
  bearing: number;
};

function metersToLatitudeDegrees(meters: number) {
  return meters / 111320;
}

function metersToLongitudeDegrees(meters: number, latitude: number) {
  const safeCos = Math.max(0.15, Math.cos((latitude * Math.PI) / 180));
  return meters / (111320 * safeCos);
}

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
  const bearing =
    (Math.atan2(pointB[0] - pointA[0], pointB[1] - pointA[1]) * 180) / Math.PI;

  return { lng, lat, bearing };
}

export function offsetRouteSample(sample: RouteSample, lateralMeters: number): RouteSample {
  const headingRad = (sample.bearing * Math.PI) / 180;
  const rightX = Math.cos(headingRad);
  const rightY = -Math.sin(headingRad);

  const deltaLng = metersToLongitudeDegrees(rightX * lateralMeters, sample.lat);
  const deltaLat = metersToLatitudeDegrees(rightY * lateralMeters);

  return {
    ...sample,
    lng: sample.lng + deltaLng,
    lat: sample.lat + deltaLat,
  };
}

export function normalizeBearing(bearing: number) {
  return ((bearing % 360) + 360) % 360;
}

export function buildTrafficProgress(baseProgress: number, count = 8) {
  const safeCount = Math.max(1, Math.floor(count));
  return Array.from({ length: safeCount }, (_, index) => {
    const spacing = 0.86 / safeCount;
    const offset = 0.05 + spacing * index + Math.sin(index * 1.7) * 0.0045;
    return {
      id: `traffic-${index}`,
      progress: (baseProgress + offset) % 1,
    };
  });
}
