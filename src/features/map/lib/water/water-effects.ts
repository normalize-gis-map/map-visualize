export function getWaterPaint(detailPreset: "balanced" | "high") {
  return {
    tone: {
      "fill-color": ["interpolate", ["linear"], ["zoom"], 9, "#5f99c2", 13, "#558fb9", 17, "#4a81ac"],
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.28, 13, 0.36, 17, 0.45],
    },
    shore: {
      "line-color": "#cbe7f8",
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.16, 14, 0.24, 18, 0.34],
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.45, 15, 1, 19, 1.45],
    },
    base: {
      "line-color": "#def2ff",
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        detailPreset === "high" ? 0.15 : 0.1,
        14,
        detailPreset === "high" ? 0.24 : 0.18,
        18,
        detailPreset === "high" ? 0.32 : 0.25,
      ],
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.42, 14, 0.85, 17, 1.25, 20, 1.75],
      "line-dasharray": [0.8, 1.6],
    },
    detail: {
      "line-color": "#f8fdff",
      "line-opacity": detailPreset === "high" ? 0.18 : 0.12,
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 0.52, 18, 1.02, 20, 1.35],
      "line-dasharray": [0.2, 0.78],
    },
  };
}

export function getAnimatedWaterOpacities(phase: number) {
  return {
    baseOpacity: 0.2 + Math.sin(phase * 0.95) * 0.052,
    detailOpacity: 0.13 + Math.cos(phase * 1.55) * 0.04,
    shoreOpacity: 0.24 + Math.sin(phase * 0.7 + 0.4) * 0.036,
  };
}
