import type { SceneProfile } from "@/features/map/lib/scene/scene-profile";

export function deriveTrafficSceneTuning(profile: SceneProfile) {
  return {
    densityMultiplier: profile.trafficDensityMultiplier,
    speedMultiplier: profile.trafficSpeedMultiplier,
  };
}
