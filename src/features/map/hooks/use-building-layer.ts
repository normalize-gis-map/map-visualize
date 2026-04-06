"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";

export function useBuildingLayer(
  map: maplibregl.Map | null,
  visible: boolean,
  time: number,
) {
  useEffect(() => {
    if (!map) return;

    const style = map.getStyle();
    if (!style?.layers) return;

    const visibility = visible ? "visible" : "none";

    const buildingLayers = style.layers.filter((layer) =>
      layer.id.toLowerCase().includes("building"),
    );

    buildingLayers.forEach((layer) => {
      const id = layer.id;

      if (!map.getLayer(id)) return;

      // toggle visibility
      map.setLayoutProperty(id, "visibility", visibility);

      // apply flood impact coloring
      if (layer.type === "fill-extrusion") {
        map.setPaintProperty(id, "fill-extrusion-color", [
          "case",

          // HIGH
          [">", ["*", ["coalesce", ["get", "render_height"], 10], time], 40],
          "#ef4444",

          // MEDIUM
          [">", ["*", ["coalesce", ["get", "render_height"], 10], time], 20],
          "#f59e0b",

          // LOW
          [">", ["*", ["coalesce", ["get", "render_height"], 10], time], 5],
          "#60a5fa",

          // default
          "#94a3b8",
        ]);

        map.setPaintProperty(id, "fill-extrusion-opacity", [
          "interpolate",
          ["linear"],
          ["*", time, 1],
          0,
          0.2,
          1,
          0.95,
        ]);
      }
    });
  }, [map, visible, time]);
}
