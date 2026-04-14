"use client";

import type { FeatureCollection, Position } from "geojson";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";

import floodData from "@/data/geojson/flood-sample.json";
import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import { useAmbientTraffic } from "@/features/map/hooks/use-ambient-traffic";
import { useBuildingLayer } from "@/features/map/hooks/use-building-layer";
import { useMapCursor } from "@/features/map/hooks/use-map-cursor";
import { useMapFlyToPlace } from "@/features/map/hooks/use-map-fly-to-place";
import { useMapViewMode } from "@/features/map/hooks/use-map-view-mode";
import { useSelectedFeatures } from "@/features/map/hooks/use-selected-features";
import { applyF4InspiredMapStyle } from "@/features/map/lib/apply-f4-inspired-map-style";
import { useNavigationPlayback } from "@/features/map/navigation/use-navigation-playback";
import { useMapStore } from "@/features/map/store/map.store";
import type { RouteAlternative } from "@/features/map/types/route.types";
import {
  MAP_25D_DEFAULT_BEARING,
  MAP_25D_DEFAULT_PITCH,
  MAP_25D_FAR_PITCH,
  MAP_25D_NEAR_PITCH,
  MAP_GLYPHS_FALLBACK,
  MAP_STYLE_2D,
  MAP_STYLE_25D,
  TRAFFIC_MAX_SCALE,
  TRAFFIC_MIN_SCALE,
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
  onRouteClear: () => void;
};

export function MapLibreMap({
  selectedPlace,
  floodData: serverFloodData,
  routePayload,
  onRouteClear,
}: Props) {
  const {
    mapMode,
    visibleLayers,
    buildingOpacity,
    trafficVisualizationEnabled,
    toggleTrafficVisualization,
    notifyMapInteraction,
    setMapEngine,
  } = useMapStore();
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [mapZoom, setMapZoom] = useState(11.2);
  const [mapBearing, setMapBearing] = useState(0);
  const [mapBounds, setMapBounds] = useState<{
    west: number;
    south: number;
    east: number;
    north: number;
  } | null>(null);
  const [cameraDistanceMeters, setCameraDistanceMeters] = useState<
    number | null
  >(null);
  const activeFloodData =
    (serverFloodData as FeatureCollection | null) ??
    (floodData as FeatureCollection);

  const initialViewState = useMemo(
    () => ({
      longitude: 106.73,
      latitude: 10.82,
      zoom: 11.8,
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
  const [driveTiltDeg, setDriveTiltDeg] = useState(78);
  const [ambientNetworkRoutes, setAmbientNetworkRoutes] = useState<
    Position[][]
  >([]);
  const programmaticMoveRef = useRef(false);
  const cameraPitchBucketRef = useRef<string | null>(null);
  const followTickRef = useRef(0);
  const lastFollowCenterRef = useRef<[number, number] | null>(null);

  const estimateBoundsWidthMeters = (bounds: maplibregl.LngLatBounds) => {
    const west = bounds.getWest();
    const east = bounds.getEast();
    const lat = (bounds.getNorth() + bounds.getSouth()) / 2;
    const deltaLng = Math.abs(east - west);
    const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);
    return Math.max(0, deltaLng * metersPerDegLng);
  };

  const applyMapVisualStyle = useCallback((map: maplibregl.Map) => {
    applyF4InspiredMapStyle(map);
  }, []);

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

    const refreshPremiumStyle = () => {
      patchStyleGlyphs();
      applyMapVisualStyle(mapInstance);
    };

    refreshPremiumStyle();
    mapInstance.on("styledata", refreshPremiumStyle);

    return () => {
      mapInstance.off("styledata", refreshPremiumStyle);
    };
  }, [applyMapVisualStyle, mapInstance, mapMode]);

  useEffect(() => {
    if (!mapInstance || !trafficVisualizationEnabled) return;

    const refreshRoadNetwork = () => {
      const style = mapInstance.getStyle();
      const roadLayerIds =
        style.layers
          ?.filter(
            (layer) =>
              layer.type === "line" && layer.id.toLowerCase().includes("road"),
          )
          .map((layer) => layer.id) ?? [];

      if (!roadLayerIds.length) return;

      const features = mapInstance.queryRenderedFeatures(undefined, {
        layers: roadLayerIds.slice(0, 12),
      });

      const collected = features
        .flatMap((feature) => {
          const geometry = feature.geometry;
          if (!geometry) return [];
          if (geometry.type === "LineString") return [geometry.coordinates];
          if (geometry.type === "MultiLineString") return geometry.coordinates;
          return [];
        })
        .filter((coords) => coords.length > 3)
        .slice(0, 220);

      setAmbientNetworkRoutes((prev) => {
        if (prev.length === collected.length) {
          const sameHead =
            prev[0]?.[0]?.[0] === collected[0]?.[0]?.[0] &&
            prev[0]?.[0]?.[1] === collected[0]?.[0]?.[1];
          const sameTail =
            prev[prev.length - 1]?.[0]?.[0] ===
              collected[collected.length - 1]?.[0]?.[0] &&
            prev[prev.length - 1]?.[0]?.[1] ===
              collected[collected.length - 1]?.[0]?.[1];
          if (sameHead && sameTail) return prev;
        }
        return collected;
      });
    };

    refreshRoadNetwork();
    mapInstance.on("moveend", refreshRoadNetwork);

    return () => {
      mapInstance.off("moveend", refreshRoadNetwork);
    };
  }, [mapInstance, trafficVisualizationEnabled]);

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
    if (viewMode !== "drive3d" || !trafficVisualizationEnabled) return [];

    const maxVehicles =
      mapZoom >= 14 ? 11 : mapZoom >= 12.5 ? 8 : mapZoom >= 11 ? 6 : 4;
    return trafficSamples.slice(0, maxVehicles);
  }, [mapZoom, trafficSamples, trafficVisualizationEnabled, viewMode]);
  const ambientRoutes = useMemo(
    () =>
      ambientNetworkRoutes.length
        ? ambientNetworkRoutes
        : (routePayload?.routes.map((route) => route.geometry.coordinates) ??
          []),
    [ambientNetworkRoutes, routePayload],
  );
  const { vehicles: ambientTraffic, minZoomToRender } = useAmbientTraffic({
    routes: ambientRoutes,
    zoom: mapZoom,
    enabled: trafficVisualizationEnabled,
  });
  const visibleAmbientTraffic = useMemo(() => {
    if (!mapBounds) return ambientTraffic;

    const precision = mapZoom >= 16 ? 4 : mapZoom >= 14 ? 3 : 2;
    const deduped = new globalThis.Map<
      string,
      (typeof ambientTraffic)[number]
    >();

    for (const vehicle of ambientTraffic) {
      if (
        vehicle.lng < mapBounds.west ||
        vehicle.lng > mapBounds.east ||
        vehicle.lat < mapBounds.south ||
        vehicle.lat > mapBounds.north
      ) {
        continue;
      }

      const key = `${vehicle.lng.toFixed(precision)}:${vehicle.lat.toFixed(precision)}`;
      if (!deduped.has(key)) deduped.set(key, vehicle);
    }

    return Array.from(deduped.values());
  }, [ambientTraffic, mapBounds, mapZoom]);

  const vehicleScale = useMemo(() => {
    const points: Array<[number, number]> = [
      [11, TRAFFIC_MIN_SCALE],
      [13, 1],
      [15, 1.22],
      [17, 1.42],
      [19, TRAFFIC_MAX_SCALE],
    ];

    if (mapZoom <= points[0][0]) return points[0][1];
    if (mapZoom >= points[points.length - 1][0])
      return points[points.length - 1][1];

    for (let index = 0; index < points.length - 1; index += 1) {
      const [z1, s1] = points[index];
      const [z2, s2] = points[index + 1];
      if (mapZoom < z1 || mapZoom > z2) continue;

      const ratio = (mapZoom - z1) / (z2 - z1);
      return s1 + (s2 - s1) * ratio;
    }

    return 1;
  }, [mapZoom]);

  const resetRouteRuntime = () => {
    pause();
    reset();
    setRoutePanelOpen(false);
    setDrawerMinimalMode(false);
    setMapLibreCar3D(false);
  };

  const handleToggleViewMode = (mode: "map" | "drive3d") => {
    setViewMode(mode);
  };

  const handleSwitchToCesium = () => {
    resetRouteRuntime();
    setViewMode("map");
    setMapEngine("cesium");
  };
  useEffect(() => {
    if (!mapInstance || !isNavigating || !navCoordinate) return;
    const now = performance.now();
    const minFollowInterval = viewMode === "drive3d" ? 140 : 220;
    if (now - followTickRef.current < minFollowInterval) return;

    const prevCenter = lastFollowCenterRef.current;
    if (prevCenter) {
      const deltaLng = Math.abs(prevCenter[0] - navCoordinate[0]);
      const deltaLat = Math.abs(prevCenter[1] - navCoordinate[1]);
      if (deltaLng < 0.00001 && deltaLat < 0.00001) return;
    }

    followTickRef.current = now;
    lastFollowCenterRef.current = navCoordinate;
    programmaticMoveRef.current = true;
    mapInstance.once("moveend", () => {
      programmaticMoveRef.current = false;
    });
    mapInstance.easeTo({
      center: navCoordinate,
      pitch:
        mapMode === "2.5d" ? (viewMode === "drive3d" ? driveTiltDeg : 62) : 0,
      bearing: mapMode === "2.5d" ? navHeading : mapInstance.getBearing(),
      zoom:
        viewMode === "drive3d"
          ? Math.max(mapInstance.getZoom(), 14.5)
          : undefined,
      duration: viewMode === "drive3d" ? 280 : 320,
      easing: (t) => 1 - Math.pow(1 - t, 2.2),
    });
  }, [
    driveTiltDeg,
    mapInstance,
    navCoordinate,
    isNavigating,
    mapMode,
    navHeading,
    viewMode,
  ]);

  useEffect(() => {
    if (!mapInstance || mapMode !== "2.5d" || viewMode === "drive3d") return;

    const distance = cameraDistanceMeters ?? 1800;
    const nearDistance = 380;
    const farDistance = 3400;
    const progress = Math.min(
      1,
      Math.max(0, (distance - nearDistance) / (farDistance - nearDistance)),
    );

    const targetPitch =
      MAP_25D_NEAR_PITCH - (MAP_25D_NEAR_PITCH - MAP_25D_FAR_PITCH) * progress;
    const targetBearing = MAP_25D_DEFAULT_BEARING * (1 - progress);

    const currentPitch = mapInstance.getPitch();
    const currentBearing = mapInstance.getBearing();

    if (
      Math.abs(currentPitch - targetPitch) < 0.45 &&
      Math.abs(currentBearing - targetBearing) < 0.6
    ) {
      return;
    }

    const bucket = `${Math.round(targetPitch * 2) / 2}:${Math.round(targetBearing * 2) / 2}`;
    if (cameraPitchBucketRef.current === bucket) return;
    cameraPitchBucketRef.current = bucket;

    mapInstance.easeTo({
      pitch: targetPitch,
      bearing: targetBearing,
      duration: 460,
      easing: (t) => 1 - Math.pow(1 - t, 2.4),
    });
  }, [cameraDistanceMeters, mapInstance, mapMode, viewMode]);

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
        onMove={(event) => {
          if (Math.abs(event.viewState.zoom - mapZoom) > 0.01) {
            setMapZoom(event.viewState.zoom);
          }
          setMapBearing(event.viewState.bearing);
        }}
        onMoveEnd={(event) => {
          const bounds = event.target.getBounds();
          const nextDistance = estimateBoundsWidthMeters(bounds);
          setCameraDistanceMeters((prev) => {
            if (prev !== null && Math.abs(prev - nextDistance) < 10)
              return prev;
            return nextDistance;
          });
          setMapBounds((prev) => {
            const next = {
              west: bounds.getWest(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              north: bounds.getNorth(),
            };
            if (
              prev &&
              Math.abs(prev.west - next.west) < 0.0001 &&
              Math.abs(prev.south - next.south) < 0.0001 &&
              Math.abs(prev.east - next.east) < 0.0001 &&
              Math.abs(prev.north - next.north) < 0.0001
            ) {
              return prev;
            }
            return next;
          });
        }}
        onLoad={(e) => {
          const loadedMap = e.target;

          setMapInstance(loadedMap);
          setMapZoom(loadedMap.getZoom());
          setMapBearing(loadedMap.getBearing());

          applyMapVisualStyle(loadedMap);

          if (mapMode === "2.5d") {
            loadedMap.easeTo({
              pitch: MAP_25D_DEFAULT_PITCH,
              bearing: MAP_25D_DEFAULT_BEARING,
              duration: 80,
            });
          }

          const bounds = loadedMap.getBounds();
          setCameraDistanceMeters(estimateBoundsWidthMeters(bounds));
          setMapBounds({
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth(),
          });
        }}
      >
        <NavigationControl position="top-right" />

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
          ambientTraffic={visibleAmbientTraffic}
          mapZoom={mapZoom + (vehicleScale - 1) * 4.6}
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
          setRoutePanelOpen(false);
          setDrawerMinimalMode(false);
          onRouteClear();
        }}
        cameraTiltDeg={driveTiltDeg}
        onCameraTiltChange={setDriveTiltDeg}
        onFocusVehicle={() => {
          if (!mapInstance || !navCoordinate) return;
          mapInstance.easeTo({
            center: navCoordinate,
            bearing: 0,
            duration: 320,
          });
        }}
        onToggleTraffic={toggleTrafficVisualization}
        mapBearing={mapBearing}
      />

      {trafficVisualizationEnabled && mapZoom < minZoomToRender ? (
        <div className="pointer-events-none absolute right-4 bottom-36 z-20 rounded-xl border border-white/60 bg-white/85 px-3 py-1.5 text-[11px] text-slate-600 shadow">
          Zoom ≥ {minZoomToRender} để hiện traffic thành phố
        </div>
      ) : null}

      <div className="pointer-events-none absolute top-4 right-4 z-20 rounded-lg border border-white/70 bg-white/90 px-2.5 py-1 text-[11px] text-slate-600 shadow-sm">
        Camera:{" "}
        {cameraDistanceMeters ? `${Math.round(cameraDistanceMeters)} m` : "--"}
      </div>
    </div>
  );
}
