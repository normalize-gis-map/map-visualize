"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";

export function useBuildingLayer(
  map: maplibregl.Map | null,
  visible: boolean,
  opacity: number,
) {
  useEffect(() => {
    if (!map) return;

    const applyBuildingStyle = () => {
      const style = map.getStyle();
      if (!style?.layers) return;

      const visibility = visible ? "visible" : "none";
      const buildingLayers = style.layers.filter((layer) =>
        layer.id.toLowerCase().includes("building"),
      );

      buildingLayers.forEach((layer) => {
        const id = layer.id;

        if (!map.getLayer(id)) return;

        map.setLayoutProperty(id, "visibility", visibility);

        if (layer.type === "fill-extrusion") {
          map.setPaintProperty(id, "fill-extrusion-color", "#94a3b8");
          map.setPaintProperty(id, "fill-extrusion-opacity", opacity);
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
            14.8,
            0,
            15.05,
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
  }, [map, visible, opacity]);
}
