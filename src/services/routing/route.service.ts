import type { PlaceItem } from "@/data/places";
import type {
  RouteAlternative,
  RouteStep,
  TransportMode,
} from "@/features/map/types/route.types";

type OsrmRouteResponse = {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: GeoJSON.LineString;
    legs: Array<{
      steps: Array<{
        distance: number;
        duration: number;
        maneuver: {
          type: string;
          modifier?: string;
          bearing_before?: number;
          bearing_after?: number;
          location: [number, number];
        };
        name: string;
      }>;
    }>;
  }>;
};

function getOsrmProfile(mode: TransportMode) {
  if (mode === "bike") return "cycling";
  if (mode === "walk") return "walking";
  return "driving";
}

function toInstruction(step: RouteStep) {
  const modifier = step.maneuver.modifier
    ? ` ${step.maneuver.modifier}`
    : "";

  if (step.maneuver.type === "depart") return "Bắt đầu hành trình";
  if (step.maneuver.type === "arrive") return "Bạn đã đến nơi";
  if (step.maneuver.type === "turn") return `Rẽ${modifier}`;
  if (step.maneuver.type === "continue") return "Đi thẳng";
  if (step.maneuver.type === "roundabout") return "Đi vào vòng xoay";
  return "Tiếp tục di chuyển";
}

export async function getRoutes(
  from: PlaceItem,
  to: PlaceItem,
  mode: TransportMode,
): Promise<RouteAlternative[]> {
  const profile = getOsrmProfile(mode);
  const url = new URL(
    `https://router.project-osrm.org/route/v1/${profile}/${from.center[0]},${from.center[1]};${to.center[0]},${to.center[1]}`,
  );
  url.searchParams.set("alternatives", "true");
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "true");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Không lấy được dữ liệu chỉ đường.");
  }

  const payload = (await response.json()) as OsrmRouteResponse;
  if (payload.code !== "Ok") {
    throw new Error("API chỉ đường trả dữ liệu không hợp lệ.");
  }

  return payload.routes.slice(0, 3).map((route, index) => ({
    id: `route-${mode}-${index + 1}`,
    mode,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry,
    steps:
      route.legs
        ?.flatMap((leg) => leg.steps)
        .slice(0, 24)
        .map((step) => {
          const mapped: RouteStep = {
            instruction: "",
            distanceMeters: step.distance,
            durationSeconds: step.duration,
            maneuver: {
              type: step.maneuver.type,
              modifier: step.maneuver.modifier,
              bearingBefore: step.maneuver.bearing_before,
              bearingAfter: step.maneuver.bearing_after,
              location: step.maneuver.location,
            },
          };
          return {
            ...mapped,
            instruction: toInstruction(mapped),
          };
        }) ?? [],
  }));
}
