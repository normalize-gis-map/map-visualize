"use client";

import type maplibregl from "maplibre-gl";
import { useEffect } from "react";

type MapMode = "2d" | "2.5d" | "3d";

export function useMapViewMode(map: maplibregl.Map | null, mode: MapMode) {
  useEffect(() => {
    if (!map) return;

    if (mode === "2d") {
      map.setProjection({ type: "mercator" });
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 700,
      });

      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
      return;
    }

    if (mode === "2.5d") {
      map.setProjection({ type: "mercator" });
      map.easeTo({
        pitch: 32,
        bearing: -14,
        duration: 900,
      });

      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
    }
  }, [map, mode]);
}
