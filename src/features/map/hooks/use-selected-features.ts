"use client";

import { useState } from "react";
import type maplibregl from "maplibre-gl";

import {
  normalizeProperties,
  type NormalizedProperties,
} from "@/utils/normalize-properties";

export type SelectedFeature = {
  id: string;
  lngLat: maplibregl.LngLat;
  properties: NormalizedProperties;
};

export function useSelectedFeatures(map: maplibregl.Map | null) {
  const [selectedFlood, setSelectedFlood] = useState<SelectedFeature | null>(
    null,
  );
  const [selectedBuilding, setSelectedBuilding] =
    useState<SelectedFeature | null>(null);
  const [selectedDrainage, setSelectedDrainage] =
    useState<SelectedFeature | null>(null);
  const [selectedRiskZone, setSelectedRiskZone] =
    useState<SelectedFeature | null>(null);

  const resetSelections = () => {
    setSelectedFlood(null);
    setSelectedBuilding(null);
    setSelectedDrainage(null);
    setSelectedRiskZone(null);
  };

  const layerMap = {
    flood: setSelectedFlood,
    building: setSelectedBuilding,
    drainage: setSelectedDrainage,
    risk: setSelectedRiskZone,
  } as const;

  const handleClick = (e: maplibregl.MapLayerMouseEvent) => {
    if (!map) return;

    const features = map.queryRenderedFeatures(e.point);

    if (!features.length) {
      resetSelections();
      return;
    }

    const feature = features[0];
    const layerId = feature.layer.id;

    const selected: SelectedFeature = {
      id: feature.id?.toString() ?? "",
      lngLat: e.lngLat,
      properties: normalizeProperties(
        (feature.properties ?? {}) as Record<string, unknown>,
      ),
    };

    resetSelections();

    const matchedKey = Object.keys(layerMap).find((key) =>
      layerId.includes(key),
    ) as keyof typeof layerMap | undefined;

    if (matchedKey) {
      layerMap[matchedKey](selected);
    }
  };

  return {
    selectedFlood,
    selectedBuilding,
    selectedDrainage,
    selectedRiskZone,
    handleClick,
    resetSelections,
  };
}
