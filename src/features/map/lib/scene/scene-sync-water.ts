import type { SceneProfile } from "@/features/map/lib/scene/scene-profile";
import type { TimeMode, WeatherMode } from "@/features/map/lib/weather/weather-types";
import type { WaterSceneContext } from "@/features/map/lib/water/water-types";

export function buildWaterSceneContext(
  profile: SceneProfile,
  timeMode: TimeMode,
  weatherMode: WeatherMode,
): WaterSceneContext {
  return {
    weatherMode,
    timeMode,
    skyReflectionColor: profile.skyColor,
    lightDirection: profile.lightDirection,
    specularStrength: profile.specularStrength,
    flowSpeed: profile.flowSpeed,
    reflectionStrength: profile.waterReflectionStrength,
  };
}
