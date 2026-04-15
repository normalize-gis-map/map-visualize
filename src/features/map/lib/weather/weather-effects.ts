import type maplibregl from "maplibre-gl";

export type WeatherMode = "sun" | "rain" | "snow";
export type TimeMode = "live" | "morning" | "noon" | "evening" | "night";

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
      : weatherMode === "snow"
        ? "bg-cyan-100/14"
        : "bg-slate-700/22";

  const weatherContrast =
    weatherMode === "sun"
      ? "contrast-110 saturate-110"
      : weatherMode === "snow"
        ? "contrast-105 saturate-90"
        : "contrast-95 saturate-85";

  const timeTone =
    timeMode === "night"
      ? "bg-slate-950/50"
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
    snowPattern: weatherMode === "snow",
  };
}

export function getShadowPreset(timeMode: TimeMode): ShadowPreset {
  if (timeMode === "morning") {
    return {
      intensity: 0.46,
      color: "hsl(215, 35%, 74%)",
      position: [1.2, 90, 60],
    };
  }

  if (timeMode === "noon") {
    return {
      intensity: 0.72,
      color: "hsl(212, 25%, 83%)",
      position: [1.2, 180, 20],
    };
  }

  if (timeMode === "evening") {
    return {
      intensity: 0.4,
      color: "hsl(20, 40%, 62%)",
      position: [1.2, 270, 58],
    };
  }

  if (timeMode === "night") {
    return {
      intensity: 0.1,
      color: "hsl(220, 23%, 36%)",
      position: [1.2, 330, 75],
    };
  }

  return {
    intensity: 0.36,
    color: "hsl(213, 30%, 75%)",
    position: [1.2, 150, 38],
  };
}

export function applySceneStyle(
  map: maplibregl.Map,
  weather: WeatherMode,
  time: TimeMode,
) {
  const shadow = getShadowPreset(time);

  map.setLight({
    anchor: "viewport",
    color: shadow.color,
    intensity: shadow.intensity,
    position: shadow.position,
  });

  const fogByWeather: Record<WeatherMode, Record<string, string | number | number[]>> = {
    sun: {
      range: [0.8, 14],
      color: "hsl(205, 35%, 90%)",
      "high-color": "hsl(202, 28%, 96%)",
      "space-color": "hsl(206, 20%, 98%)",
      "horizon-blend": 0.08,
      "star-intensity": 0,
    },
    rain: {
      range: [0.4, 7.5],
      color: "hsl(214, 24%, 45%)",
      "high-color": "hsl(217, 22%, 36%)",
      "space-color": "hsl(220, 18%, 25%)",
      "horizon-blend": 0.22,
      "star-intensity": 0,
    },
    snow: {
      range: [0.55, 9],
      color: "hsl(205, 28%, 82%)",
      "high-color": "hsl(207, 20%, 88%)",
      "space-color": "hsl(208, 18%, 78%)",
      "horizon-blend": 0.18,
      "star-intensity": 0,
    },
  };

  const fog = fogByWeather[weather];
  const fogApi = map as unknown as {
    setFog?: (fog: Record<string, string | number | number[]>) => void;
  };

  if (!fogApi.setFog) return;

  if (time === "night") {
    fogApi.setFog({
      ...fog,
      range: [0.35, 5.5],
      color: "hsl(221, 27%, 17%)",
      "high-color": "hsl(221, 24%, 14%)",
      "space-color": "hsl(226, 24%, 10%)",
      "horizon-blend": 0.34,
      "star-intensity": 0.25,
    });
    return;
  }

  fogApi.setFog(fog);
}
