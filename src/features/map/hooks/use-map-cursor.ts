"use client";

import { useCallback, useState } from "react";

import type { MapLayerMouseEvent } from "react-map-gl/maplibre";

type HoveredFeature = {
  id: string;
};

export function useMapCursor() {
  const [cursor, setCursor] = useState("");
  const [hovered, setHovered] = useState<HoveredFeature | null>(null);

  const handleMouseMove = useCallback((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];

    if (!feature?.properties) {
      setHovered(null);
      setCursor("");
      return;
    }

    if (
      feature.layer.id.includes("building") ||
      feature.layer.id === "drainage-line" ||
      feature.layer.id === "risk-zones-fill" ||
      feature.layer.id === "risk-zones-outline"
    ) {
      setHovered(null);
      setCursor("pointer");
      return;
    }

    const id =
      (feature.properties.id as string | undefined) ??
      `${feature.properties.areaName}-${feature.properties.district}`;

    setHovered({ id });
    setCursor("pointer");
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(null);
    setCursor("");
  }, []);

  return {
    cursor,
    hovered,
    handleMouseMove,
    handleMouseLeave,
  };
}
