import type { TimeMode, WeatherMode } from "@/features/map/lib/weather/weather-types";

export type ExposureState = {
  exposure: number;
  targetExposure: number;
};

function resolveTimeBucket(timeMode: TimeMode): Exclude<TimeMode, "live"> {
  if (timeMode !== "live") return timeMode;
  const hour = new Date().getHours();
  if (hour < 10) return "morning";
  if (hour < 16) return "noon";
  if (hour < 19) return "evening";
  return "night";
}

function exposureByTime(timeMode: TimeMode): number {
  const bucket = resolveTimeBucket(timeMode);
  if (bucket === "morning") return 1.04;
  if (bucket === "noon") return 0.9;
  if (bucket === "evening") return 1.08;
  return 1.16;
}

function weatherExposureFactor(weatherMode: WeatherMode): number {
  if (weatherMode === "rain") return 0.94;
  if (weatherMode === "snow") return 0.9;
  return 1;
}

function clampExposure(value: number): number {
  return Math.max(0.78, Math.min(1.25, value));
}

export class SceneExposureController {
  private state: ExposureState;

  constructor(timeMode: TimeMode, weatherMode: WeatherMode) {
    const targetExposure = clampExposure(exposureByTime(timeMode) * weatherExposureFactor(weatherMode));
    this.state = {
      exposure: targetExposure,
      targetExposure,
    };
  }

  setTarget(timeMode: TimeMode, weatherMode: WeatherMode) {
    this.state.targetExposure = clampExposure(exposureByTime(timeMode) * weatherExposureFactor(weatherMode));
  }

  tick(lerpFactor = 0.05): ExposureState {
    const t = Math.max(0.03, Math.min(0.08, lerpFactor));
    this.state.exposure = this.state.exposure + (this.state.targetExposure - this.state.exposure) * t;
    return this.state;
  }

  getState(): ExposureState {
    return this.state;
  }
}
