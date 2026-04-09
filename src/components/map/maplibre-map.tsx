"use client";

import type { FeatureCollection } from "geojson";
import { Menu } from "lucide-react";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, NavigationControl, Source } from "react-map-gl/maplibre";

import drainageData from "@/data/geojson/drainage-sample.json";
import floodData from "@/data/geojson/flood-sample.json";
import riskZonesData from "@/data/geojson/risk-zones-sample.json";
import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import { useBuildingLayer } from "@/features/map/hooks/use-building-layer";
import { useMapCursor } from "@/features/map/hooks/use-map-cursor";
import { useMapFlyToPlace } from "@/features/map/hooks/use-map-fly-to-place";
import { useMapViewMode } from "@/features/map/hooks/use-map-view-mode";
import { useSelectedFeatures } from "@/features/map/hooks/use-selected-features";
import { useNavigationPlayback } from "@/features/map/navigation/use-navigation-playback";
import { useMapStore } from "@/features/map/store/map.store";
import type { RouteAlternative } from "@/features/map/types/route.types";
import {
  MAP_GLYPHS_FALLBACK,
  MAP_STYLE_2D,
  MAP_STYLE_25D,
} from "@/lib/constants/map.constants";
import {
  formatMeters,
  formatScore,
  formatSeverityTone,
  formatStatusTone,
  formatLevelTone,
} from "@/utils/formatters";

import { FeaturePopup } from "./feature-popup";
import { MapLegend } from "./map-legend";
import { RouteDrawer } from "./navigation/route-drawer";
import { RouteMarkers } from "./navigation/route-markers";

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
  const [mapZoom, setMapZoom] = useState(11.2);
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
  const [drawerMinimalMode, setDrawerMinimalMode] = useState(false);
  const programmaticMoveRef = useRef(false);

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
    seek,
    speedMultiplier,
    availableSpeedMultipliers,
    setSpeedMultiplier,
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
  const remainingProgressEnd = Math.min(1, navProgress + 0.018);
  const trafficCars = useMemo(() => {
    if (viewMode !== "drive3d") return [];

    const maxVehicles = mapZoom >= 14 ? 11 : mapZoom >= 12.5 ? 8 : mapZoom >= 11 ? 6 : 4;
    return trafficSamples.slice(0, maxVehicles);
  }, [mapZoom, trafficSamples, viewMode]);
  const miniRouteCollection: FeatureCollection | null = activeRoute
    ? {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: activeRoute.geometry,
            properties: {},
          },
        ],
      }
    : null;
  const miniNavCollection: FeatureCollection | null = navCoordinate
    ? {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: navCoordinate,
            },
            properties: {},
          },
        ],
      }
    : null;

  useEffect(() => {
    if (!mapInstance || !isNavigating || !navCoordinate) return;
    programmaticMoveRef.current = true;
    mapInstance.once("moveend", () => {
      programmaticMoveRef.current = false;
    });
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
        onDragStart={() => {
          if (!programmaticMoveRef.current) notifyMapInteraction();
        }}
        onMove={(event) => setMapZoom(event.viewState.zoom)}
        onLoad={(e) => {
          setMapInstance(e.target);
          setMapZoom(e.target.getZoom());
        }}
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
                  viewMode === "drive3d" ? 0.08 : 0.32,
                  viewMode === "drive3d" ? 0 : 0.12,
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
                  viewMode === "drive3d" ? 0 : 0.95,
                  viewMode === "drive3d" ? 0 : 0.45,
                ],
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
            <Layer
              id="route-glow"
              type="line"
              filter={["==", ["get", "isPrimary"], 1]}
              paint={{
                "line-color": "#60a5fa",
                "line-width": 20,
                "line-opacity": 0.12,
                "line-blur": 1.1,
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
            <Layer
              id="route-progress-highlight"
              type="line"
              filter={["==", ["get", "isPrimary"], 1]}
              paint={{
                "line-gradient": [
                  "interpolate",
                  ["linear"],
                  ["line-progress"],
                  0,
                  "rgba(56,189,248,0)",
                  navProgress,
                  "rgba(56,189,248,0)",
                  navProgress,
                  "#38bdf8",
                  remainingProgressEnd,
                  "#38bdf8",
                  1,
                  "rgba(125,211,252,0.75)",
                ],
                "line-width": 10,
                "line-opacity": 1,
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
                "text-opacity": viewMode === "drive3d" ? 0 : 0.95,
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
          <RouteMarkers
            coordinates={activeRoute.geometry.coordinates}
            navCoordinate={navCoordinate}
            navHeading={navHeading}
            navMode={navMode}
            mapLibreCar3D={mapLibreCar3D}
            trafficCars={trafficCars}
          />
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

          <RouteDrawer
            routePanelOpen={routePanelOpen}
            navProgress={navProgress}
            navMode={navMode}
            viewMode={viewMode}
            mapLibreCar3D={mapLibreCar3D}
            routeFromLabel={routeFromLabel}
            routeToLabel={routeToLabel}
            etaMinutes={etaMinutes}
            distanceKm={distanceKm}
            steps={activeRoute.steps}
            activeStepIndex={activeStepIndex}
            isNavigating={isNavigating}
            speedMultiplier={speedMultiplier}
            availableSpeedMultipliers={availableSpeedMultipliers}
            drawerMinimalMode={drawerMinimalMode}
            onToggleViewMode={setViewMode}
            onToggleMapLibreCar3D={() => {
              setMapLibreCar3D((prev) => !prev);
              setViewMode("drive3d");
            }}
            onSwitchToCesium={() => setMapEngine("cesium")}
            onTogglePlayback={() => {
              if (navProgress >= 1) seek(0);
              togglePlayback();
            }}
            onSeek={seek}
            onSetSpeed={setSpeedMultiplier}
            onToggleMinimalMode={() => setDrawerMinimalMode((prev) => !prev)}
            onReset={() => {
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
          />
        </>
      ) : null}

      {visibleLayers.flood && <MapLegend />}

      {viewMode === "drive3d" && activeRoute && miniRouteCollection ? (
        <div className="absolute right-3 bottom-3 z-30 hidden h-36 w-28 overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-2xl backdrop-blur md:block">
          <Map
            initialViewState={{
              longitude: routePayload?.from.center[0] ?? 106.73,
              latitude: routePayload?.from.center[1] ?? 10.82,
              zoom: 13,
              pitch: 0,
              bearing: 0,
            }}
            mapStyle={MAP_STYLE_2D}
            interactive={false}
            dragPan={false}
            doubleClickZoom={false}
            scrollZoom={false}
            touchZoomRotate={false}
            longitude={navCoordinate?.[0] ?? routePayload?.from.center[0] ?? 106.73}
            latitude={navCoordinate?.[1] ?? routePayload?.from.center[1] ?? 10.82}
            zoom={navCoordinate ? Math.max(12.5, mapZoom - 1.6) : 13}
            pitch={0}
            bearing={0}
            style={{ width: "100%", height: "100%" }}
          >
            <Source id="mini-route" type="geojson" data={miniRouteCollection}>
              <Layer
                id="mini-route-line"
                type="line"
                paint={{
                  "line-color": "#2563eb",
                  "line-width": 3.2,
                  "line-opacity": 0.9,
                }}
                layout={{ "line-cap": "round", "line-join": "round" }}
              />
            </Source>
            {miniNavCollection ? (
              <Source id="mini-nav" type="geojson" data={miniNavCollection}>
                <Layer
                  id="mini-nav-dot"
                  type="circle"
                  paint={{
                    "circle-radius": 4.8,
                    "circle-color": "#f43f5e",
                    "circle-stroke-width": 1.4,
                    "circle-stroke-color": "#ffffff",
                  }}
                />
              </Source>
            ) : null}
          </Map>
        </div>
      ) : null}
    </div>
  );
}
