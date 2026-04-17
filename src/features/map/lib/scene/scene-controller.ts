import {
  computeSceneProfile,
  lerpSceneProfile,
  type SceneProfile,
} from "@/features/map/lib/scene/scene-profile";
import {
  buildToneMapping,
  lerpToneMapping,
  type SceneToneMapping,
} from "@/features/map/lib/scene/scene-tonemapping";
import { SceneExposureController } from "@/features/map/lib/scene/scene-exposure";
import type { TimeMode, WeatherMode } from "@/features/map/lib/weather/weather-types";

const TRANSITION_MIN_MS = 300;
const TRANSITION_MAX_MS = 1000;

export class SceneController {
  private current: SceneProfile;

  private target: SceneProfile;

  private tone: SceneToneMapping;

  private timeMode: TimeMode;

  private weatherMode: WeatherMode;

  private transitionMs: number;

  private exposureController: SceneExposureController;

  private lastTick = performance.now();

  constructor(initialTimeMode: TimeMode, initialWeatherMode: WeatherMode) {
    this.timeMode = initialTimeMode;
    this.weatherMode = initialWeatherMode;
    this.current = computeSceneProfile(initialTimeMode, initialWeatherMode);
    this.target = this.current;
    this.exposureController = new SceneExposureController(initialTimeMode, initialWeatherMode);
    this.tone = buildToneMapping(this.current, this.exposureController.getState().exposure);
    this.transitionMs = 640;
  }

  setModes(timeMode: TimeMode, weatherMode: WeatherMode) {
    if (timeMode === this.timeMode && weatherMode === this.weatherMode) return;

    this.timeMode = timeMode;
    this.weatherMode = weatherMode;
    this.target = computeSceneProfile(timeMode, weatherMode);
    this.exposureController.setTarget(timeMode, weatherMode);
    this.transitionMs = Math.max(
      TRANSITION_MIN_MS,
      Math.min(TRANSITION_MAX_MS, timeMode === "night" || weatherMode !== "sun" ? 900 : 620),
    );
  }

  tick(now = performance.now()): SceneProfile {
    const dtMs = Math.max(0, now - this.lastTick);
    this.lastTick = now;

    const t = Math.min(1, dtMs / this.transitionMs);
    this.current = lerpSceneProfile(this.current, this.target, t);

    const exposure = this.exposureController.tick().exposure;
    const toneTarget = buildToneMapping(this.current, exposure);
    this.tone = lerpToneMapping(this.tone, toneTarget, 0.06);

    return this.current;
  }

  getProfile(): SceneProfile {
    return this.current;
  }

  getToneMapping(): SceneToneMapping {
    return this.tone;
  }
}
