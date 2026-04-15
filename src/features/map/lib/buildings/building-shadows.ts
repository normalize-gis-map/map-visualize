import type { FeatureCollection, Geometry, Position } from "geojson";

import type { TimeMode } from "@/features/map/lib/weather/weather-types";

type BuildingFeature = {
  geometry?: Geometry;
  properties?: Record<string, unknown>;
};

type ShadowPreset = {
  offsetLngPerMeter: number;
  offsetLatPerMeter: number;
  strength: number;
};

export type ShadowSceneTuning = {
  lightDirection: [number, number];
  shadowLength: number;
  shadowSoftness: number;
};

function getShadowPreset(timeMode: TimeMode): ShadowPreset {
  if (timeMode === "morning") {
    return { offsetLngPerMeter: 0.0000019, offsetLatPerMeter: -0.0000012, strength: 0.34 };
  }
  if (timeMode === "noon") {
    return { offsetLngPerMeter: 0.00000045, offsetLatPerMeter: -0.0000002, strength: 0.16 };
  }
  if (timeMode === "evening") {
    return { offsetLngPerMeter: -0.0000018, offsetLatPerMeter: -0.000001, strength: 0.32 };
  }
  if (timeMode === "night") {
    return { offsetLngPerMeter: 0.0000002, offsetLatPerMeter: -0.0000001, strength: 0.07 };
  }
  return { offsetLngPerMeter: 0.0000012, offsetLatPerMeter: -0.0000007, strength: 0.22 };
}

function shadowHeightMeters(properties: Record<string, unknown> | undefined): number {
  const rawHeight =
    Number(properties?.render_height) ||
    Number(properties?.height) ||
    Number(properties?.["building:levels"]) * 3 ||
    12;

  return Math.max(5, Math.min(240, rawHeight));
}

function offsetRing(ring: Position[], dx: number, dy: number): Position[] {
  return ring.map(([lng, lat]) => [lng + dx, lat + dy] as Position);
}

function toShadowFeatures(
  geometry: Geometry,
  dx: number,
  dy: number,
  alpha: number,
): FeatureCollection["features"] {
  if (geometry.type === "Polygon") {
    const shell = geometry.coordinates[0] ?? [];
    if (!shell.length) return [];
    return [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [offsetRing(shell, dx, dy)] },
        properties: { alpha },
      },
    ];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates
      .map((poly) => poly[0] ?? [])
      .filter((shell) => shell.length)
      .map((shell) => ({
        type: "Feature" as const,
        geometry: { type: "Polygon" as const, coordinates: [offsetRing(shell, dx, dy)] },
        properties: { alpha },
      }));
  }

  return [];
}

export function buildBuildingShadows(
  features: BuildingFeature[],
  timeMode: TimeMode,
  maxFeatures = 220,
  sceneTuning?: ShadowSceneTuning,
): FeatureCollection {
  const basePreset = getShadowPreset(timeMode);
  const preset: ShadowPreset = sceneTuning
    ? {
        offsetLngPerMeter: basePreset.offsetLngPerMeter * sceneTuning.shadowLength * sceneTuning.lightDirection[0],
        offsetLatPerMeter: basePreset.offsetLatPerMeter * sceneTuning.shadowLength * Math.abs(sceneTuning.lightDirection[1]),
        strength: basePreset.strength * (1 - sceneTuning.shadowSoftness * 0.45),
      }
    : basePreset;

  const shadowFeatures = features.slice(0, maxFeatures).flatMap((feature) => {
    const geometry = feature.geometry;
    if (!geometry) return [];

    const height = shadowHeightMeters(feature.properties);
    const dx = height * preset.offsetLngPerMeter;
    const dy = height * preset.offsetLatPerMeter;
    const alpha = Math.max(0.04, Math.min(0.42, preset.strength * (0.6 + height / 220)));

    return toShadowFeatures(geometry, dx, dy, alpha);
  });

  return {
    type: "FeatureCollection",
    features: shadowFeatures,
  };
}
