import type { FeatureCollection, Geometry } from "geojson";

type WaterFeature = {
  id?: string | number;
  geometry?: Geometry;
};

function geometryKey(feature: WaterFeature, fallbackIndex: number): string {
  if (feature.id !== undefined && feature.id !== null) {
    return String(feature.id);
  }
  const geometry = feature.geometry;
  if (!geometry) return `no-geometry-${fallbackIndex}`;
  return `${geometry.type}:${JSON.stringify(geometry).slice(0, 240)}`;
}

function normalizeGeometry(geometry?: Geometry): Geometry | null {
  if (!geometry) return null;
  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    return geometry;
  }
  return null;
}

export function buildViewportWaterEffect(features: WaterFeature[]): FeatureCollection {
  const deduped = new Set<string>();
  const waterFeatures: FeatureCollection["features"] = [];

  for (let index = 0; index < features.length; index += 1) {
    const feature = features[index];
    if (!feature) continue;

    const geometry = normalizeGeometry(feature.geometry);
    if (!geometry) continue;

    const key = geometryKey(feature, index);
    if (deduped.has(key)) continue;
    deduped.add(key);

    waterFeatures.push({
      type: "Feature",
      geometry,
      properties: {},
    });
  }

  return {
    type: "FeatureCollection",
    features: waterFeatures,
  };
}
