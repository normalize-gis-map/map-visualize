export type RouteAlternative = {
  id: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: GeoJSON.LineString;
};
