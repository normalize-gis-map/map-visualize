import type { TimeMode, WeatherMode } from "@/features/map/lib/weather/weather-types";
import {
  computeSceneProfile,
  lerpSceneProfile,
  type SceneProfile,
} from "@/features/map/lib/scene/scene-profile";

const TRANSITION_MIN_MS = 300;
const TRANSITION_MAX_MS = 1000;

export class SceneController {
  private current: SceneProfile;

  private target: SceneProfile;

  private timeMode: TimeMode;

  private weatherMode: WeatherMode;

  private transitionMs: number;

  private lastTick = performance.now();

  constructor(initialTimeMode: TimeMode, initialWeatherMode: WeatherMode) {
    this.timeMode = initialTimeMode;
    this.weatherMode = initialWeatherMode;
    this.current = computeSceneProfile(initialTimeMode, initialWeatherMode);
    this.target = this.current;
    this.transitionMs = 640;
  }

  setModes(timeMode: TimeMode, weatherMode: WeatherMode) {
    if (timeMode === this.timeMode && weatherMode === this.weatherMode) return;

    this.timeMode = timeMode;
    this.weatherMode = weatherMode;
    this.target = computeSceneProfile(timeMode, weatherMode);
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
    return this.current;
  }

  getProfile(): SceneProfile {
    return this.current;
  }
}
