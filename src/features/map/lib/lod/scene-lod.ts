import { getSceneLodProfile } from "@/features/map/lib/lod/lod-profile";
import type { SceneLodProfile } from "@/features/map/lib/lod/lod-types";

export function computeSceneLodProfile(zoom: number): SceneLodProfile {
  return getSceneLodProfile(zoom);
}

export function hasMeaningfulLodChange(previous: SceneLodProfile | null, next: SceneLodProfile): boolean {
  if (!previous) return true;
  return (
    previous.zoomBucket !== next.zoomBucket ||
    Math.abs(previous.trafficDensity - next.trafficDensity) > 0.08 ||
    Math.abs(previous.waterDetailFactor - next.waterDetailFactor) > 0.08
  );
}

export function weatherIntensityFromLod(density: SceneLodProfile["weatherParticleDensity"]) {
  if (density === "off") return "low" as const;
  if (density === "low") return "low" as const;
  if (density === "medium") return "medium" as const;
  return "high" as const;
}

export function shadowMaxFeaturesFromLod(profile: SceneLodProfile) {
  return profile.shadowMaxFeatures;
}
