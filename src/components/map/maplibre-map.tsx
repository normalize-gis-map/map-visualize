"use client";

import { Bike, Car, Footprints, Menu, Navigation, Pause, Play } from "lucide-react";
import Map, { Layer, Marker, NavigationControl, Source } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";

import drainageData from "@/data/geojson/drainage-sample.json";
import floodData from "@/data/geojson/flood-sample.json";
import riskZonesData from "@/data/geojson/risk-zones-sample.json";
import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import type { RouteAlternative } from "@/features/map/types/route.types";
import { useMapStore } from "@/features/map/store/map.store";
import {
  MAP_GLYPHS_FALLBACK,
  MAP_STYLE_2D,
  MAP_STYLE_25D,
} from "@/lib/constants/map.constants";
import { useBuildingLayer } from "@/features/map/hooks/use-building-layer";
import { useMapCursor } from "@/features/map/hooks/use-map-cursor";
import { useMapFlyToPlace } from "@/features/map/hooks/use-map-fly-to-place";
import { useMapViewMode } from "@/features/map/hooks/use-map-view-mode";
import { useSelectedFeatures } from "@/features/map/hooks/use-selected-features";
import { useNavigationPlayback } from "@/features/map/navigation/use-navigation-playback";
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

export function MapLibreMap({
  selectedPlace,
  floodData: serverFloodData,
  routePayload,
}: Props) {
  const {
    mapMode,
    visibleLayers,
    buildingOpacity,
    notifyMapInteraction,
    setMapEngine,
  } =
    useMapStore();
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
  const patchedGlyphUrlRef = useRef<string | null>(null);
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "drive3d">("map");
  const [mapLibreCar3D, setMapLibreCar3D] = useState(false);

  useEffect(() => {
    if (!mapInstance || !routePayload) return;
    const activeRoute = routePayload.routes[routePayload.activeIndex];
    const [start, next] = activeRoute.geometry.coordinates;
    const bearing =
      start && next
        ? (Math.atan2(next[0] - start[0], next[1] - start[1]) * 180) / Math.PI
        : 0;

    mapInstance.flyTo({
      center: routePayload.from.center,
      zoom: Math.max(mapInstance.getZoom(), 13),
      pitch: mapMode === "2.5d" ? 62 : 0,
      bearing: mapMode === "2.5d" ? bearing : 0,
      duration: 900,
    });
  }, [mapInstance, routePayload, mapMode]);

  useEffect(() => {
    if (!mapInstance) return;

    const patchStyleGlyphs = () => {
      const style = mapInstance.getStyle();
      if (!style?.glyphs || style.glyphs === MAP_GLYPHS_FALLBACK) return;
      if (patchedGlyphUrlRef.current === style.glyphs) return;

      patchedGlyphUrlRef.current = style.glyphs;
      const patchedLayers = style.layers?.map((layer) => {
        if (
          layer.type !== "symbol" ||
          !layer.layout ||
          !("text-font" in layer.layout)
        ) {
          return layer;
        }

        return {
          ...layer,
          layout: {
            ...layer.layout,
            "text-font": ["Open Sans Regular"],
          },
        };
      });

      mapInstance.setStyle(
        {
          ...style,
          layers: patchedLayers,
          glyphs: MAP_GLYPHS_FALLBACK,
        },
        { diff: true },
      );
    };

    patchStyleGlyphs();
    mapInstance.on("styledata", patchStyleGlyphs);
    return () => {
      mapInstance.off("styledata", patchStyleGlyphs);
    };
  }, [mapInstance, mapMode]);

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

  const activeRoute = routePayload?.routes[routePayload.activeIndex] ?? null;
  const navMode = activeRoute?.mode ?? "car";
  const {
    isPlaying: isNavigating,
    progress: navProgress,
    heading: navHeading,
    navCoordinate,
    trafficSamples,
    activeStepIndex,
    togglePlayback,
    pause,
    reset,
    setProgress,
  } = useNavigationPlayback({
    geometry: activeRoute?.geometry ?? null,
    steps: activeRoute?.steps ?? [],
    mode: navMode,
  });
  const routeFromLabel = routePayload?.from.label ?? "Start";
  const routeToLabel = routePayload?.to.label ?? "Destination";
  const etaMinutes = activeRoute
    ? Math.max(1, Math.round(activeRoute.durationSeconds / 60))
    : 0;
  const distanceKm = activeRoute
    ? (activeRoute.distanceMeters / 1000).toFixed(1)
    : "0.0";
  const trafficCars = useMemo(
    () => (viewMode === "drive3d" ? trafficSamples : []),
    [trafficSamples, viewMode],
  );

  useEffect(() => {
    if (!mapInstance || !isNavigating || !navCoordinate) return;
    mapInstance.easeTo({
      center: navCoordinate,
      pitch: mapMode === "2.5d" ? (viewMode === "drive3d" ? 78 : 62) : 0,
      bearing: mapMode === "2.5d" ? navHeading : mapInstance.getBearing(),
      zoom: viewMode === "drive3d" ? Math.max(mapInstance.getZoom(), 14.5) : undefined,
      duration: viewMode === "drive3d" ? 240 : 280,
      easing: (t) => t,
    });
  }, [mapInstance, navCoordinate, isNavigating, mapMode, navHeading, viewMode]);

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

        {routeCollection ? (
          <Source id="routes" type="geojson" data={routeCollection} lineMetrics>
            <Layer
              id="route-casing"
              type="line"
              paint={{
                "line-color": [
                  "case",
                  ["==", ["get", "isPrimary"], 1],
                  "#0f172a",
                  "#475569",
                ],
                "line-width": [
                  "case",
                  ["==", ["get", "isPrimary"], 1],
                  12,
                  8,
                ],
                "line-opacity": [
                  "case",
                  ["==", ["get", "isPrimary"], 1],
                  0.32,
                  0.12,
                ],
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
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
                  9,
                  5,
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
            <Layer
              id="route-direction-arrows"
              type="symbol"
              filter={["==", ["get", "isPrimary"], 1]}
              layout={{
                "symbol-placement": "line",
                "symbol-spacing": 55,
                "text-field": "▶",
                "text-size": 12,
                "text-keep-upright": false,
                "text-allow-overlap": true,
                "text-ignore-placement": true,
              }}
              paint={{
                "text-color": "#1e40af",
                "text-halo-color": "#ffffff",
                "text-halo-width": 1,
                "text-opacity": 0.95,
              }}
            />
          </Source>
        ) : null}

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

        {activeRoute ? (
          <>
            <Marker
              longitude={activeRoute.geometry.coordinates[0][0]}
              latitude={activeRoute.geometry.coordinates[0][1]}
              anchor="bottom"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-xs font-bold text-white shadow-lg">
                A
              </div>
            </Marker>
            <Marker
              longitude={
                activeRoute.geometry.coordinates[
                  activeRoute.geometry.coordinates.length - 1
                ][0]
              }
              latitude={
                activeRoute.geometry.coordinates[
                  activeRoute.geometry.coordinates.length - 1
                ][1]
              }
              anchor="bottom"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-xs font-bold text-white shadow-lg">
                B
              </div>
            </Marker>
            {navCoordinate ? (
              <Marker
                longitude={navCoordinate[0]}
                latitude={navCoordinate[1]}
                anchor="center"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-lg"
                  style={{ transform: `rotate(${navHeading}deg)` }}
                >
                  {mapLibreCar3D && navMode === "car" ? (
                    <div className="relative h-5 w-5">
                      <div className="absolute inset-x-0 bottom-0 h-3 rounded-[3px] bg-blue-100 shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
                      <div className="absolute inset-x-1 top-0 h-2 rounded-[2px] bg-white/90" />
                      <div className="absolute bottom-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-slate-900" />
                      <div className="absolute right-0.5 bottom-0.5 h-1.5 w-1.5 rounded-full bg-slate-900" />
                    </div>
                  ) : navMode === "car" ? (
                    <Car className="h-4 w-4" />
                  ) : navMode === "bike" ? (
                    <Bike className="h-4 w-4" />
                  ) : (
                    <Footprints className="h-4 w-4" />
                  )}
                </div>
              </Marker>
            ) : null}
            {trafficCars.map((car) => (
              <Marker key={car.id} longitude={car.lng} latitude={car.lat} anchor="center">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-white/70 bg-slate-800/85 text-[10px] text-white shadow-lg"
                  style={{ transform: `rotate(${car.bearing}deg)` }}
                >
                  <div
                    className={`h-4 w-4 rounded-[4px] ${
                      Number(car.id.split("-").pop()) % 2 === 0
                        ? "bg-sky-300"
                        : "bg-rose-300"
                    }`}
                  />
                </div>
              </Marker>
            ))}
          </>
        ) : null}
      </Map>

      {activeRoute && routePayload ? (
        <div className="pointer-events-none absolute top-3 left-1/2 z-20 hidden w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-xl backdrop-blur md:block">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                Navigation
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {routePayload.from.label} → {routePayload.to.label}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-blue-700">
                {etaMinutes} min
              </div>
              <div className="text-xs text-slate-500">{distanceKm} km</div>
            </div>
          </div>
        </div>
      ) : null}

      {activeRoute ? (
        <>
          <button
            type="button"
            onClick={() => setRoutePanelOpen((prev) => !prev)}
            className="absolute bottom-24 left-1/2 z-30 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl md:bottom-4"
          >
            <Menu className="h-5 w-5" />
          </button>

          {routePanelOpen ? (
            <div className="absolute right-2 bottom-20 left-2 z-30 max-h-[52vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur md:right-3 md:bottom-20 md:left-3 md:max-h-[46vh]">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
                  Route drawer
                </p>
                <div className="text-xs text-slate-500">
                  {Math.round(navProgress * 100)}%
                </div>
              </div>

              <div className="mb-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700">
                {navMode === "car" ? (
                  <Car className="h-4 w-4" />
                ) : navMode === "bike" ? (
                  <Bike className="h-4 w-4" />
                ) : (
                  <Footprints className="h-4 w-4" />
                )}
                Chế độ: {navMode === "car" ? "Ô tô" : navMode === "bike" ? "Xe đạp" : "Đi bộ"}
              </div>

              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setViewMode("map")}
                  className={`h-10 rounded-2xl border text-sm font-semibold ${
                    viewMode === "map"
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  Bản đồ thường
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("drive3d")}
                  className={`h-10 rounded-2xl border text-sm font-semibold ${
                    viewMode === "drive3d"
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  Góc nhìn lái xe 3D
                </button>
              </div>

              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setMapLibreCar3D((prev) => !prev);
                    setViewMode("drive3d");
                  }}
                  className={`flex h-10 items-center justify-center rounded-2xl border text-sm font-semibold ${
                    mapLibreCar3D
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {mapLibreCar3D ? "Phase 1: Tắt demo MapLibre" : "Phase 1: Demo MapLibre"}
                </button>
                <button
                  type="button"
                  onClick={() => setMapEngine("cesium")}
                  className="flex h-10 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-sm font-semibold text-violet-700"
                >
                  Phase 2: Cesium cinematic
                </button>
              </div>

              <div className="mb-2 rounded-2xl bg-slate-50 px-3 py-2">
                <div className="text-sm font-semibold text-slate-800">
                  {routeFromLabel} → {routeToLabel}
                </div>
                <div className="text-xs text-slate-600">
                  ETA {etaMinutes} phút • {distanceKm} km
                </div>
              </div>

              {activeRoute.steps.length ? (
                <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="mb-1 text-[11px] font-semibold tracking-[0.13em] text-slate-500 uppercase">
                    Turn by turn
                  </p>
                  <ul className="space-y-1.5">
                    {activeRoute.steps.slice(activeStepIndex, activeStepIndex + 3).map((step) => (
                      <li
                        key={`${step.instruction}-${step.distanceMeters}`}
                        className="rounded-xl bg-slate-50 px-2.5 py-2 text-xs text-slate-700"
                      >
                        {step.instruction}
                        {step.roadName ? ` (${step.roadName})` : ""} •{" "}
                        {(step.distanceMeters / 1000).toFixed(2)} km •{" "}
                        {Math.max(1, Math.round(step.durationSeconds / 60))} phút
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="sticky bottom-0 flex gap-2 bg-white/95 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (navProgress >= 1) setProgress(0);
                    togglePlayback();
                  }}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-semibold text-white"
                >
                  {isNavigating ? (
                    <>
                      <Pause className="h-4 w-4" />
                      Tạm dừng
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Di chuyển
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    pause();
                    reset();
                    if (mapInstance) {
                      const start = activeRoute.geometry.coordinates[0];
                      mapInstance.flyTo({
                        center: [start[0], start[1]],
                        zoom: Math.max(mapInstance.getZoom(), 13),
                        pitch: mapMode === "2.5d" ? 62 : 0,
                        duration: 700,
                      });
                    }
                  }}
                  className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 text-sm font-medium text-slate-700"
                >
                  <Navigation className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {visibleLayers.flood && <MapLegend />}
    </div>
  );
}
