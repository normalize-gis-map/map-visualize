import type { FeatureCollection, LineString } from "geojson";

import type { AmbientTrafficVehicle } from "@/features/map/hooks/use-ambient-traffic";

function metersToLatitudeDegrees(meters: number) {
  return meters / 111320;
}

function metersToLongitudeDegrees(meters: number, latitude: number) {
  const safeCos = Math.max(0.15, Math.cos((latitude * Math.PI) / 180));
  return meters / (111320 * safeCos);
}

export function buildAmbientTrafficSource(
  vehicles: AmbientTrafficVehicle[],
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: vehicles.map((vehicle) => {
      const lengthMeters =
        vehicle.roadClass === "major" ? 6.4 : vehicle.roadClass === "medium" ? 5.4 : 4.6;
      const headingRad = (vehicle.bearing * Math.PI) / 180;
      const half = lengthMeters / 2;
      const dx = Math.sin(headingRad) * half;
      const dy = Math.cos(headingRad) * half;

      const tailLng = vehicle.lng - metersToLongitudeDegrees(dx, vehicle.lat);
      const tailLat = vehicle.lat - metersToLatitudeDegrees(dy);
      const headLng = vehicle.lng + metersToLongitudeDegrees(dx, vehicle.lat);
      const headLat = vehicle.lat + metersToLatitudeDegrees(dy);

      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [tailLng, tailLat],
            [headLng, headLat],
          ],
        },
        properties: {
          id: vehicle.id,
          roadClass: vehicle.roadClass,
        },
      };
    }),
  };
}
