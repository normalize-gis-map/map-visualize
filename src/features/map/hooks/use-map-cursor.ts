"use client";

import { useState } from "react";
import type maplibregl from "maplibre-gl";

export function useMapCursor() {
  const [cursor, setCursor] = useState("grab");
  const [hovered, setHovered] = useState<any>(null);

  const handleMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
    if (e.features && e.features.length > 0) {
      setCursor("zoom-in");
      setHovered(e.features[0]);
    } else {
      setCursor("grab");
      setHovered(null);
    }
  };

  const handleMouseLeave = () => {
    setCursor("grab");
    setHovered(null);
  };

  return {
    cursor,
    hovered,
    handleMouseMove,
    handleMouseLeave,
  };
}
