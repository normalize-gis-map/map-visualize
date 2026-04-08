export type TransportMode = "car" | "bike" | "walk";

export type RouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver: {
    type: string;
    modifier?: string;
    bearingBefore?: number;
    bearingAfter?: number;
    location: [number, number];
  };
};

export type RouteAlternative = {
  id: string;
  mode: TransportMode;
  distanceMeters: number;
  durationSeconds: number;
  geometry: GeoJSON.LineString;
  steps: RouteStep[];
};
