"use client";

import { useState } from "react";
import type maplibregl from "maplibre-gl";
import {
  DEFAULT_MAP_CURSOR,
  INSPECT_FEATURE_CURSOR,
} from "@/lib/constants/cursor.constants";

export function useMapCursor() {
  const [cursor, setCursor] = useState(DEFAULT_MAP_CURSOR);
  const [hovered, setHovered] = useState<any>(null);

  const handleMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
    if (e.features && e.features.length > 0) {
      const topFeature = e.features[0];
      const layerId = topFeature.layer.id.toLowerCase();
      const isBuilding = layerId.includes("building");

      setCursor(isBuilding ? INSPECT_FEATURE_CURSOR : "pointer");
      setHovered(topFeature);
    } else {
      setCursor(DEFAULT_MAP_CURSOR);
      setHovered(null);
    }
  };

  const handleMouseLeave = () => {
    setCursor(DEFAULT_MAP_CURSOR);
    setHovered(null);
  };

  return {
    cursor,
    hovered,
    handleMouseMove,
    handleMouseLeave,
  };
}
