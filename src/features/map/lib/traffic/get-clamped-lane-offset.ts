import type { AmbientRoadClass } from "@/features/map/lib/traffic/get-road-class-lane-offset";
import { getRoadTrafficEnvelope } from "@/features/map/lib/traffic/get-road-traffic-envelope";

export function getClampedLaneOffsetMeters(
  roadClass: AmbientRoadClass,
  zoom: number,
) {
  return getRoadTrafficEnvelope(roadClass, zoom).laneOffset;
}
