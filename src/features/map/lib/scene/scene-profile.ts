import type { TimeMode, WeatherMode } from "@/features/map/lib/weather/weather-types";

export type SceneProfile = {
  skyColor: [number, number, number];
  ambientLight: number;
  lightDirection: [number, number];
  contrast: number;
  saturation: number;
  waterTone: [number, number, number];
  waterReflectionStrength: number;
  trafficDensityMultiplier: number;
  trafficSpeedMultiplier: number;
  shadowLength: number;
  shadowSoftness: number;
  flowSpeed: number;
  specularStrength: number;
  weatherParticleIntensity: "low" | "medium" | "high";
};

function resolveTimeBucket(timeMode: TimeMode): Exclude<TimeMode, "live"> {
  if (timeMode !== "live") return timeMode;
  const hour = new Date().getHours();
  if (hour < 10) return "morning";
  if (hour < 16) return "noon";
  if (hour < 19) return "evening";
  return "night";
}

const TIME_PROFILES: Record<Exclude<TimeMode, "live">, SceneProfile> = {
  morning: {
    skyColor: [0.95, 0.78, 0.62],
    ambientLight: 0.56,
    lightDirection: [0.82, -0.45],
    contrast: 1.02,
    saturation: 1.04,
    waterTone: [0.95, 0.78, 0.6],
    waterReflectionStrength: 0.72,
    trafficDensityMultiplier: 0.9,
    trafficSpeedMultiplier: 0.94,
    shadowLength: 1.25,
    shadowSoftness: 0.68,
    flowSpeed: 1,
    specularStrength: 0.68,
    weatherParticleIntensity: "medium",
  },
  noon: {
    skyColor: [0.74, 0.86, 0.98],
    ambientLight: 0.74,
    lightDirection: [0.15, -0.98],
    contrast: 1.08,
    saturation: 1.06,
    waterTone: [0.82, 0.92, 1],
    waterReflectionStrength: 0.92,
    trafficDensityMultiplier: 1.12,
    trafficSpeedMultiplier: 1,
    shadowLength: 0.58,
    shadowSoftness: 0.52,
    flowSpeed: 1.05,
    specularStrength: 0.88,
    weatherParticleIntensity: "medium",
  },
  evening: {
    skyColor: [0.98, 0.68, 0.45],
    ambientLight: 0.48,
    lightDirection: [-0.86, -0.44],
    contrast: 0.96,
    saturation: 1.03,
    waterTone: [0.98, 0.71, 0.53],
    waterReflectionStrength: 0.76,
    trafficDensityMultiplier: 0.98,
    trafficSpeedMultiplier: 0.93,
    shadowLength: 1.34,
    shadowSoftness: 0.74,
    flowSpeed: 0.95,
    specularStrength: 0.62,
    weatherParticleIntensity: "medium",
  },
  night: {
    skyColor: [0.26, 0.36, 0.56],
    ambientLight: 0.23,
    lightDirection: [0.35, -0.92],
    contrast: 0.86,
    saturation: 0.82,
    waterTone: [0.35, 0.45, 0.62],
    waterReflectionStrength: 0.3,
    trafficDensityMultiplier: 0.62,
    trafficSpeedMultiplier: 0.85,
    shadowLength: 0.24,
    shadowSoftness: 0.9,
    flowSpeed: 0.72,
    specularStrength: 0.28,
    weatherParticleIntensity: "low",
  },
};

function applyWeatherAdjustments(base: SceneProfile, weatherMode: WeatherMode): SceneProfile {
  if (weatherMode === "rain") {
    return {
      ...base,
      ambientLight: base.ambientLight * 0.86,
      contrast: base.contrast * 0.92,
      saturation: base.saturation * 0.88,
      waterReflectionStrength: base.waterReflectionStrength * 0.82,
      specularStrength: base.specularStrength * 0.78,
      flowSpeed: base.flowSpeed * 1.1,
      trafficDensityMultiplier: base.trafficDensityMultiplier * 1.06,
      trafficSpeedMultiplier: base.trafficSpeedMultiplier * 0.92,
      shadowSoftness: Math.min(1, base.shadowSoftness * 1.12),
      weatherParticleIntensity: "high",
    };
  }

  if (weatherMode === "snow") {
    return {
      ...base,
      ambientLight: base.ambientLight * 0.9,
      contrast: base.contrast * 0.86,
      saturation: base.saturation * 0.82,
      waterReflectionStrength: base.waterReflectionStrength * 0.74,
      specularStrength: base.specularStrength * 0.72,
      flowSpeed: base.flowSpeed * 0.86,
      trafficDensityMultiplier: base.trafficDensityMultiplier * 0.88,
      trafficSpeedMultiplier: base.trafficSpeedMultiplier * 0.8,
      shadowSoftness: Math.min(1, base.shadowSoftness * 1.2),
      weatherParticleIntensity: "medium",
    };
  }

  return base;
}

export function computeSceneProfile(timeMode: TimeMode, weatherMode: WeatherMode): SceneProfile {
  const timeProfile = TIME_PROFILES[resolveTimeBucket(timeMode)];
  return applyWeatherAdjustments(timeProfile, weatherMode);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpSceneProfile(current: SceneProfile, target: SceneProfile, t: number): SceneProfile {
  return {
    skyColor: [
      lerp(current.skyColor[0], target.skyColor[0], t),
      lerp(current.skyColor[1], target.skyColor[1], t),
      lerp(current.skyColor[2], target.skyColor[2], t),
    ],
    ambientLight: lerp(current.ambientLight, target.ambientLight, t),
    lightDirection: [
      lerp(current.lightDirection[0], target.lightDirection[0], t),
      lerp(current.lightDirection[1], target.lightDirection[1], t),
    ],
    contrast: lerp(current.contrast, target.contrast, t),
    saturation: lerp(current.saturation, target.saturation, t),
    waterTone: [
      lerp(current.waterTone[0], target.waterTone[0], t),
      lerp(current.waterTone[1], target.waterTone[1], t),
      lerp(current.waterTone[2], target.waterTone[2], t),
    ],
    waterReflectionStrength: lerp(current.waterReflectionStrength, target.waterReflectionStrength, t),
    trafficDensityMultiplier: lerp(current.trafficDensityMultiplier, target.trafficDensityMultiplier, t),
    trafficSpeedMultiplier: lerp(current.trafficSpeedMultiplier, target.trafficSpeedMultiplier, t),
    shadowLength: lerp(current.shadowLength, target.shadowLength, t),
    shadowSoftness: lerp(current.shadowSoftness, target.shadowSoftness, t),
    flowSpeed: lerp(current.flowSpeed, target.flowSpeed, t),
    specularStrength: lerp(current.specularStrength, target.specularStrength, t),
    weatherParticleIntensity:
      t < 0.5 ? current.weatherParticleIntensity : target.weatherParticleIntensity,
  };
}
