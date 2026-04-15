import type { AmbientRoadClass } from "@/features/map/lib/traffic/get-road-class-lane-offset";

function interpolate(zoom: number, z0: number, v0: number, z1: number, v1: number) {
  if (zoom <= z0) return v0;
  if (zoom >= z1) return v1;
  const t = (zoom - z0) / (z1 - z0);
  return v0 + (v1 - v0) * t;
}

function getRoadWidthMeters(roadClass: AmbientRoadClass, zoom: number) {
  if (roadClass === "major") return interpolate(zoom, 12, 7.8, 20, 22.5);
  if (roadClass === "medium") return interpolate(zoom, 12, 5.8, 20, 16.5);
  return interpolate(zoom, 12, 4.6, 20, 12.4);
}

export function getRoadTrafficEnvelope(roadClass: AmbientRoadClass, zoom: number) {
  const roadWidth = getRoadWidthMeters(roadClass, zoom);
  const vehicleWidthFactor =
    roadClass === "major" ? 0.19 : roadClass === "medium" ? 0.21 : 0.23;
  const vehicleWidth = roadWidth * vehicleWidthFactor;
  const vehicleLength = vehicleWidth * 2.75;
  const shoulder = roadWidth * 0.06;
  const maxLaneCenterOffset = Math.max(
    roadWidth * 0.14,
    (roadWidth - vehicleWidth) / 2 - shoulder,
  );
  const laneTargetFactor =
    roadClass === "major" ? 0.28 : roadClass === "medium" ? 0.25 : 0.22;
  const laneOffset = Math.min(maxLaneCenterOffset, roadWidth * laneTargetFactor);
  const laneJitter = Math.max(
    0,
    Math.min(roadWidth * 0.03, maxLaneCenterOffset - laneOffset),
  );

  return {
    roadWidth,
    laneOffset,
    maxLaneCenterOffset,
    laneJitter,
    vehicleWidth,
    vehicleLength,
  };
}
