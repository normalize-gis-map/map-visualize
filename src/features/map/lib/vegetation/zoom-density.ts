import type { GreenAreaRenderMode } from "@/features/map/lib/vegetation/classify-green-area";

export function getTreeBudgetByZoom(
  zoom: number,
  detailPreset: "balanced" | "high",
  mode: GreenAreaRenderMode,
): number {
  if (zoom < 13) return 0;

  if (zoom < 15) {
    const sparseBase = detailPreset === "high" ? 24 : 16;
    if (mode === "dense_wooded") return Math.floor(sparseBase * 1.18);
    if (mode === "park_trees") return sparseBase;
    return 0;
  }

  if (zoom < 17) {
    const midBase = detailPreset === "high" ? 84 : 62;
    if (mode === "dense_wooded") return Math.floor(midBase * 1.18);
    if (mode === "park_trees") return midBase;
    return detailPreset === "high" ? 10 : 7;
  }

  const base = detailPreset === "high" ? 260 : 190;
  if (mode === "grass_first") return Math.max(12, Math.floor(base * 0.2));
  if (mode === "dense_wooded") return Math.floor(base * 1.2);
  return base;
}

export function getGlobalTreeBudgetByZoom(
  zoom: number,
  detailPreset: "balanced" | "high",
): number {
  if (zoom < 13) return 0;
  if (zoom < 15) return detailPreset === "high" ? 46 : 32;
  if (zoom < 17) return detailPreset === "high" ? 140 : 102;
  return detailPreset === "high" ? 320 : 240;
}
