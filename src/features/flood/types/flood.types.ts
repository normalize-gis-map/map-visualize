export type FloodSeverity = "low" | "medium" | "high";

export type FloodFeatureProperties = {
  id: string;
  areaName: string;
  district: string;
  depth: number;
  timestamp: string;
  severity: FloodSeverity;
  riskScore: number;
};

export type FloodGeoJson = GeoJSON.FeatureCollection<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  FloodFeatureProperties
>;
