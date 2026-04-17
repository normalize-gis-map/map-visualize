export type ZoomBucket = "far" | "mid" | "near" | "close";

export type WeatherParticleDensity = "off" | "low" | "medium" | "high";
export type VegetationDensity = "none" | "sparse" | "medium" | "high";
export type ShadowQuality = "off" | "light" | "medium" | "high";

export type SceneLodProfile = {
  zoomBucket: ZoomBucket;
  waterDetail: "low" | "medium" | "high";
  waterDetailFactor: number;
  trafficDensity: number;
  trafficRoadBias: "major" | "major_secondary" | "all";
  boatDensity: number;
  bikeDensity: number;
  peopleDensity: number;
  vegetationDensity: VegetationDensity;
  vegetationScale: number;
  weatherParticleDensity: WeatherParticleDensity;
  shadowQuality: ShadowQuality;
  shadowMaxFeatures: number;
};
