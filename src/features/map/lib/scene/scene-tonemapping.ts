import type { SceneProfile } from "@/features/map/lib/scene/scene-profile";

export type SceneToneMapping = {
  exposure: number;
  bloomStrength: number;
  highlightCompression: number;
  contrast: number;
  saturation: number;
  gamma: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function buildToneMapping(profile: SceneProfile, exposure: number): SceneToneMapping {
  const bloomBase = 0.06 + profile.waterReflectionStrength * 0.14;
  const bloomStrength = Math.max(0.03, Math.min(0.24, bloomBase * exposure));
  const highlightCompression = Math.max(0.62, Math.min(1.35, 1.12 - (exposure - 1) * 0.42));

  return {
    exposure,
    bloomStrength,
    highlightCompression,
    contrast: profile.contrast,
    saturation: profile.saturation,
    gamma: lerp(1.08, 0.92, Math.min(1, Math.max(0, exposure - 0.85))),
  };
}

export function lerpToneMapping(current: SceneToneMapping, target: SceneToneMapping, t: number): SceneToneMapping {
  return {
    exposure: lerp(current.exposure, target.exposure, t),
    bloomStrength: lerp(current.bloomStrength, target.bloomStrength, t),
    highlightCompression: lerp(current.highlightCompression, target.highlightCompression, t),
    contrast: lerp(current.contrast, target.contrast, t),
    saturation: lerp(current.saturation, target.saturation, t),
    gamma: lerp(current.gamma, target.gamma, t),
  };
}
