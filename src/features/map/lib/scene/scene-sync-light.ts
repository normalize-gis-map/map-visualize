import type maplibregl from "maplibre-gl";

import type { SceneProfile } from "@/features/map/lib/scene/scene-profile";

function toHslColor(rgb: [number, number, number]) {
  return `rgb(${Math.round(rgb[0] * 255)} ${Math.round(rgb[1] * 255)} ${Math.round(rgb[2] * 255)})`;
}

export function applySceneLighting(map: maplibregl.Map, profile: SceneProfile) {
  const sunElevation = Math.max(-8, profile.sun.elevation);
  map.setLight({
    anchor: "viewport",
    color: toHslColor(profile.skyColor),
    intensity: Math.max(0.08, profile.ambientLight * (0.5 + profile.sun.intensity * 0.7)),
    position: [1.2, profile.sun.azimuth, Math.max(5, sunElevation + 12)],
  });

  const fogApi = map as unknown as {
    setFog?: (fog: Record<string, string | number | number[]>) => void;
  };

  fogApi.setFog?.({
    range: [0.5, 10 + profile.ambientLight * 6],
    color: toHslColor([profile.skyColor[0] * 0.78, profile.skyColor[1] * 0.8, profile.skyColor[2] * 0.88]),
    "high-color": toHslColor(profile.skyColor),
    "horizon-blend": 0.08 + profile.shadowSoftness * 0.18,
    "star-intensity": sunElevation < 0 ? 0.24 : 0,
  });
}
