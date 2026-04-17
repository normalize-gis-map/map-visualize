"use client";

import type maplibregl from "maplibre-gl";
import { useEffect } from "react";

import type { TimeMode } from "@/features/map/lib/weather/weather-effects";

function buildingPalette(timeMode: TimeMode) {
  if (timeMode === "morning") {
    return {
      base: "#d3d8df",
      mid: "#c6ced8",
      top: "#b6c1cd",
    };
  }
  if (timeMode === "noon") {
    return {
      base: "#e0e6ee",
      mid: "#d3dbe6",
      top: "#c4d0dc",
    };
  }
  if (timeMode === "evening") {
    return {
      base: "#d3c8c0",
      mid: "#c6b8af",
      top: "#b3a59f",
    };
  }
  if (timeMode === "night") {
    return {
      base: "#4a5568",
      mid: "#3f4a5e",
      top: "#374355",
    };
  }

  return {
    base: "#d8dee7",
    mid: "#cad2dd",
    top: "#bcc7d4",
  };
}

export function useBuildingLayer(map: maplibregl.Map | null, visible: boolean, timeMode: TimeMode) {
  useEffect(() => {
    if (!map) return;

    const applyBuildingStyle = () => {
      const style = map.getStyle();
      if (!style?.layers) return;

      const visibility = visible ? "visible" : "none";
      const palette = buildingPalette(timeMode);
      const buildingLayers = style.layers.filter((layer) =>
        layer.id.toLowerCase().includes("building"),
      );

      buildingLayers.forEach((layer) => {
        const id = layer.id;

        if (!map.getLayer(id)) return;

        map.setLayoutProperty(id, "visibility", visibility);

        if (layer.type === "fill-extrusion") {
          map.setPaintProperty(id, "fill-extrusion-color", [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "render_height"], ["get", "height"], 0],
            0,
            palette.base,
            38,
            palette.mid,
            120,
            palette.top,
          ]);
          map.setPaintProperty(id, "fill-extrusion-vertical-gradient", true);
          map.setPaintProperty(id, "fill-extrusion-opacity", 1);
          map.setPaintProperty(id, "fill-extrusion-base", [
            "coalesce",
            ["get", "render_min_height"],
            ["get", "min_height"],
            0,
          ]);
          map.setPaintProperty(id, "fill-extrusion-height", [
            "interpolate",
            ["linear"],
            ["zoom"],
            14.5,
            0,
            14.95,
            [
              "coalesce",
              ["get", "render_height"],
              ["get", "height"],
              ["*", ["coalesce", ["get", "building:levels"], 1], 3],
            ],
          ]);
        }
      });
    };

    applyBuildingStyle();
    map.on("styledata", applyBuildingStyle);

    return () => {
      map.off("styledata", applyBuildingStyle);
    };
  }, [map, timeMode, visible]);
}
