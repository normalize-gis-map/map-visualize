"use client";

import type { FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";

import floodData from "@/data/geojson/flood-sample.json";
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

import { MapDataLayers } from "./map-data-layers";
import { MapFeatureOverlays } from "./map-feature-overlays";
import { NavigationHud } from "./navigation/navigation-hud";
import { RouteVisualLayers } from "./navigation/route-visual-layers";

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
  const [routePanelOpen, setRoutePanelOpen] = useState(true);
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
  const normalizedProgress = Number.isFinite(navProgress) ? navProgress : 0;
  const safeProgress = Math.min(0.998, Math.max(0, normalizedProgress));
  const progressFadeStart = Math.min(0.999, safeProgress + 0.0005);
  const remainingProgressEnd = Math.min(0.9995, progressFadeStart + 0.018);
  const trafficCars = useMemo(() => {
    if (viewMode !== "drive3d") return [];

    const maxVehicles = mapZoom >= 14 ? 11 : mapZoom >= 12.5 ? 8 : mapZoom >= 11 ? 6 : 4;
    return trafficSamples.slice(0, maxVehicles);
  }, [mapZoom, trafficSamples, viewMode]);

  const resetRouteRuntime = () => {
    pause();
    reset();
    setRoutePanelOpen(false);
    setDrawerMinimalMode(false);
    setMapLibreCar3D(false);
  };

  const handleToggleViewMode = (mode: "map" | "drive3d") => {
    if (mode === "map") {
      resetRouteRuntime();
    }
    setViewMode(mode);
  };

  const handleSwitchToCesium = () => {
    resetRouteRuntime();
    setViewMode("map");
    setMapEngine("cesium");
  };
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

        <MapDataLayers
          visibleLayers={visibleLayers}
          activeFloodData={activeFloodData}
          mapMode={mapMode}
          selectedId={selectedId}
          hoveredId={hoveredId}
        />

        <RouteVisualLayers
          routeCollection={routeCollection}
          viewMode={viewMode}
          safeProgress={safeProgress}
          progressFadeStart={progressFadeStart}
          remainingProgressEnd={remainingProgressEnd}
        />

        <MapFeatureOverlays
          selectedFlood={selectedFlood}
          selectedBuilding={selectedBuilding}
          selectedDrainage={selectedDrainage}
          selectedRiskZone={selectedRiskZone}
          resetSelections={resetSelections}
          activeRoute={activeRoute}
          navCoordinate={navCoordinate}
          navHeading={navHeading}
          navMode={navMode}
          mapLibreCar3D={mapLibreCar3D}
          trafficCars={trafficCars}
        />
      </Map>

      <NavigationHud
        activeRoute={activeRoute}
        routePayload={routePayload}
        mapZoom={mapZoom}
        visibleFloodLegend={visibleLayers.flood}
        routePanelOpen={routePanelOpen}
        setRoutePanelOpen={setRoutePanelOpen}
        navProgress={navProgress}
        navMode={navMode}
        viewMode={viewMode}
        mapLibreCar3D={mapLibreCar3D}
        routeFromLabel={routeFromLabel}
        routeToLabel={routeToLabel}
        etaMinutes={etaMinutes}
        distanceKm={distanceKm}
        activeStepIndex={activeStepIndex}
        isNavigating={isNavigating}
        speedMultiplier={speedMultiplier}
        availableSpeedMultipliers={availableSpeedMultipliers}
        drawerMinimalMode={drawerMinimalMode}
        navCoordinate={navCoordinate}
        onToggleViewMode={handleToggleViewMode}
        onToggleMapLibreCar3D={() => {
          setMapLibreCar3D((prev) => !prev);
          setViewMode("drive3d");
        }}
        onSwitchToCesium={handleSwitchToCesium}
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
          if (mapInstance && activeRoute) {
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

    </div>
  );
}
