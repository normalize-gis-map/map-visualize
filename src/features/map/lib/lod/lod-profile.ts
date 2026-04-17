import type { SceneLodProfile } from "@/features/map/lib/lod/lod-types";

const FAR_PROFILE: SceneLodProfile = {
  zoomBucket: "far",
  waterDetail: "low",
  waterDetailFactor: 0.52,
  trafficDensity: 0.34,
  trafficRoadBias: "major",
  boatDensity: 0.12,
  bikeDensity: 0,
  peopleDensity: 0,
  vegetationDensity: "none",
  vegetationScale: 0,
  weatherParticleDensity: "off",
  shadowQuality: "off",
  shadowMaxFeatures: 0,
};

const MID_PROFILE: SceneLodProfile = {
  zoomBucket: "mid",
  waterDetail: "low",
  waterDetailFactor: 0.72,
  trafficDensity: 0.62,
  trafficRoadBias: "major_secondary",
  boatDensity: 0.35,
  bikeDensity: 0.1,
  peopleDensity: 0,
  vegetationDensity: "sparse",
  vegetationScale: 0.32,
  weatherParticleDensity: "low",
  shadowQuality: "light",
  shadowMaxFeatures: 80,
};

const NEAR_PROFILE: SceneLodProfile = {
  zoomBucket: "near",
  waterDetail: "medium",
  waterDetailFactor: 0.92,
  trafficDensity: 0.9,
  trafficRoadBias: "major_secondary",
  boatDensity: 0.72,
  bikeDensity: 0.58,
  peopleDensity: 0.48,
  vegetationDensity: "medium",
  vegetationScale: 0.72,
  weatherParticleDensity: "medium",
  shadowQuality: "medium",
  shadowMaxFeatures: 150,
};

const CLOSE_PROFILE: SceneLodProfile = {
  zoomBucket: "close",
  waterDetail: "high",
  waterDetailFactor: 1.15,
  trafficDensity: 1.14,
  trafficRoadBias: "all",
  boatDensity: 1,
  bikeDensity: 1,
  peopleDensity: 1,
  vegetationDensity: "high",
  vegetationScale: 1,
  weatherParticleDensity: "high",
  shadowQuality: "high",
  shadowMaxFeatures: 240,
};

export function getSceneLodProfile(zoom: number): SceneLodProfile {
  if (zoom < 12) return FAR_PROFILE;
  if (zoom < 14) return MID_PROFILE;
  if (zoom < 16) return NEAR_PROFILE;
  return CLOSE_PROFILE;
}
