export type AmbientRoadClass = "major" | "medium" | "local";

function interpolateLinear(
  zoom: number,
  z0: number,
  v0: number,
  z1: number,
  v1: number,
) {
  if (zoom <= z0) return v0;
  if (zoom >= z1) return v1;
  const t = (zoom - z0) / (z1 - z0);
  return v0 + (v1 - v0) * t;
}

function getRoadWidthMeters(roadClass: AmbientRoadClass, zoom: number) {
  if (roadClass === "major") return interpolateLinear(zoom, 12, 7.8, 20, 22.5);
  if (roadClass === "medium") return interpolateLinear(zoom, 12, 5.8, 20, 16.5);
  return interpolateLinear(zoom, 12, 4.6, 20, 12.4);
}

export function getRoadClassLaneOffsetMeters(
  roadClass: AmbientRoadClass,
  zoom: number,
) {
  const roadWidth = getRoadWidthMeters(roadClass, zoom);
  let laneOffset = Math.min(roadWidth * 0.25, roadWidth * 0.35);
  laneOffset = Math.max(laneOffset, roadWidth * 0.15);
  const vehicleWidth = roadWidth * 0.2;

  if (laneOffset * 2 + vehicleWidth * 2 > roadWidth) {
    laneOffset *= 0.8;
  }

  return laneOffset;
}
