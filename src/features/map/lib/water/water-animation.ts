import type { WaterShaderConfig } from "@/features/map/lib/water/water-types";

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
