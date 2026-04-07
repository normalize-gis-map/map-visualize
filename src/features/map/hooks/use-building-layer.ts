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
        map.setPaintProperty(id, "fill-extrusion-opacity", opacity);
      }
    });
  }, [map, visible, opacity]);
}
