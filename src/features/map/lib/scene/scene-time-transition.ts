import type { SunState } from "@/features/map/lib/scene/scene-sun";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpAngleDeg(from: number, to: number, t: number) {
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return from + delta * t;
}

export function lerpSunState(current: SunState, target: SunState, t: number): SunState {
  const k = clamp(t, 0, 1);
  return {
    azimuth: lerpAngleDeg(current.azimuth, target.azimuth, k),
    elevation: lerp(current.elevation, target.elevation, k),
    intensity: lerp(current.intensity, target.intensity, k),
  };
}
