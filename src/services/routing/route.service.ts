import type { PlaceItem } from "@/data/places";
import type { RouteAlternative } from "@/features/map/types/route.types";

type OsrmRouteResponse = {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
    geometry: GeoJSON.LineString;
  }>;
};

export async function getDrivingRoutes(
  from: PlaceItem,
  to: PlaceItem,
): Promise<RouteAlternative[]> {
  const url = new URL(
    `https://router.project-osrm.org/route/v1/driving/${from.center[0]},${from.center[1]};${to.center[0]},${to.center[1]}`,
  );
  url.searchParams.set("alternatives", "true");
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "false");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Không lấy được dữ liệu chỉ đường.");
  }

  const payload = (await response.json()) as OsrmRouteResponse;
  if (payload.code !== "Ok") {
    throw new Error("API chỉ đường trả dữ liệu không hợp lệ.");
  }

  return payload.routes.slice(0, 3).map((route, index) => ({
    id: `route-${index + 1}`,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry,
  }));
}
