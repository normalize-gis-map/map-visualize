import type { TimeMode, WeatherMode } from "@/features/map/store/map.store";

export type SceneTone = {
  weatherTone: string;
  timeTone: string;
  weatherContrast: string;
  rainPattern: boolean;
  snowPattern: boolean;
};

export type ShadowPreset = {
  intensity: number;
  color: string;
  position: [number, number, number];
};

export function getSceneTone(weatherMode: WeatherMode, timeMode: TimeMode): SceneTone {
  const weatherTone =
    weatherMode === "sun"
      ? "bg-amber-200/8"
      : weatherMode === "snows"
        ? "bg-cyan-100/12"
        : "bg-slate-700/22";

  const weatherContrast =
    weatherMode === "sun"
      ? "contrast-110 saturate-110"
      : weatherMode === "snows"
        ? "contrast-105 saturate-90"
        : "contrast-95 saturate-85";

  const timeTone =
    timeMode === "night"
      ? "bg-slate-950/48"
      : timeMode === "morning"
        ? "bg-amber-200/10"
        : timeMode === "noon"
          ? "bg-white/6"
          : timeMode === "evening"
            ? "bg-orange-400/12"
            : "bg-transparent";

  return {
    weatherTone,
    timeTone,
    weatherContrast,
    rainPattern: weatherMode === "rain",
    snowPattern: weatherMode === "snows",
  };
}

export function getShadowPreset(timeMode: TimeMode): ShadowPreset {
  if (timeMode === "morning") {
    return {
      intensity: 0.5,
      color: "hsl(215, 35%, 74%)",
      position: [1.2, 130, 28],
    };
  }

  if (timeMode === "noon") {
    return {
      intensity: 0.22,
      color: "hsl(212, 25%, 83%)",
      position: [1.2, 180, 78],
    };
  }

  if (timeMode === "evening") {
    return {
      intensity: 0.55,
      color: "hsl(20, 40%, 62%)",
      position: [1.2, 252, 24],
    };
  }

  if (timeMode === "night") {
    return {
      intensity: 0.08,
      color: "hsl(220, 23%, 36%)",
      position: [1.2, 330, 8],
    };
  }

  return {
    intensity: 0.3,
    color: "hsl(213, 30%, 75%)",
    position: [1.2, 190, 42],
  };
}
