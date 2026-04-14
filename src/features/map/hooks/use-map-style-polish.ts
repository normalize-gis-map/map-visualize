"use client";

import type maplibregl from "maplibre-gl";
import { useEffect } from "react";

export function useMapStylePolish(map: maplibregl.Map | null) {
  useEffect(() => {
    if (!map) return;

    const apply = () => {
      const style = map.getStyle();
      if (!style?.layers) return;

      for (const layer of style.layers) {
        if (!map.getLayer(layer.id)) continue;

        const id = layer.id.toLowerCase();
        const isRoadLine = layer.type === "line" && id.includes("road");
        const isRoadCasing =
          isRoadLine && (id.includes("casing") || id.includes("outline"));

        if (isRoadCasing) {
          map.setPaintProperty(layer.id, "line-color", "#6b7280");
          map.setPaintProperty(layer.id, "line-opacity", 0.72);
          continue;
        }

        if (isRoadLine) {
          map.setPaintProperty(layer.id, "line-color", "#374151");
          map.setPaintProperty(layer.id, "line-opacity", 0.92);
          map.setPaintProperty(layer.id, "line-width", [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            0.9,
            13,
            2.2,
            16,
            5.8,
          ]);
        }

        const isLabel = layer.type === "symbol" && id.includes("label");
        if (isLabel) {
          map.setPaintProperty(layer.id, "text-color", "#111827");
          map.setPaintProperty(layer.id, "text-halo-color", "#ffffff");
          map.setPaintProperty(layer.id, "text-halo-width", 0.8);
          map.setPaintProperty(layer.id, "text-opacity", 0.78);
        }
      }
    };

    apply();
    map.on("styledata", apply);

    return () => {
      map.off("styledata", apply);
    };
  }, [map]);
}
