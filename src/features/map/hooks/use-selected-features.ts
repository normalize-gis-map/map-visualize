"use client";

import { useCallback, useState } from "react";

import type maplibregl from "maplibre-gl";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";

type SelectedFlood = {
  id: string;
  lngLat: { lng: number; lat: number };
  properties: {
    areaName: string;
    district: string;
    depth: number;
    severity: string;
    riskScore: number;
  };
};

type SelectedBuilding = {
  lngLat: { lng: number; lat: number };
  properties: {
    render_height: number;
    render_min_height: number;
  };
};

type SelectedDrainage = {
  lngLat: { lng: number; lat: number };
  properties: {
    id: string;
    name: string;
    status: string;
  };
};

type SelectedRiskZone = {
  lngLat: { lng: number; lat: number };
  properties: {
    id: string;
    label: string;
    level: string;
  };
};

export function useSelectedFeatures(map: maplibregl.Map | null) {
  const [selectedFlood, setSelectedFlood] = useState<SelectedFlood | null>(
    null,
  );
  const [selectedBuilding, setSelectedBuilding] =
    useState<SelectedBuilding | null>(null);
  const [selectedDrainage, setSelectedDrainage] =
    useState<SelectedDrainage | null>(null);
  const [selectedRiskZone, setSelectedRiskZone] =
    useState<SelectedRiskZone | null>(null);

  const resetSelections = useCallback(() => {
    setSelectedFlood(null);
    setSelectedBuilding(null);
    setSelectedDrainage(null);
    setSelectedRiskZone(null);
  }, []);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const features = event.features;

      if (!features?.length) {
        resetSelections();
        return;
      }

      const feature = features[0];
      if (!feature?.properties) {
        resetSelections();
        return;
      }

      resetSelections();

      if (feature.layer.id.includes("building")) {
        setSelectedBuilding({
          lngLat: {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          },
          properties: {
            render_height: Number(feature.properties.render_height ?? 0),
            render_min_height: Number(
              feature.properties.render_min_height ?? 0,
            ),
          },
        });
        return;
      }

      if (feature.layer.id === "drainage-line") {
        setSelectedDrainage({
          lngLat: {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          },
          properties: {
            id: String(feature.properties.id ?? ""),
            name: String(feature.properties.name ?? "Drainage"),
            status: String(feature.properties.status ?? "unknown"),
          },
        });
        return;
      }

      if (
        feature.layer.id === "risk-zones-fill" ||
        feature.layer.id === "risk-zones-outline"
      ) {
        setSelectedRiskZone({
          lngLat: {
            lng: event.lngLat.lng,
            lat: event.lngLat.lat,
          },
          properties: {
            id: String(feature.properties.id ?? ""),
            label: String(feature.properties.label ?? "Risk Zone"),
            level: String(feature.properties.level ?? "unknown"),
          },
        });
        return;
      }

      const id =
        (feature.properties.id as string | undefined) ??
        `${feature.properties.areaName}-${feature.properties.district}`;

      setSelectedFlood({
        id,
        lngLat: {
          lng: event.lngLat.lng,
          lat: event.lngLat.lat,
        },
        properties: {
          areaName: String(feature.properties.areaName ?? "Flood Area"),
          district: String(feature.properties.district ?? "-"),
          depth: Number(feature.properties.depth ?? 0),
          severity: String(feature.properties.severity ?? "unknown"),
          riskScore: Number(feature.properties.riskScore ?? 0),
        },
      });

      if (map) {
        map.easeTo({
          center: [event.lngLat.lng, event.lngLat.lat],
          duration: 900,
          zoom: Math.max(map.getZoom(), 12.5),
        });
      }
    },
    [map, resetSelections],
  );

  return {
    selectedFlood,
    selectedBuilding,
    selectedDrainage,
    selectedRiskZone,
    handleClick,
    resetSelections,
  };
}
