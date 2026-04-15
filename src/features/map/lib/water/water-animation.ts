import type { WaterShaderConfig } from "@/features/map/lib/water/water-types";
import type { TimeMode, WeatherMode } from "@/features/map/lib/weather/weather-types";

export const MAX_WATER_WAKES = 28;

export const DEFAULT_WATER_SHADER_CONFIG: WaterShaderConfig = {
  baseColor: [0.27, 0.49, 0.64],
  highlightColor: [0.77, 0.91, 0.98],
  opacity: 0.42,
  rippleScale: 1.1,
  flowDirection: [0.95, -0.35],
};

export function animationTimeSeconds(startTime: number): number {
  return (performance.now() - startTime) / 1000;
}

export function weatherModeToNumber(mode: WeatherMode): number {
  if (mode === "rain") return 1;
  if (mode === "snow") return 2;
  return 0;
}

export function timeModeToNumber(mode: TimeMode): number {
  if (mode === "morning") return 0;
  if (mode === "noon") return 1;
  if (mode === "evening") return 2;
  if (mode === "night") return 3;

  const hour = new Date().getHours();
  if (hour < 10) return 0;
  if (hour < 16) return 1;
  if (hour < 19) return 2;
  return 3;
}
