"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import Map, { Layer, NavigationControl, Source } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { useMemo, useState } from "react";

import drainageData from "@/data/geojson/drainage-sample.json";
import floodData from "@/data/geojson/flood-sample.json";
import riskZonesData from "@/data/geojson/risk-zones-sample.json";
import type { PlaceItem } from "@/data/places";
import { useFloodStore } from "@/features/flood/store/flood.store";
import { useBuildingLayer } from "@/features/map/hooks/use-building-layer";
import { useMapCursor } from "@/features/map/hooks/use-map-cursor";
import { useMapFlyToPlace } from "@/features/map/hooks/use-map-fly-to-place";
import { useMapViewMode } from "@/features/map/hooks/use-map-view-mode";
import { useSelectedFeatures } from "@/features/map/hooks/use-selected-features";

import { FeaturePopup } from "./feature-popup";
import { MapLegend } from "./map-legend";
import { TimeSlider } from "./time-slider";

type MapLibreMapProps = {
  selectedPlace: PlaceItem | null;
};

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// const MAP_STYLE =
//   "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export function MapLibreMap({ selectedPlace }: MapLibreMapProps) {
  const { mapMode, visibleLayers } = useFloodStore();

  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [time, setTime] = useState(0);

  const is2D = mapMode === "2d";
  const is25D = mapMode === "2.5d";
  const is3D = mapMode === "3d";
  const isExtrusion = is25D || is3D;

  const initialViewState = useMemo(
    () => ({
      longitude: 106.73,
      latitude: 10.82,
      zoom: 11.2,
      pitch: 0,
      bearing: 0,
    }),
    [],
  );

  useBuildingLayer(mapInstance, visibleLayers.buildings, time);
  useMapViewMode(mapInstance, mapMode);
  useMapFlyToPlace(mapInstance, selectedPlace);

  const { cursor, hovered, handleMouseMove, handleMouseLeave } = useMapCursor();

  const {
    selectedFlood,
    selectedBuilding,
    selectedDrainage,
    selectedRiskZone,
    handleClick,
  } = useSelectedFeatures(mapInstance);

  const hoveredId = hovered?.id ?? "";
  const selectedId = selectedFlood?.id ?? "";

  return (
    <div className="relative h-full w-full">
      <Map
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%", cursor }}
        mapStyle={MAP_STYLE}
        maxPitch={85}
        dragRotate={!is2D}
        touchPitch={true}
        interactiveLayerIds={[
          "flood-fill",
          "flood-extrusion",
          "flood-outline",
          "building",
          "building-3d",
          "building-extrusion",
          "drainage-line",
          "risk-zones-fill",
          "risk-zones-outline",
        ]}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onLoad={(event) => setMapInstance(event.target)}
      >
        <NavigationControl position="top-right" />

        {visibleLayers.riskZones && (
          <Source
            id="risk-zones-source"
            type="geojson"
            data={riskZonesData as FeatureCollection}
          >
            <Layer
              id="risk-zones-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "match",
                  ["get", "level"],
                  "high",
                  "#ef4444",
                  "medium",
                  "#f59e0b",
                  "low",
                  "#60a5fa",
                  "#94a3b8",
                ],
                "fill-opacity": 0.18,
              }}
            />
            <Layer
              id="risk-zones-outline"
              type="line"
              paint={{
                "line-color": "#b91c1c",
                "line-width": 1.5,
                "line-dasharray": [2, 2],
              }}
            />
          </Source>
        )}

        {visibleLayers.drainage && (
          <Source
            id="drainage-source"
            type="geojson"
            data={drainageData as FeatureCollection}
          >
            <Layer
              id="drainage-line"
              type="line"
              paint={{
                "line-color": "#0ea5e9",
                "line-width": 3,
                "line-opacity": 0.95,
              }}
            />
          </Source>
        )}

        {visibleLayers.flood && (
          <Source
            id="flood-source"
            type="geojson"
            data={floodData as FeatureCollection}
          >
            {isExtrusion ? (
              <Layer
                id="flood-extrusion"
                type="fill-extrusion"
                paint={{
                  "fill-extrusion-color": [
                    "match",
                    ["get", "severity"],
                    "low",
                    "#60a5fa",
                    "medium",
                    "#f59e0b",
                    "high",
                    "#ef4444",
                    "#60a5fa",
                  ],
                  "fill-extrusion-height": [
                    "*",
                    time,
                    [
                      "interpolate",
                      ["linear"],
                      ["get", "depth"],
                      0,
                      0,
                      0.5,
                      is25D ? 350 : 700,
                      1.2,
                      is25D ? 900 : 1800,
                      2,
                      is25D ? 1400 : 2600,
                    ],
                  ],
                  "fill-extrusion-base": 0,
                  "fill-extrusion-opacity": [
                    "*",
                    time,
                    [
                      "case",
                      ["==", ["get", "id"], selectedId],
                      1,
                      ["==", ["get", "id"], hoveredId],
                      0.98,
                      is3D ? 0.92 : 0.82,
                    ],
                  ],
                }}
              />
            ) : (
              <Layer
                id="flood-fill"
                type="fill"
                paint={{
                  "fill-color": [
                    "match",
                    ["get", "severity"],
                    "low",
                    "#60a5fa",
                    "medium",
                    "#f59e0b",
                    "high",
                    "#ef4444",
                    "#60a5fa",
                  ],
                  "fill-opacity": [
                    "case",
                    ["==", ["get", "id"], selectedId],
                    0.78,
                    ["==", ["get", "id"], hoveredId],
                    0.68,
                    0.5,
                  ],
                }}
              />
            )}

            <Layer
              id="flood-outline"
              type="line"
              paint={{
                "line-color": [
                  "case",
                  ["==", ["get", "id"], selectedId],
                  "#111827",
                  ["==", ["get", "id"], hoveredId],
                  "#1d4ed8",
                  "#0f172a",
                ],
                "line-width": [
                  "case",
                  ["==", ["get", "id"], selectedId],
                  3,
                  ["==", ["get", "id"], hoveredId],
                  2.4,
                  is2D ? 1.2 : 1.6,
                ],
              }}
            />
          </Source>
        )}

        {selectedFlood && (
          <FeaturePopup
            longitude={selectedFlood.lngLat.lng}
            latitude={selectedFlood.lngLat.lat}
            title={selectedFlood.properties.areaName}
            subtitle={selectedFlood.properties.district}
            variant="flood"
            onClose={() => {}}
            fields={[
              {
                label: "Depth",
                value: `${selectedFlood.properties.depth}m`,
                tone: "info",
              },
              {
                label: "Severity",
                value: selectedFlood.properties.severity,
                tone:
                  selectedFlood.properties.severity === "high"
                    ? "danger"
                    : selectedFlood.properties.severity === "medium"
                      ? "warning"
                      : "info",
              },
              {
                label: "Risk score",
                value: selectedFlood.properties.riskScore,
              },
            ]}
          />
        )}

        {selectedBuilding && (
          <FeaturePopup
            longitude={selectedBuilding.lngLat.lng}
            latitude={selectedBuilding.lngLat.lat}
            title="3D Building"
            subtitle="Basemap extrusion"
            variant="building"
            onClose={() => {}}
            fields={[
              {
                label: "Height",
                value: `${selectedBuilding.properties.render_height}m`,
                tone: "info",
              },
              {
                label: "Base",
                value: `${selectedBuilding.properties.render_min_height}m`,
              },
            ]}
          />
        )}

        {selectedDrainage && (
          <FeaturePopup
            longitude={selectedDrainage.lngLat.lng}
            latitude={selectedDrainage.lngLat.lat}
            title={selectedDrainage.properties.name}
            subtitle="Drainage channel"
            variant="drainage"
            onClose={() => {}}
            fields={[
              {
                label: "Status",
                value: selectedDrainage.properties.status,
                tone:
                  selectedDrainage.properties.status === "active"
                    ? "info"
                    : "warning",
              },
              {
                label: "ID",
                value: selectedDrainage.properties.id,
              },
            ]}
          />
        )}

        {selectedRiskZone && (
          <FeaturePopup
            longitude={selectedRiskZone.lngLat.lng}
            latitude={selectedRiskZone.lngLat.lat}
            title={selectedRiskZone.properties.label}
            subtitle="Flood risk classification"
            variant="risk"
            onClose={() => {}}
            fields={[
              {
                label: "Level",
                value: selectedRiskZone.properties.level,
                tone:
                  selectedRiskZone.properties.level === "high"
                    ? "danger"
                    : selectedRiskZone.properties.level === "medium"
                      ? "warning"
                      : "info",
              },
              {
                label: "ID",
                value: selectedRiskZone.properties.id,
              },
            ]}
          />
        )}
      </Map>

      {visibleLayers.flood && <MapLegend />}
      <TimeSlider value={time} onChange={setTime} />

      <div className="pointer-events-none absolute top-4 right-4 rounded-xl bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 shadow backdrop-blur">
        {is2D ? "2D view" : is25D ? "2.5D extrusion" : "3D-lite globe"}
      </div>
    </div>
  );
}
