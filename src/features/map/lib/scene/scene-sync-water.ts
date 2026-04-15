import type { SceneProfile } from "@/features/map/lib/scene/scene-profile";
import type { SceneToneMapping } from "@/features/map/lib/scene/scene-tonemapping";
import type { TimeMode, WeatherMode } from "@/features/map/lib/weather/weather-types";
import type { WaterSceneContext } from "@/features/map/lib/water/water-types";

export function buildWaterSceneContext(
  profile: SceneProfile,
  timeMode: TimeMode,
  weatherMode: WeatherMode,
  tone: SceneToneMapping,
): WaterSceneContext {
  return {
    weatherMode,
    timeMode,
    skyReflectionColor: profile.skyColor,
    lightDirection: profile.lightDirection,
    specularStrength: profile.specularStrength,
    flowSpeed: profile.flowSpeed,
    reflectionStrength: profile.waterReflectionStrength,
    exposure: tone.exposure,
    bloomStrength: tone.bloomStrength,
    highlightCompression: tone.highlightCompression,
  };
}
