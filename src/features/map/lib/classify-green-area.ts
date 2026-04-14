import type { GeoJsonProperties, Position } from "geojson";

export type GreenAreaRenderMode = "grass_first" | "park_trees" | "dense_wooded";

type GreenClassificationInput = {
  properties?: GeoJsonProperties;
  outerRing: Position[];
};

const GRASS_FIRST_RE = /(golf|course|lawn|field|fairway|greens?|pitch|meadow|commons?|open\s+space)/i;
const PARK_TREES_RE =
  /(park|garden|botanical|arboretum|riverside|waterfront|plaza|square|urban\s+green|civic)/i;
const DENSE_WOODED_RE =
  /(forest|woodland|wooded|mangrove|nature\s+reserve|national\s+park|rainforest|jungle)/i;

function readSemanticText(properties?: GeoJsonProperties): string {
  if (!properties) return "";
  return [
    properties.name,
    properties.class,
    properties.type,
    properties.leisure,
    properties.landuse,
    properties.natural,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function estimatePolygonAreaSqMeters(ring: Position[]): number {
  if (ring.length < 3) return 0;
  const latRef = ring.reduce((total, point) => total + point[1], 0) / ring.length;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((latRef * Math.PI) / 180);

  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const current = ring[i];
    const previous = ring[j];
    if (!current || !previous) continue;
    const x1 = previous[0] * metersPerDegLng;
    const y1 = previous[1] * metersPerDegLat;
    const x2 = current[0] * metersPerDegLng;
    const y2 = current[1] * metersPerDegLat;
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) * 0.5;
}

function estimateCompactness(ring: Position[]): number {
  if (ring.length < 3) return 0;
  const latRef = ring.reduce((total, point) => total + point[1], 0) / ring.length;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((latRef * Math.PI) / 180);

  let perimeter = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = ring[index];
    const end = ring[index + 1];
    if (!start || !end) continue;
    const dx = (end[0] - start[0]) * metersPerDegLng;
    const dy = (end[1] - start[1]) * metersPerDegLat;
    perimeter += Math.hypot(dx, dy);
  }

  const area = estimatePolygonAreaSqMeters(ring);
  if (area <= 0 || perimeter <= 0) return 0;
  return (4 * Math.PI * area) / (perimeter * perimeter);
}

export function classifyGreenArea({
  properties,
  outerRing,
}: GreenClassificationInput): GreenAreaRenderMode {
  const semanticText = readSemanticText(properties);
  if (DENSE_WOODED_RE.test(semanticText)) return "dense_wooded";
  if (PARK_TREES_RE.test(semanticText)) return "park_trees";
  if (GRASS_FIRST_RE.test(semanticText)) return "grass_first";

  const areaSqMeters = estimatePolygonAreaSqMeters(outerRing);
  const compactness = estimateCompactness(outerRing);

  if (areaSqMeters > 140_000 && compactness < 0.2) {
    return "grass_first";
  }

  if (areaSqMeters < 35_000) {
    return "park_trees";
  }

  return compactness > 0.3 ? "park_trees" : "grass_first";
}
