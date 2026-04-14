import type { FeatureCollection, Polygon } from "geojson";

import type { AmbientTrafficVehicle } from "@/features/map/hooks/use-ambient-traffic";

function metersToLatitudeDegrees(meters: number) {
  return meters / 111320;
}

function metersToLongitudeDegrees(meters: number, latitude: number) {
  const safeCos = Math.max(0.15, Math.cos((latitude * Math.PI) / 180));
  return meters / (111320 * safeCos);
}

function projectLngLat(
  lng: number,
  lat: number,
  eastMeters: number,
  northMeters: number,
): [number, number] {
  return [
    lng + metersToLongitudeDegrees(eastMeters, lat),
    lat + metersToLatitudeDegrees(northMeters),
  ];
}

function orientedBoxPolygon(
  centerLng: number,
  centerLat: number,
  heading: number,
  lengthMeters: number,
  widthMeters: number,
  forwardShiftMeters = 0,
): [number, number][] {
  const headingRad = (heading * Math.PI) / 180;
  const fx = Math.sin(headingRad);
  const fy = Math.cos(headingRad);
  const rx = Math.cos(headingRad);
  const ry = -Math.sin(headingRad);

  const halfLength = lengthMeters / 2;
  const halfWidth = widthMeters / 2;

  const corners: Array<[number, number]> = [
    [halfLength, -halfWidth],
    [halfLength, halfWidth],
    [-halfLength, halfWidth],
    [-halfLength, -halfWidth],
    [halfLength, -halfWidth],
  ];

  return corners.map(([forward, right]) =>
    projectLngLat(
      centerLng,
      centerLat,
      fx * (forward + forwardShiftMeters) + rx * right,
      fy * (forward + forwardShiftMeters) + ry * right,
    ),
  );
}

export function buildAmbientTrafficSource(
  vehicles: AmbientTrafficVehicle[],
): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: vehicles.flatMap((vehicle) => {
      const bodyLength =
        vehicle.roadClass === "major" ? 6.2 : vehicle.roadClass === "medium" ? 5.2 : 4.4;
      const bodyWidth =
        vehicle.roadClass === "major" ? 2.1 : vehicle.roadClass === "medium" ? 1.8 : 1.5;
      const roofLength = bodyLength * 0.52;
      const roofWidth = bodyWidth * 0.72;
      const windshieldLength = bodyLength * 0.2;
      const windshieldWidth = bodyWidth * 0.64;

      const bodyPolygon = orientedBoxPolygon(
        vehicle.lng,
        vehicle.lat,
        vehicle.bearing,
        bodyLength,
        bodyWidth,
      );
      const roofPolygon = orientedBoxPolygon(
        vehicle.lng,
        vehicle.lat,
        vehicle.bearing,
        roofLength,
        roofWidth,
        bodyLength * 0.04,
      );
      const windshieldPolygon = orientedBoxPolygon(
        vehicle.lng,
        vehicle.lat,
        vehicle.bearing,
        windshieldLength,
        windshieldWidth,
        bodyLength * 0.26,
      );

      return [
        {
          type: "Feature" as const,
          geometry: { type: "Polygon" as const, coordinates: [bodyPolygon] },
          properties: {
            id: `${vehicle.id}-body`,
            roadClass: vehicle.roadClass,
            part: "body",
          },
        },
        {
          type: "Feature" as const,
          geometry: { type: "Polygon" as const, coordinates: [roofPolygon] },
          properties: {
            id: `${vehicle.id}-roof`,
            roadClass: vehicle.roadClass,
            part: "roof",
          },
        },
        {
          type: "Feature" as const,
          geometry: {
            type: "Polygon" as const,
            coordinates: [windshieldPolygon],
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
