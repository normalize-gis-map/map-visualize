import type { AmbientRoadClass } from "@/features/map/lib/get-road-class-lane-offset";
import { getRoadTrafficEnvelope } from "@/features/map/lib/get-road-traffic-envelope";

export function getClampedLaneOffsetMeters(
  roadClass: AmbientRoadClass,
  zoom: number,
) {
  return getRoadTrafficEnvelope(roadClass, zoom).laneOffset;
}
