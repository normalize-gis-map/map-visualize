export function getWaterPaint(detailPreset: "balanced" | "high") {
  return {
    tone: {
      "fill-color": ["interpolate", ["linear"], ["zoom"], 9, "#6aa7cf", 13, "#5e9bc8", 17, "#4c88b7"],
      "fill-opacity": ["interpolate", ["linear"], ["zoom"], 9, 0.14, 13, 0.2, 17, 0.27],
    },
    shore: {
      "line-color": "#c1dff3",
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.12, 14, 0.2, 18, 0.28],
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.35, 15, 0.8, 19, 1.25],
    },
    base: {
      "line-color": "#d7efff",
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        9,
        detailPreset === "high" ? 0.12 : 0.08,
        14,
        detailPreset === "high" ? 0.2 : 0.14,
        18,
        detailPreset === "high" ? 0.28 : 0.2,
      ],
      "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.35, 14, 0.7, 17, 1.05, 20, 1.45],
      "line-dasharray": [1, 2],
    },
    detail: {
      "line-color": "#f6fcff",
      "line-opacity": detailPreset === "high" ? 0.15 : 0.1,
      "line-width": ["interpolate", ["linear"], ["zoom"], 15, 0.45, 18, 0.9, 20, 1.2],
      "line-dasharray": [0.35, 0.9],
    },
  };
}

export function getAnimatedWaterOpacities(phase: number) {
  return {
    baseOpacity: 0.16 + Math.sin(phase) * 0.045,
    detailOpacity: 0.1 + Math.cos(phase * 1.4) * 0.035,
    shoreOpacity: 0.2 + Math.sin(phase * 0.75) * 0.03,
  };
}
