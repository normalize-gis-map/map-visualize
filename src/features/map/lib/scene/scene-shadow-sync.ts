import type { SunState } from "@/features/map/lib/scene/scene-sun";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export type SunShadowSync = {
  lightDirection: [number, number];
  shadowLength: number;
  shadowSoftness: number;
  specularStrength: number;
  waterReflectionStrength: number;
};

export function buildSunShadowSync(sun: SunState): SunShadowSync {
  const azimuthRad = (sun.azimuth * Math.PI) / 180;
  const elevationRad = (Math.max(-10, sun.elevation) * Math.PI) / 180;

  const dirX = Math.cos(azimuthRad);
  const dirY = -Math.sin(azimuthRad);

  const elevationSin = Math.max(0.02, Math.sin(Math.max(0, elevationRad)));
  const geometricLength = 1 / elevationSin;
  const shadowLength = sun.elevation <= 0 ? 0.12 : clamp(geometricLength * 0.62, 0.3, 2.8);

  const shadowSoftness = sun.elevation <= 0
    ? 0.92
    : clamp(0.46 + (1 - elevationSin) * 0.42, 0.45, 0.88);

  const specularStrength = clamp(0.18 + sun.intensity * (sun.elevation > 0 ? 0.82 : 0.24), 0.08, 0.95);
  const waterReflectionStrength = clamp(0.22 + sun.intensity * (sun.elevation > 0 ? 0.78 : 0.16), 0.12, 0.96);

  return {
    lightDirection: [dirX, dirY],
    shadowLength,
    shadowSoftness,
    specularStrength,
    waterReflectionStrength,
  };
}
