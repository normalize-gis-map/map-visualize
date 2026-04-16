import type { TimeMode, WeatherMode } from "@/features/map/lib/weather/weather-types";

export type SunState = {
  azimuth: number;
  elevation: number;
  intensity: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function resolveTimeBucket(timeMode: TimeMode): Exclude<TimeMode, "live"> {
  if (timeMode !== "live") return timeMode;

  const hour = new Date().getHours() + new Date().getMinutes() / 60;
  if (hour < 10) return "morning";
  if (hour < 16) return "noon";
  if (hour < 19) return "evening";
  return "night";
}

function sunByBucket(bucket: Exclude<TimeMode, "live">): SunState {
  if (bucket === "morning") return { azimuth: 78, elevation: 18, intensity: 0.64 };
  if (bucket === "noon") return { azimuth: 182, elevation: 67, intensity: 1 };
  if (bucket === "evening") return { azimuth: 286, elevation: 14, intensity: 0.56 };
  return { azimuth: 332, elevation: -7, intensity: 0.08 };
}

function liveSunState(): SunState {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  if (hour < 6 || hour >= 19.5) {
    return { azimuth: 332, elevation: -8, intensity: 0.05 };
  }

  const dayProgress = (hour - 6) / 13.5;
  const azimuth = 70 + dayProgress * (292 - 70);
  const elevation = Math.sin(dayProgress * Math.PI) * 68;
  const intensity = clamp(0.16 + Math.sin(dayProgress * Math.PI) * 0.9, 0.08, 1);
  return { azimuth, elevation, intensity };
}

function weatherSunFactor(weatherMode: WeatherMode): number {
  if (weatherMode === "rain") return 0.84;
  if (weatherMode === "snow") return 0.72;
  return 1;
}

export function computeSunState(timeMode: TimeMode, weatherMode: WeatherMode): SunState {
  const base = timeMode === "live" ? liveSunState() : sunByBucket(resolveTimeBucket(timeMode));
  return {
    ...base,
    intensity: clamp(base.intensity * weatherSunFactor(weatherMode), 0.03, 1),
  };
}
