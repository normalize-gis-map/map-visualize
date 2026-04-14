import type { AmbientRoadClass } from "@/features/map/lib/traffic/get-road-class-lane-offset";

function interpolate(zoom: number, z0: number, v0: number, z1: number, v1: number) {
  if (zoom <= z0) return v0;
  if (zoom >= z1) return v1;
  const t = (zoom - z0) / (z1 - z0);
  return v0 + (v1 - v0) * t;
}

function getRoadWidthMeters(roadClass: AmbientRoadClass, zoom: number) {
  if (roadClass === "major") return interpolate(zoom, 12, 2.2, 20, 26);
  if (roadClass === "medium") return interpolate(zoom, 12, 1.8, 20, 20);
  return interpolate(zoom, 12, 1.5, 20, 17);
}

export function getRoadTrafficEnvelope(roadClass: AmbientRoadClass, zoom: number) {
  const roadWidth = getRoadWidthMeters(roadClass, zoom);
  const laneFactor = roadClass === "major" ? 0.3 : roadClass === "medium" ? 0.27 : 0.24;
  const laneOffset = Math.min(
    roadClass === "major" ? 4.2 : roadClass === "medium" ? 3.2 : 2.3,
    roadWidth * laneFactor,
  );

  const vehicleWidth = Math.min(
    roadClass === "major" ? 2.35 : roadClass === "medium" ? 2.1 : 1.7,
    Math.max(0.65, roadWidth * 0.21),
  );
  const vehicleLength = vehicleWidth * 2.75;

  return {
    roadWidth,
    laneOffset: Math.max(0.8, laneOffset),
    vehicleWidth,
    vehicleLength,
  };
}
