import type maplibregl from "maplibre-gl";
import type { TimeMode, WeatherMode } from "@/features/map/lib/weather/weather-types";

export type { WeatherMode, TimeMode } from "@/features/map/lib/weather/weather-types";

export type SceneTone = {
  weatherTone: string;
  timeTone: string;
  weatherContrast: string;
  rainPattern: boolean;
  snowPattern: boolean;
};

type LightPreset = {
  intensity: number;
  color: string;
  position: [number, number, number];
};

type FogPreset = Record<string, string | number | number[]>;

export function getSceneTone(weatherMode: WeatherMode, timeMode: TimeMode): SceneTone {
  const weatherTone =
    weatherMode === "sun"
      ? "bg-amber-100/7"
      : weatherMode === "snow"
        ? "bg-cyan-100/12"
        : "bg-slate-700/24";

  const weatherContrast =
    weatherMode === "sun"
      ? "contrast-110 saturate-112"
      : weatherMode === "snow"
        ? "contrast-103 saturate-86"
        : "contrast-94 saturate-80";

  const timeTone =
    timeMode === "night"
      ? "bg-slate-950/58"
      : timeMode === "morning"
        ? "bg-amber-200/10"
        : timeMode === "noon"
          ? "bg-white/4"
          : timeMode === "evening"
            ? "bg-orange-500/14"
            : "bg-transparent";

  return {
    weatherTone,
    timeTone,
    weatherContrast,
    rainPattern: weatherMode === "rain",
    snowPattern: weatherMode === "snow",
  };
}

function getTimeLightPreset(timeMode: TimeMode): LightPreset {
  if (timeMode === "morning") {
    return {
      intensity: 0.52,
      color: "hsl(36, 62%, 84%)",
      position: [1.25, 95, 58],
    };
  }

  if (timeMode === "noon") {
    return {
      intensity: 0.74,
      color: "hsl(210, 40%, 92%)",
      position: [1.35, 180, 22],
    };
  }

  if (timeMode === "evening") {
    return {
      intensity: 0.42,
      color: "hsl(22, 70%, 72%)",
      position: [1.2, 278, 60],
    };
  }

  if (timeMode === "night") {
    return {
      intensity: 0.16,
      color: "hsl(220, 30%, 54%)",
      position: [1.1, 340, 74],
    };
  }

  return {
    intensity: 0.46,
    color: "hsl(210, 36%, 84%)",
    position: [1.2, 150, 40],
  };
}

function getWeatherLightModifier(weather: WeatherMode): Pick<LightPreset, "intensity" | "color"> {
  if (weather === "rain") {
    return {
      intensity: 0.82,
      color: "hsl(210, 24%, 72%)",
    };
  }
  if (weather === "snow") {
    return {
      intensity: 0.92,
      color: "hsl(205, 25%, 90%)",
    };
  }

  return {
    intensity: 1,
    color: "",
  };
}

function getFogPreset(weather: WeatherMode, time: TimeMode): FogPreset {
  const weatherFog: Record<WeatherMode, FogPreset> = {
    sun: {
      range: [1, 14.5],
      color: "hsl(203, 44%, 90%)",
      "high-color": "hsl(203, 34%, 96%)",
      "space-color": "hsl(208, 26%, 98%)",
      "horizon-blend": 0.08,
      "star-intensity": 0,
    },
    rain: {
      range: [0.45, 8],
      color: "hsl(212, 22%, 42%)",
      "high-color": "hsl(216, 20%, 34%)",
      "space-color": "hsl(220, 16%, 25%)",
      "horizon-blend": 0.22,
      "star-intensity": 0,
    },
    snow: {
      range: [0.6, 10.2],
      color: "hsl(205, 30%, 82%)",
      "high-color": "hsl(206, 24%, 88%)",
      "space-color": "hsl(210, 18%, 80%)",
      "horizon-blend": 0.16,
      "star-intensity": 0,
    },
  };

  if (time === "night") {
    return {
      ...weatherFog[weather],
      range: weather === "rain" ? [0.32, 5.4] : [0.42, 6.2],
      color: weather === "snow" ? "hsl(219, 22%, 20%)" : "hsl(222, 27%, 15%)",
      "high-color": weather === "snow" ? "hsl(218, 20%, 16%)" : "hsl(222, 24%, 12%)",
      "space-color": "hsl(226, 26%, 9%)",
      "horizon-blend": 0.32,
      "star-intensity": weather === "sun" ? 0.24 : 0.08,
    };
  }

  if (time === "morning") {
    return {
      ...weatherFog[weather],
      "horizon-blend": 0.16,
      color: weather === "rain" ? "hsl(212, 24%, 48%)" : "hsl(200, 34%, 88%)",
    };
  }

  if (time === "evening") {
    return {
      ...weatherFog[weather],
      "horizon-blend": 0.24,
      "high-color": weather === "rain" ? "hsl(217, 20%, 30%)" : "hsl(24, 46%, 82%)",
    };
  }

  return weatherFog[weather];
}

export function applySceneStyle(map: maplibregl.Map, weather: WeatherMode, time: TimeMode) {
  const timeLight = getTimeLightPreset(time);
  const weatherMod = getWeatherLightModifier(weather);

  map.setLight({
    anchor: "viewport",
    color: weatherMod.color || timeLight.color,
    intensity: timeLight.intensity * weatherMod.intensity,
    position: timeLight.position,
  });

  const fogApi = map as unknown as {
    setFog?: (fog: Record<string, string | number | number[]>) => void;
  };

  if (!fogApi.setFog) return;
  fogApi.setFog(getFogPreset(weather, time));
}
