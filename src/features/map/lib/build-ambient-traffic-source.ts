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
    features: vehicles.flatMap((vehicle) => {
      const bodyLength =
        vehicle.roadClass === "major" ? 6.4 : vehicle.roadClass === "medium" ? 5.4 : 4.6;
      const roofLength = bodyLength * 0.54;
      const windshieldLength = bodyLength * 0.2;
      const headingRad = (vehicle.bearing * Math.PI) / 180;
      const ux = Math.sin(headingRad);
      const uy = Math.cos(headingRad);
      const toCoordinate = (distance: number): [number, number] => [
        vehicle.lng + metersToLongitudeDegrees(ux * distance, vehicle.lat),
        vehicle.lat + metersToLatitudeDegrees(uy * distance),
      ];

      const bodyTail = toCoordinate(-bodyLength * 0.5);
      const bodyHead = toCoordinate(bodyLength * 0.5);
      const roofTail = toCoordinate(-roofLength * 0.42);
      const roofHead = toCoordinate(roofLength * 0.58);
      const windshieldTail = toCoordinate(bodyLength * 0.2);
      const windshieldHead = toCoordinate(bodyLength * 0.2 + windshieldLength);

      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [bodyTail, bodyHead],
          },
          properties: {
            id: `${vehicle.id}-body`,
            roadClass: vehicle.roadClass,
            part: "body",
          },
        },
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [roofTail, roofHead],
          },
          properties: {
            id: `${vehicle.id}-roof`,
            roadClass: vehicle.roadClass,
            part: "roof",
          },
        },
        {
          type: "Feature" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [windshieldTail, windshieldHead],
          },
          properties: {
            id: `${vehicle.id}-windshield`,
            roadClass: vehicle.roadClass,
            part: "windshield",
          },
        },
      ];
    }),
  };
}
