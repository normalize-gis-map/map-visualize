"use client";

import Map, { Layer, NavigationControl, Source } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { useEffect, useMemo, useState } from "react";

import drainageData from "@/data/geojson/drainage-sample.json";
import floodData from "@/data/geojson/flood-sample.json";
import riskZonesData from "@/data/geojson/risk-zones-sample.json";
import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import type { RouteAlternative } from "@/features/map/types/route.types";
import { useFloodStore } from "@/features/flood/store/flood.store";
import { useBuildingLayer } from "@/features/map/hooks/use-building-layer";
import { useMapCursor } from "@/features/map/hooks/use-map-cursor";
import { useMapFlyToPlace } from "@/features/map/hooks/use-map-fly-to-place";
import { useMapViewMode } from "@/features/map/hooks/use-map-view-mode";
import { useSelectedFeatures } from "@/features/map/hooks/use-selected-features";
import {
  formatMeters,
  formatScore,
  formatSeverityTone,
  formatStatusTone,
  formatLevelTone,
} from "@/utils/formatters";

import { FeaturePopup } from "./feature-popup";
import { MapLegend } from "./map-legend";

type Props = {
  selectedPlace: PlaceItem | null;
  floodData: FloodGeoJson | null;
  routePayload: {
    from: PlaceItem;
    to: PlaceItem;
    routes: RouteAlternative[];
    activeIndex: number;
  } | null;
};

const MAP_STYLE_2D =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const MAP_STYLE_25D = "https://tiles.openfreemap.org/styles/liberty";

export function MapLibreMap({
  selectedPlace,
  floodData: serverFloodData,
  routePayload,
}: Props) {
  const { mapMode, visibleLayers, buildingOpacity, notifyMapInteraction } =
    useFloodStore();
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const activeFloodData =
    (serverFloodData as FeatureCollection | null) ??
    (floodData as FeatureCollection);

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

  useBuildingLayer(mapInstance, visibleLayers.buildings, buildingOpacity);
  useMapViewMode(mapInstance, mapMode);
  useMapFlyToPlace(mapInstance, selectedPlace);

  const { cursor, hovered, handleMouseMove, handleMouseLeave } = useMapCursor();

  const {
    selectedFlood,
    selectedBuilding,
    selectedDrainage,
    selectedRiskZone,
    handleClick,
    resetSelections,
  } = useSelectedFeatures(mapInstance);

  const hoveredId = hovered?.id ?? "";
  const selectedId = selectedFlood?.id ?? "";

  useEffect(() => {
    if (!mapInstance || !visibleLayers.drainage) return;

    let frameId = 0;
    let alive = true;
    const start = performance.now();

    const animate = (time: number) => {
      if (!alive || !mapInstance.getLayer("drainage-line")) return;
      const phase = ((time - start) / 1200) % 1;

      mapInstance.setPaintProperty("drainage-line", "line-dasharray", [
        0.2,
        1.2,
        1.1 + phase * 1.5,
      ]);
      mapInstance.triggerRepaint();
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      alive = false;
      cancelAnimationFrame(frameId);
      if (mapInstance.getLayer("drainage-line")) {
        mapInstance.setPaintProperty("drainage-line", "line-dasharray", [1, 0]);
      }
    };
  }, [mapInstance, visibleLayers.drainage]);

  useEffect(() => {
    if (!mapInstance || !routePayload) return;
    const activeRoute = routePayload.routes[routePayload.activeIndex];
    if (!activeRoute?.geometry.coordinates.length) return;

    let minLng = Number.POSITIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;

    for (const [lng, lat] of activeRoute.geometry.coordinates) {
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }

    mapInstance.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 80, duration: 900 },
    );
  }, [mapInstance, routePayload]);

  const routeCollection: FeatureCollection | null = routePayload
    ? {
        type: "FeatureCollection",
        features: routePayload.routes.map((route, index) => ({
          type: "Feature",
          geometry: route.geometry,
          properties: {
            routeId: route.id,
            isPrimary: index === routePayload.activeIndex ? 1 : 0,
          },
        })),
      }
    : null;

  return (
    <div className="map-shell relative h-full w-full">
      <Map
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%", cursor }}
        mapStyle={mapMode === "2d" ? MAP_STYLE_2D : MAP_STYLE_25D}
        maxPitch={85}
        dragRotate={mapMode !== "2d"}
        interactiveLayerIds={[
          "flood-fill",
          "flood-extrusion",
          "flood-outline",
          "building",
          "building-3d",
          "building-extrusion",
          "drainage-line",
          "risk-zones-fill",
        ]}
        onClick={(event) => {
          notifyMapInteraction();
          handleClick(event);
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMoveStart={notifyMapInteraction}
        onDragStart={notifyMapInteraction}
        onZoomStart={notifyMapInteraction}
        onRotateStart={notifyMapInteraction}
        onLoad={(e) => setMapInstance(e.target)}
      >
        <NavigationControl position="bottom-right" />

        {routeCollection ? (
          <Source id="routes" type="geojson" data={routeCollection}>
            <Layer
              id="route-alternatives"
              type="line"
              paint={{
                "line-color": [
                  "case",
                  ["==", ["get", "isPrimary"], 1],
                  "#1d4ed8",
                  "#93c5fd",
                ],
                "line-width": [
                  "case",
                  ["==", ["get", "isPrimary"], 1],
                  6,
                  4,
                ],
                "line-opacity": [
                  "case",
                  ["==", ["get", "isPrimary"], 1],
                  0.95,
                  0.45,
                ],
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
        ) : null}

        {visibleLayers.riskZones && (
          <Source
            id="risk-zones"
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
          </Source>
        )}

        {visibleLayers.drainage && (
          <Source
            id="drainage"
            type="geojson"
            data={drainageData as FeatureCollection}
          >
          <Layer
            id="drainage-line"
            type="line"
            layout={{ "line-cap": "round", "line-join": "round" }}
            paint={{
              "line-color": "#0ea5e9",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                9,
                1.6,
                15,
                4.5,
              ],
              "line-opacity": 0.8,
              "line-blur": 0.25,
              "line-dasharray": [1, 0],
            }}
          />
          </Source>
        )}

        {visibleLayers.flood && (
          <Source
            id="flood"
            type="geojson"
            data={activeFloodData}
          >
            {mapMode === "2.5d" ? (
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
                    "interpolate",
                    ["linear"],
                    ["get", "depth"],
                    0,
                    0,
                    2,
                    1200,
                  ],
                  "fill-extrusion-opacity": [
                    "case",
                    ["==", ["get", "id"], selectedId],
                    1,
                    ["==", ["get", "id"], hoveredId],
                    0.95,
                    0.8,
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
                  0.68,
                  ["==", ["get", "id"], hoveredId],
                  0.58,
                  0.42,
                ],
              }}
            />
            )}

            <Layer
              id="flood-outline"
              type="line"
              paint={{
                "line-color": "#1e293b",
                "line-width": 1.5,
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
            onClose={resetSelections}
            anchor={selectedFlood.anchor}
            fields={[
              {
                label: "Depth",
                value: formatMeters(selectedFlood.properties.depth),
                tone: "info",
              },
              {
                label: "Severity",
                value: selectedFlood.properties.severity,
                tone: formatSeverityTone(selectedFlood.properties.severity),
              },
              {
                label: "Risk score",
                value: formatScore(selectedFlood.properties.riskScore),
              },
            ]}
          />
        )}

        {selectedBuilding && (
          <FeaturePopup
            longitude={selectedBuilding.lngLat.lng}
            latitude={selectedBuilding.lngLat.lat}
            title="Building"
            subtitle="3D extrusion"
            variant="building"
            onClose={resetSelections}
            anchor={selectedBuilding.anchor}
            fields={[
              {
                label: "Height",
                value: formatMeters(selectedBuilding.properties.render_height),
                tone: "info",
              },
              {
                label: "Base",
                value: formatMeters(
                  selectedBuilding.properties.render_min_height,
                ),
              },
            ]}
          />
        )}

        {selectedDrainage && (
          <FeaturePopup
            longitude={selectedDrainage.lngLat.lng}
            latitude={selectedDrainage.lngLat.lat}
            title="Drainage"
            subtitle="Water channel"
            variant="drainage"
            onClose={resetSelections}
            anchor={selectedDrainage.anchor}
            fields={[
              {
                label: "Status",
                value: selectedDrainage.properties.status,
                tone: formatStatusTone(selectedDrainage.properties.status),
              },
            ]}
          />
        )}

        {selectedRiskZone && (
          <FeaturePopup
            longitude={selectedRiskZone.lngLat.lng}
            latitude={selectedRiskZone.lngLat.lat}
            title={selectedRiskZone.properties.label}
            subtitle="Flood risk"
            variant="risk"
            onClose={resetSelections}
            anchor={selectedRiskZone.anchor}
            fields={[
              {
                label: "Level",
                value: selectedRiskZone.properties.level,
                tone: formatLevelTone(selectedRiskZone.properties.level),
              },
            ]}
          />
        )}
      </Map>

      {visibleLayers.flood && <MapLegend />}
    </div>
  );
}
