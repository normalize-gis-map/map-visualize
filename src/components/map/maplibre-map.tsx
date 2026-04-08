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
  const { mapMode, visibleLayers, buildingOpacity, notifyMapInteraction } =
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
  const glyphFallbackAppliedRef = useRef(false);
  const [routePanelOpen, setRoutePanelOpen] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navProgress, setNavProgress] = useState(0);
  const [navHeading, setNavHeading] = useState(0);
  const navHeadingRef = useRef(0);

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
    if (!mapInstance || glyphFallbackAppliedRef.current) return;

    const style = mapInstance.getStyle();
    if (!style?.glyphs || style.glyphs === MAP_GLYPHS_FALLBACK) return;

    glyphFallbackAppliedRef.current = true;
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
  const routeFromLabel = routePayload?.from.label ?? "Start";
  const routeToLabel = routePayload?.to.label ?? "Destination";
  const etaMinutes = activeRoute
    ? Math.max(1, Math.round(activeRoute.durationSeconds / 60))
    : 0;
  const distanceKm = activeRoute
    ? (activeRoute.distanceMeters / 1000).toFixed(1)
    : "0.0";
  const navCoordinate = useMemo(() => {
    if (!activeRoute) return null;
    const points = activeRoute.geometry.coordinates;
    if (!points.length) return null;

    const scaled = navProgress * (points.length - 1);
    const index = Math.floor(scaled);
    const nextIndex = Math.min(points.length - 1, index + 1);
    const t = scaled - index;
    const [lngA, latA] = points[index];
    const [lngB, latB] = points[nextIndex];
    return [lngA + (lngB - lngA) * t, latA + (latB - latA) * t] as [
      number,
      number,
    ];
  }, [activeRoute, navProgress]);

  const activeStepIndex = useMemo(() => {
    if (!activeRoute?.steps?.length) return 0;
    return Math.min(
      activeRoute.steps.length - 1,
      Math.floor(navProgress * activeRoute.steps.length),
    );
  }, [activeRoute, navProgress]);

  useEffect(() => {
    if (!mapInstance || !activeRoute || !isNavigating) return;
    let frameId = 0;
    let last = performance.now();
    const speed =
      navMode === "car" ? 0.00025 : navMode === "bike" ? 0.00018 : 0.0001;
    const points = activeRoute.geometry.coordinates;

    const animate = (now: number) => {
      const dt = now - last;
      last = now;
      setNavProgress((previousProgress) => {
        const next = Math.min(1, previousProgress + dt * speed);
        if (points.length > 1) {
          const scaled = next * (points.length - 1);
          const index = Math.min(points.length - 2, Math.floor(scaled));
          const [lngA, latA] = points[index];
          const [lngB, latB] = points[index + 1];
          const targetBearing = (Math.atan2(lngB - lngA, latB - latA) * 180) / Math.PI;
          const delta =
            ((((targetBearing - navHeadingRef.current) % 360) + 540) % 360) - 180;
          navHeadingRef.current += delta * 0.16;
          setNavHeading(navHeadingRef.current);
        }

        if (next >= 1) {
          setIsNavigating(false);
        }
        return next;
      });
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [mapInstance, activeRoute, isNavigating, navMode]);

  useEffect(() => {
    if (!mapInstance || !isNavigating || !navCoordinate) return;
    mapInstance.easeTo({
      center: navCoordinate,
      pitch: mapMode === "2.5d" ? 62 : 0,
      bearing: mapMode === "2.5d" ? navHeading : mapInstance.getBearing(),
      duration: 280,
      easing: (t) => t,
    });
  }, [mapInstance, navCoordinate, isNavigating, mapMode, navHeading]);

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
                  {navMode === "car" ? (
                    <Car className="h-4 w-4" />
                  ) : navMode === "bike" ? (
                    <Bike className="h-4 w-4" />
                  ) : (
                    <Footprints className="h-4 w-4" />
                  )}
                </div>
              </Marker>
            ) : null}
          </>
        ) : null}
      </Map>

      {activeRoute && routePayload ? (
        <div className="pointer-events-none absolute top-3 left-1/2 z-20 w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-xl backdrop-blur">
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
            className="absolute bottom-4 left-1/2 z-30 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl"
          >
            <Menu className="h-5 w-5" />
          </button>

          {routePanelOpen ? (
            <div className="absolute right-3 bottom-20 left-3 z-30 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
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

              <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2">
                <div className="text-sm font-semibold text-slate-800">
                  {routeFromLabel} → {routeToLabel}
                </div>
                <div className="text-xs text-slate-600">
                  ETA {etaMinutes} phút • {distanceKm} km
                </div>
              </div>

              {activeRoute.steps.length ? (
                <div className="mb-2 rounded-xl border border-slate-200 bg-white p-2">
                  <p className="mb-1 text-[11px] font-semibold tracking-[0.13em] text-slate-500 uppercase">
                    Turn by turn
                  </p>
                  <ul className="space-y-1">
                    {activeRoute.steps.slice(activeStepIndex, activeStepIndex + 3).map((step) => (
                      <li key={`${step.instruction}-${step.distanceMeters}`} className="text-xs text-slate-700">
                        {step.instruction} • {(step.distanceMeters / 1000).toFixed(2)} km
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (navProgress >= 1) setNavProgress(0);
                    setIsNavigating((prev) => !prev);
                  }}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white"
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
                    setIsNavigating(false);
                    setNavProgress(0);
                    navHeadingRef.current = 0;
                    setNavHeading(0);
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
                  className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700"
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
