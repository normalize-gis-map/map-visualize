"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";

type MapMode = "2d" | "2.5d" | "3d";

type ViewConfig = {
  projection: "mercator" | "globe";
  pitch: number;
  bearing: number;
  duration: number;
};

const VIEW_CONFIG: Record<MapMode, ViewConfig> = {
  "2d": {
    projection: "mercator",
    pitch: 0,
    bearing: 0,
    duration: 700,
  },
  "2.5d": {
    projection: "mercator",
    pitch: 48,
    bearing: -10,
    duration: 900,
  },
  "3d": {
    projection: "globe",
    pitch: 70,
    bearing: -30,
    duration: 1000,
  },
};

export function useMapViewMode(map: maplibregl.Map | null, mode: MapMode) {
  useEffect(() => {
    if (!map) return;

    const config = VIEW_CONFIG[mode];

    map.setProjection({ type: config.projection });
    map.easeTo({
      pitch: config.pitch,
      bearing: config.bearing,
      duration: config.duration,
    });
  }, [map, mode]);
}
