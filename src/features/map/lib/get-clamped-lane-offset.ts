import type { AmbientRoadClass } from "@/features/map/lib/get-road-class-lane-offset";

function getRoadVisualWidth(roadClass: AmbientRoadClass, zoom: number) {
  if (roadClass === "major") {
    if (zoom <= 12) return 2;
    if (zoom >= 20) return 22;
    return 2 + ((zoom - 12) / 8) * 20;
  }

  if (roadClass === "medium") {
    if (zoom <= 12) return 1.5;
    if (zoom >= 20) return 16;
    return 1.5 + ((zoom - 12) / 8) * 14.5;
  }

  if (zoom <= 12) return 1.4;
  if (zoom >= 20) return 14;
  return 1.4 + ((zoom - 12) / 8) * 12.6;
}

export function getClampedLaneOffsetMeters(
  roadClass: AmbientRoadClass,
  zoom: number,
) {
  const roadWidth = getRoadVisualWidth(roadClass, zoom);
  const factor = roadClass === "major" ? 0.3 : roadClass === "medium" ? 0.27 : 0.24;
  const maxByClass = roadClass === "major" ? 4.2 : roadClass === "medium" ? 3.2 : 2.3;
  const clamped = Math.min(maxByClass, roadWidth * factor);
  return Math.max(0.8, clamped);
}
