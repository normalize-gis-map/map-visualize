import type { FeatureCollection, Geometry, Position } from "geojson";

type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type WaterFeature = {
  geometry?: Geometry;
};

type BuildBoatEntitiesParams = {
  waterFeatures: WaterFeature[];
  zoom: number;
  phase: number;
  bounds: Bounds | null;
  enabled: boolean;
};

function polygonRings(geometry?: Geometry): Position[][] {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates[0] ?? []];
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) => polygon[0] ?? []);
  }
  return [];
}

function ringArea(ring: Position[]): number {
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

function pointAtRingFraction(ring: Position[], fraction: number): Position | null {
  if (ring.length < 3) return null;
  const segment = Math.floor(fraction * (ring.length - 1));
  const start = ring[segment];
  const end = ring[segment + 1] ?? ring[0];
  if (!start || !end) return null;
  const t = fraction * (ring.length - 1) - segment;
  return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
}

function buildBoatPolygon(center: Position, headingDeg: number, scale: number): Position[] {
  const [lng, lat] = center;
  const rad = (headingDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotate = (x: number, y: number): Position => [lng + x * cos - y * sin, lat + x * sin + y * cos];

  return [
    rotate(scale * 1.9, 0),
    rotate(scale * 0.4, scale * 0.75),
    rotate(-scale * 1.8, scale * 0.65),
    rotate(-scale * 1.95, 0),
    rotate(-scale * 1.8, -scale * 0.65),
    rotate(scale * 0.4, -scale * 0.75),
    rotate(scale * 1.9, 0),
  ];
}

function inBounds(point: Position, bounds: Bounds | null) {
  if (!bounds) return true;
  const [lng, lat] = point;
  return lng >= bounds.west && lng <= bounds.east && lat >= bounds.south && lat <= bounds.north;
}

export function buildBoatEntities({
  waterFeatures,
  zoom,
  phase,
  bounds,
  enabled,
}: BuildBoatEntitiesParams): FeatureCollection {
  if (!enabled || zoom < 13) {
    return { type: "FeatureCollection", features: [] };
  }

  const rings = waterFeatures
    .flatMap((feature) => polygonRings(feature.geometry))
    .filter((ring) => ringArea(ring) > 0.0000008)
    .slice(0, zoom >= 16 ? 12 : 8);

  const maxBoats = zoom >= 17 ? 16 : zoom >= 15 ? 10 : 6;
  const features: FeatureCollection["features"] = [];

  rings.slice(0, maxBoats).forEach((ring, index) => {
    const boatSeed = (index * 0.173 + phase * 0.0026) % 1;
    const center = pointAtRingFraction(ring, boatSeed);
    if (!center || !inBounds(center, bounds)) return;

    const ahead = pointAtRingFraction(ring, (boatSeed + 0.02) % 1) ?? center;
    const headingDeg = (Math.atan2(ahead[1] - center[1], ahead[0] - center[0]) * 180) / Math.PI;
    const scale = 0.00003 + (index % 3) * 0.000004;

    const hull = buildBoatPolygon(center, headingDeg, scale);
    const cabin = buildBoatPolygon(center, headingDeg, scale * 0.45);
    const shadow = hull.map(([lng, lat]) => [lng + 0.000012, lat - 0.000012] as Position);

    features.push(
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [shadow] },
        properties: { part: "shadow" },
      },
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [hull] },
        properties: { part: "hull" },
      },
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [cabin] },
        properties: { part: "cabin" },
      },
    );
  });

  return {
    type: "FeatureCollection",
    features,
  };
}
