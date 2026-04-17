import {
  getRoadClassLaneOffsetMeters,
  type AmbientRoadClass,
} from "@/features/map/lib/traffic/get-road-class-lane-offset";

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
  const vehicleWidth = roadWidth * 0.2;
  const vehicleLength = vehicleWidth * 2.75;
  let laneOffset = getRoadClassLaneOffsetMeters(roadClass, zoom);

  const maxLaneCenterOffset = Math.max(
    roadWidth * 0.12,
    (roadWidth - vehicleWidth) / 2,
  );
  laneOffset = Math.min(laneOffset, maxLaneCenterOffset);

  const laneJitter = Math.max(
    0,
    Math.min(roadWidth * 0.025, maxLaneCenterOffset - laneOffset),
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
