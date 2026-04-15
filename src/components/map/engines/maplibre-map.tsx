"use client";

import type { FeatureCollection, Position } from "geojson";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";

import floodData from "@/data/geojson/flood-sample.json";
import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import { MapDataLayers } from "@/features/map/components/layers/map-data-layers";
import { MapFeatureOverlays } from "@/features/map/components/overlays/map-feature-overlays";
import {
  MAP_DETAIL_ZOOM,
} from "@/features/map/constants/map-detail.constants";
import { useAmbientTraffic } from "@/features/map/hooks/use-ambient-traffic";
import type { AmbientTrafficRoute } from "@/features/map/hooks/use-ambient-traffic";
import { useBuildingLayer } from "@/features/map/hooks/use-building-layer";
import { useMapCursor } from "@/features/map/hooks/use-map-cursor";
import { useMapFlyToPlace } from "@/features/map/hooks/use-map-fly-to-place";
import { useMapViewMode } from "@/features/map/hooks/use-map-view-mode";
import { useMaplibreGestureGuards } from "@/features/map/hooks/maplibre/use-maplibre-gesture-guards";
import { useMaplibreRoadNetwork } from "@/features/map/hooks/maplibre/use-maplibre-road-network";
import { useSelectedFeatures } from "@/features/map/hooks/use-selected-features";
import {
  buildBuildingShadows,
  type ShadowSceneTuning,
} from "@/features/map/lib/buildings/building-shadows";
import {
  computeSceneLodProfile,
  weatherIntensityFromLod,
  shadowMaxFeaturesFromLod,
} from "@/features/map/lib/lod/scene-lod";
import { SceneController } from "@/features/map/lib/scene/scene-controller";
import { computeSceneProfile, type SceneProfile } from "@/features/map/lib/scene/scene-profile";
import { buildToneMapping, type SceneToneMapping } from "@/features/map/lib/scene/scene-tonemapping";
import { applySceneLighting } from "@/features/map/lib/scene/scene-sync-light";
import { deriveTrafficSceneTuning } from "@/features/map/lib/scene/scene-sync-traffic";
import { buildWaterSceneContext } from "@/features/map/lib/scene/scene-sync-water";
import { applyMapStyle } from "@/features/map/lib/style/apply-map-style";
import { buildAmbientTrafficSource } from "@/features/map/lib/traffic/build-ambient-traffic-source";
import { buildBoatEntities } from "@/features/map/lib/transport/boat-entities";
import { buildTransportEntities } from "@/features/map/lib/transport/transport-entities";
import { buildViewportVegetation } from "@/features/map/lib/vegetation/build-viewport-vegetation";
import { buildViewportWaterEffect } from "@/features/map/lib/water/build-viewport-water-effect";
import { createWaterCustomLayer } from "@/features/map/lib/water/water-custom-layer";
import { ensureWaterLayerOrder } from "@/features/map/lib/water/water-layer-order";
import { extractBoatSamples } from "@/features/map/lib/water/water-wake-system";
import { useMapStore } from "@/features/map/store/map.store";
import type { RouteAlternative } from "@/features/map/types/route.types";
import { ScenePostOverlay } from "@/features/map/ui/scene-post-overlay";
import { WeatherOverlay } from "@/features/map/ui/weather-overlay";
import { NavigationHud } from "@/features/navigation/components/navigation-hud";
import { RouteVisualLayers } from "@/features/navigation/components/route-visual-layers";
import { useNavigationPlayback } from "@/features/navigation/hooks/use-navigation-playback";
import {
  MAP_25D_DEFAULT_BEARING,
  MAP_25D_DEFAULT_PITCH,
  MAP_GLYPHS_FALLBACK,
  MAP_STYLE_2D,
  MAP_STYLE_25D,
} from "@/lib/constants/map.constants";

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
  const estimateRouteLengthMeters = useCallback((coordinates: Position[]) => {
    if (coordinates.length < 2) return 0;

    let total = 0;
    for (let index = 0; index < coordinates.length - 1; index += 1) {
      const start = coordinates[index];
      const end = coordinates[index + 1];
      if (!start || !end) continue;
      const avgLat = ((start[1] + end[1]) * Math.PI) / 360;
      const dx = (end[0] - start[0]) * (111320 * Math.cos(avgLat));
      const dy = (end[1] - start[1]) * 111320;
      total += Math.hypot(dx, dy);
    }

    return total;
  }, []);

  const classifyRoadClass = useCallback((className: string) => {
    if (
      className.includes("motorway") ||
      className.includes("trunk") ||
      className.includes("primary")
    ) {
      return "major" as const;
    }
    if (className.includes("secondary")) {
      return "medium" as const;
    }
    return "local" as const;
  }, []);

  const {
    mapMode,
    visibleLayers,
    trafficVisualizationEnabled,
    trafficDensity,
    laneDetailEnabled,
    routeAutoCameraEnabled,
    detailPreset,
    toggleTrafficVisualization,
    notifyMapInteraction,
    setMapEngine,
    timeMode,
    weatherMode,
    transportVisibility,
  } = useMapStore();
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [mapZoom, setMapZoom] = useState(11.2);
  const [mapBearing, setMapBearing] = useState(0);
  const lodProfile = useMemo(() => computeSceneLodProfile(mapZoom), [mapZoom]);
  const [mapBounds, setMapBounds] = useState<{
    west: number;
    south: number;
    east: number;
    north: number;
  } | null>(null);
  const [sceneUiProfile, setSceneUiProfile] = useState(() =>
    computeSceneProfile(timeMode, weatherMode),
  );
  const [sceneToneMapping, setSceneToneMapping] = useState<SceneToneMapping>(() =>
    buildToneMapping(computeSceneProfile(timeMode, weatherMode), 1),
  );
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

  useBuildingLayer(mapInstance, visibleLayers.buildings, timeMode);

  useEffect(() => {
    if (!sceneControllerRef.current) {
      sceneControllerRef.current = new SceneController(timeMode, weatherMode);
      sceneProfileRef.current = sceneControllerRef.current.getProfile();
      sceneToneRef.current = sceneControllerRef.current.getToneMapping();
      setSceneToneMapping(sceneToneRef.current);
    }

    sceneControllerRef.current.setModes(timeMode, weatherMode);
    const nextProfile = sceneControllerRef.current.tick();
    sceneProfileRef.current = nextProfile;
    setSceneUiProfile(nextProfile);
    sceneToneRef.current = sceneControllerRef.current.getToneMapping();
    setSceneToneMapping(sceneToneRef.current);

    if (!mapInstance) return;
    const apply = () => applySceneLighting(mapInstance, nextProfile);
    apply();
    mapInstance.on("style.load", apply);
    return () => {
      mapInstance.off("style.load", apply);
    };
  }, [mapInstance, timeMode, weatherMode]);

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
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "drive3d">("map");
  const [mapLibreCar3D, setMapLibreCar3D] = useState(false);
  const [drawerMinimalMode, setDrawerMinimalMode] = useState(false);
  const [driveTiltDeg, setDriveTiltDeg] = useState(78);
  const [ambientNetworkRoutes, setAmbientNetworkRoutes] = useState<
    AmbientTrafficRoute[]
  >([]);
  const ambientTrafficSourceId = "ambient-traffic-source";
  const ambientTrafficShadowLayerId = "ambient-traffic-shadow-fill";
  const ambientTrafficBodyLayerId = "ambient-traffic-body-3d";
  const ambientTrafficRoofLayerId = "ambient-traffic-roof-3d";
  const ambientTrafficWindshieldLayerId = "ambient-traffic-windshield-3d";
  const buildingShadowSourceId = "map-building-shadows";
  const buildingShadowLayerId = "map-building-shadows-fill";
  const parkTreeSourceId = "map-park-tree-points";
  const parkTreeShadowLayerId = "map-park-tree-shadow-circles";
  const parkTreeCanopyLayerId = "map-park-tree-canopy-circles";
  const parkTreeHighlightLayerId = "map-park-tree-highlight-circles";
  const transportEntitySourceId = "map-transport-entities";
  const boatEntitySourceId = "map-boat-entities";
  const boatShadowLayerId = "map-boat-shadow";
  const boatHullLayerId = "map-boat-hull";
  const boatCabinLayerId = "map-boat-cabin";
  const boatDeckLayerId = "map-boat-deck";
  const bikeLayerId = "map-bike-entities";
  const peopleLayerId = "map-people-entities";
  const programmaticMoveRef = useRef(false);
  const hasAppliedInitial25DCameraRef = useRef(false);
  const patchedStyleSignatureRef = useRef<string | null>(null);
  const roadRefreshTickRef = useRef(0);
  const followTickRef = useRef(0);
  const lastFollowCenterRef = useRef<[number, number] | null>(null);
  const mapShellRef = useRef<HTMLDivElement | null>(null);
  const mapPointerInsideRef = useRef(false);
  const mapPointerDownRef = useRef(false);
  const transportPhaseRef = useRef(0);
  const visibleWaterFeaturesRef = useRef<FeatureCollection["features"]>([]);
  const waterCustomLayerRef = useRef<ReturnType<typeof createWaterCustomLayer> | null>(null);
  const sceneControllerRef = useRef<SceneController | null>(null);
  const sceneProfileRef = useRef<SceneProfile>(computeSceneProfile(timeMode, weatherMode));
  const sceneToneRef = useRef<SceneToneMapping>(buildToneMapping(computeSceneProfile(timeMode, weatherMode), 1));

  useMaplibreRoadNetwork({
    mapInstance,
    trafficVisualizationEnabled,
    trafficDensity,
    detailPreset,
    setAmbientNetworkRoutes,
    roadRefreshTickRef,
    estimateRouteLengthMeters,
    classifyRoadClass,
  });

  useMaplibreGestureGuards(
    mapInstance,
    mapPointerInsideRef,
    mapPointerDownRef,
  );

  const estimateBoundsWidthMeters = (bounds: maplibregl.LngLatBounds) => {
    const west = bounds.getWest();
    const east = bounds.getEast();
    const lat = (bounds.getNorth() + bounds.getSouth()) / 2;
    const deltaLng = Math.abs(east - west);
    const metersPerDegLng = 111320 * Math.cos((lat * Math.PI) / 180);
    return Math.max(0, deltaLng * metersPerDegLng);
  };

  const applyMapVisualStyle = useCallback(
    (map: maplibregl.Map) => {
      applyMapStyle(map, {
        laneDetailEnabled,
        detailPreset,
      });
    },
    [detailPreset, laneDetailEnabled],
  );

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

    const applyStyleOncePerSignature = () => {
      const style = mapInstance.getStyle();
      if (!style) return;

      const signature = `${style.sprite ?? ""}|${style.glyphs ?? ""}|${style.layers?.length ?? 0}|${style.layers?.[0]?.id ?? ""}|${style.layers?.[style.layers.length - 1]?.id ?? ""}`;
      if (patchedStyleSignatureRef.current === signature) return;
      patchedStyleSignatureRef.current = signature;

      if (style.glyphs && style.glyphs !== MAP_GLYPHS_FALLBACK) {
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
        return;
      }

      applyMapVisualStyle(mapInstance);
    };

    applyStyleOncePerSignature();
    mapInstance.on("style.load", applyStyleOncePerSignature);

    return () => {
      mapInstance.off("style.load", applyStyleOncePerSignature);
    };
  }, [applyMapVisualStyle, mapInstance]);

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
        : (routePayload?.routes.map((route) => ({
            coordinates: route.geometry.coordinates,
            roadClass: "medium" as const,
          })) ??
          []),
    [ambientNetworkRoutes, routePayload],
  );
  const trafficTuning = deriveTrafficSceneTuning(sceneUiProfile);
  const lodTrafficMultiplier = lodProfile.trafficDensity;

  const { vehicles: ambientTraffic, minZoomToRender } = useAmbientTraffic({
    routes: ambientRoutes,
    zoom: mapZoom,
    enabled: trafficVisualizationEnabled,
    density: trafficDensity,
    detailPreset,
    densityMultiplier: trafficTuning.densityMultiplier * lodTrafficMultiplier,
    speedMultiplier: trafficTuning.speedMultiplier,
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

    const cap =
      mapZoom >= MAP_DETAIL_ZOOM.CLOSE
        ? trafficDensity === "full"
          ? detailPreset === "high"
            ? 112
            : 90
          : detailPreset === "high"
            ? 78
            : 60
        : mapZoom >= MAP_DETAIL_ZOOM.MID
          ? trafficDensity === "full"
            ? detailPreset === "high"
              ? 64
              : 50
            : detailPreset === "high"
              ? 42
              : 30
          : 16;

    return Array.from(deduped.values()).slice(0, Math.max(8, Math.round(cap * lodTrafficMultiplier)));
  }, [ambientTraffic, detailPreset, lodTrafficMultiplier, mapBounds, mapZoom, trafficDensity]);

  useEffect(() => {
    if (!mapInstance) return;

    const ensureAmbientTrafficLayers = () => {
      const style = mapInstance.getStyle();
      if (!style?.layers?.length) return;

      const beforeLayerId = style.layers.find(
        (layer) =>
          layer.type === "fill-extrusion" && /building/i.test(layer.id),
      )?.id;
      if (!beforeLayerId) return;

      const sourceData = buildAmbientTrafficSource(visibleAmbientTraffic, mapZoom);
      const source = mapInstance.getSource(
        ambientTrafficSourceId,
      ) as maplibregl.GeoJSONSource | null;

      if (!source) {
        mapInstance.addSource(ambientTrafficSourceId, {
          type: "geojson",
          data: sourceData,
        });
      } else {
        source.setData(sourceData);
      }

      const addOrMoveLayer = (layer: maplibregl.LayerSpecification) => {
        if (mapInstance.getLayer(layer.id)) {
          try {
            mapInstance.moveLayer(layer.id, beforeLayerId);
          } catch {}
          return;
        }
        mapInstance.addLayer(layer, beforeLayerId);
      };

      addOrMoveLayer({
        id: ambientTrafficShadowLayerId,
        type: "fill",
        source: ambientTrafficSourceId,
        filter: ["==", ["get", "part"], "body"],
        paint: {
          "fill-color": "#0f172a",
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            12,
            0.08,
            16,
            0.12,
            20,
            0.16,
          ],
        },
      });

      addOrMoveLayer({
        id: ambientTrafficBodyLayerId,
        type: "fill-extrusion",
        source: ambientTrafficSourceId,
        filter: ["==", ["get", "part"], "body"],
        paint: {
          "fill-extrusion-color": [
            "match",
            ["get", "roadClass"],
            "major",
            "#d8dde5",
            "medium",
            "#c8d0db",
            "#bcc4d0",
          ],
          "fill-extrusion-opacity": 0.95,
          "fill-extrusion-height": 0.42,
          "fill-extrusion-base": 0.02,
          "fill-extrusion-vertical-gradient": true,
        },
      });

      addOrMoveLayer({
        id: ambientTrafficRoofLayerId,
        type: "fill-extrusion",
        source: ambientTrafficSourceId,
        filter: ["==", ["get", "part"], "roof"],
        paint: {
          "fill-extrusion-color": "#f8fafc",
          "fill-extrusion-opacity": 0.93,
          "fill-extrusion-height": 0.6,
          "fill-extrusion-base": 0.18,
          "fill-extrusion-vertical-gradient": true,
        },
      });

      addOrMoveLayer({
        id: ambientTrafficWindshieldLayerId,
        type: "fill-extrusion",
        source: ambientTrafficSourceId,
        filter: ["==", ["get", "part"], "windshield"],
        paint: {
          "fill-extrusion-color": "#8ea0b5",
          "fill-extrusion-opacity": 0.9,
          "fill-extrusion-height": 0.72,
          "fill-extrusion-base": 0.28,
          "fill-extrusion-vertical-gradient": true,
        },
      });
    };

    ensureAmbientTrafficLayers();
    mapInstance.on("style.load", ensureAmbientTrafficLayers);

    return () => {
      mapInstance.off("style.load", ensureAmbientTrafficLayers);
    };
  }, [
    ambientRoutes,
    mapBounds,
    mapInstance,
    mapZoom,
    transportVisibility,
    visibleAmbientTraffic,
  ]);

  const vehicleScaleMultiplier = useMemo(() => {
    const baseZoomScale =
      mapZoom <= 11
        ? 0.7
        : mapZoom >= 18
          ? 1.3
          : mapZoom <= 15
            ? 0.7 + ((mapZoom - 11) / 4) * 0.3
            : 1 + ((mapZoom - 15) / 3) * 0.3;

    const residentialWidth =
      mapZoom <= 12
        ? 1.2
        : mapZoom >= 20
          ? 12
          : mapZoom <= 14
            ? 1.2 + ((mapZoom - 12) / 2) * (2.5 - 1.2)
            : mapZoom <= 16
              ? 2.5 + ((mapZoom - 14) / 2) * (5 - 2.5)
              : mapZoom <= 18
                ? 5 + ((mapZoom - 16) / 2) * (8 - 5)
                : 8 + ((mapZoom - 18) / 2) * (12 - 8);

    const roadWidthFactor = Math.min(1.2, Math.max(0.6, residentialWidth / 5));
    return Math.min(1.6, Math.max(0.62, baseZoomScale * roadWidthFactor));
  }, [mapZoom]);

  useEffect(() => {
    if (
      !mapInstance ||
      mapMode !== "2.5d" ||
      hasAppliedInitial25DCameraRef.current
    )
      return;

    hasAppliedInitial25DCameraRef.current = true;
    mapInstance.easeTo({
      pitch: MAP_25D_DEFAULT_PITCH,
      bearing: MAP_25D_DEFAULT_BEARING,
      duration: 120,
    });
  }, [mapInstance, mapMode]);

  useEffect(() => {
    if (!mapInstance) return;
    let lastRefresh = 0;

    const refreshEnvironmentViewport = () => {
      const now = performance.now();
      if (now - lastRefresh < 180) return;
      lastRefresh = now;
      const style = mapInstance.getStyle();
      if (!style?.layers?.length) return;

      const canvas = mapInstance.getCanvas();
      const screenPad = 88;
      const queryBox: [[number, number], [number, number]] = [
        [-screenPad, -screenPad],
        [canvas.width + screenPad, canvas.height + screenPad],
      ];
      const viewportBounds = mapInstance.getBounds();
      const bufferedBounds = {
        west: viewportBounds.getWest() - 0.01,
        south: viewportBounds.getSouth() - 0.01,
        east: viewportBounds.getEast() + 0.01,
        north: viewportBounds.getNorth() + 0.01,
      };

      const waterLayerIds =
        style.layers
          ?.filter(
            (layer) =>
              layer.type === "fill" && /(water|ocean|river|lake)/i.test(layer.id),
          )
          .map((layer) => layer.id)
          .slice(0, 4) ?? [];
      const firstRoadBridgeLayerId = style.layers?.find((layer) =>
        /(bridge|road|street|highway)/i.test(layer.id),
      )?.id;
      if (firstRoadBridgeLayerId) {
        waterLayerIds.forEach((layerId) => {
          if (!mapInstance.getLayer(layerId)) return;
          try {
            mapInstance.moveLayer(layerId, firstRoadBridgeLayerId);
          } catch {}
        });
      }
      if (!waterCustomLayerRef.current) {
        waterCustomLayerRef.current = createWaterCustomLayer("map-water-custom-layer");
      }
      if (!mapInstance.getLayer("map-water-custom-layer")) {
        try {
          mapInstance.addLayer(
            waterCustomLayerRef.current as maplibregl.CustomLayerInterface,
            firstRoadBridgeLayerId,
          );
        } catch {}
      }
      const profile = sceneControllerRef.current?.tick() ?? sceneProfileRef.current;
      if (profile) {
        sceneProfileRef.current = profile;
        setSceneUiProfile(profile);
        const tone = sceneControllerRef.current?.getToneMapping() ?? sceneToneRef.current;
        sceneToneRef.current = tone;
        setSceneToneMapping(tone);
        waterCustomLayerRef.current?.setSceneContext(buildWaterSceneContext(profile, timeMode, weatherMode, tone, lodProfile));
        applySceneLighting(mapInstance, profile);
        const mapContainer = mapInstance.getContainer();
        mapContainer.style.filter = `contrast(${tone.contrast.toFixed(3)}) saturate(${tone.saturation.toFixed(3)})`;
      }
      ensureWaterLayerOrder(mapInstance, "map-water-custom-layer");

      if (waterLayerIds.length) {
        const waterFeatures = mapInstance.queryRenderedFeatures(queryBox, {
          layers: waterLayerIds,
        });
        const waterData = buildViewportWaterEffect(waterFeatures);
        visibleWaterFeaturesRef.current = waterData.features;
        waterCustomLayerRef.current?.setWaterFeatures(waterData.features as any);

        const boatData = buildBoatEntities({
          waterFeatures: waterData.features,
          zoom: mapZoom,
          phase: transportPhaseRef.current,
          bounds: mapBounds,
          enabled: transportVisibility.boats,
          densityMultiplier: lodProfile.boatDensity,
        });
        const boatSource = mapInstance.getSource(boatEntitySourceId) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (!boatSource) {
          mapInstance.addSource(boatEntitySourceId, {
            type: "geojson",
            data: boatData,
          });
        } else {
          boatSource.setData(boatData);
        }
        waterCustomLayerRef.current?.setBoatSamples(extractBoatSamples(boatData));
      } else {
        visibleWaterFeaturesRef.current = [];
        waterCustomLayerRef.current?.setWaterFeatures([]);
        waterCustomLayerRef.current?.setBoatSamples([]);
      }

      const parkLayerIds =
        style?.layers
          ?.filter(
            (layer) =>
              layer.type === "fill" && /(park|green|grass)/i.test(layer.id),
          )
          .map((layer) => layer.id) ?? [];
      const treeData: FeatureCollection = parkLayerIds.length
        ? buildViewportVegetation({
            features: mapInstance.queryRenderedFeatures(queryBox, {
              layers: parkLayerIds.slice(0, 3),
            }),
            viewportBounds: bufferedBounds,
            detailPreset,
            mapZoom,
            densityScale: lodProfile.vegetationScale,
            densityMode: lodProfile.vegetationDensity,
          })
        : { type: "FeatureCollection", features: [] };

      const source = mapInstance.getSource(parkTreeSourceId) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!source) {
        mapInstance.addSource(parkTreeSourceId, {
          type: "geojson",
          data: treeData,
        });
      } else {
        source.setData(treeData);
      }

      const addLayerIfMissing = (layer: maplibregl.LayerSpecification) => {
        if (mapInstance.getLayer(layer.id)) return;
        try {
          mapInstance.addLayer(layer);
        } catch {}
      };

      const buildingLayerIds =
        style.layers
          ?.filter(
            (layer) =>
              layer.type === "fill-extrusion" &&
              layer.id.toLowerCase().includes("building"),
          )
          .map((layer) => layer.id) ?? [];

      if (visibleLayers.buildings && buildingLayerIds.length && lodProfile.shadowQuality !== "off") {
        const buildingFeatures = mapInstance.queryRenderedFeatures(queryBox, {
          layers: buildingLayerIds.slice(0, 3),
        });
        const shadowProfile = sceneProfileRef.current;
        const shadowTuning: ShadowSceneTuning | undefined = shadowProfile
          ? {
              lightDirection: shadowProfile.lightDirection,
              shadowLength: shadowProfile.shadowLength,
              shadowSoftness: shadowProfile.shadowSoftness,
            }
          : undefined;
        const shadowData = buildBuildingShadows(
          buildingFeatures,
          timeMode,
          shadowMaxFeaturesFromLod(lodProfile),
          shadowTuning,
        );
        const shadowSource = mapInstance.getSource(buildingShadowSourceId) as
          | maplibregl.GeoJSONSource
          | undefined;

        if (!shadowSource) {
          mapInstance.addSource(buildingShadowSourceId, {
            type: "geojson",
            data: shadowData,
          });
        } else {
          shadowSource.setData(shadowData);
        }

        const firstBuildingLayer = buildingLayerIds[0];
        addLayerIfMissing({
          id: buildingShadowLayerId,
          type: "fill",
          source: buildingShadowSourceId,
          paint: {
            "fill-color": "#0b1320",
            "fill-opacity": ["coalesce", ["get", "alpha"], 0.16],
            "fill-antialias": true,
          },
        });
        if (firstBuildingLayer && mapInstance.getLayer(buildingShadowLayerId)) {
          try {
            mapInstance.moveLayer(buildingShadowLayerId, firstBuildingLayer);
          } catch {}
        }
      } else {
        const shadowSource = mapInstance.getSource(buildingShadowSourceId) as
          | maplibregl.GeoJSONSource
          | undefined;
        shadowSource?.setData({ type: "FeatureCollection", features: [] });
      }

      addLayerIfMissing({
        id: parkTreeShadowLayerId,
        type: "circle",
        source: parkTreeSourceId,
        minzoom: 13,
        paint: {
          "circle-color": "#23311f",
          "circle-opacity": [
            "match",
            ["get", "greenMode"],
            "grass_first",
            0.11,
            "dense_wooded",
            0.24,
            0.2,
          ],
          "circle-translate": [1.4, 1.7],
          "circle-radius": [
            "*",
            [
              "match",
              ["get", "treeType"],
              "tall",
              2.9,
              "compact",
              2.4,
              2.05,
            ],
            ["coalesce", ["get", "treeScale"], 1],
          ],
        },
      });

      addLayerIfMissing({
        id: parkTreeCanopyLayerId,
        type: "circle",
        source: parkTreeSourceId,
        minzoom: 13,
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "treeTone"], "cool"],
            [
              "match",
              ["get", "treeArchetype"],
              "pine",
              "#4c7d45",
              "broadleaf",
              "#5a9261",
              "ornamental",
              "#73aa6f",
              "waterside",
              "#66a985",
              "#5e9362",
            ],
            ["==", ["get", "treeTone"], "warm"],
            [
              "match",
              ["get", "treeArchetype"],
              "pine",
              "#567737",
              "broadleaf",
              "#688e44",
              "ornamental",
              "#78a25e",
              "waterside",
              "#6a9a6e",
              "#658d4d",
            ],
            [
              "match",
              ["get", "treeArchetype"],
              "pine",
              "#4d7a3b",
              "broadleaf",
              "#5c8f4a",
              "ornamental",
              "#6ea55f",
              "waterside",
              "#5f9c70",
              "#5b8e45",
            ],
          ],
          "circle-opacity": [
            "match",
            ["get", "greenMode"],
            "grass_first",
            0.63,
            "dense_wooded",
            0.82,
            0.78,
          ],
          "circle-radius": [
            "*",
            [
              "match",
              ["get", "treeType"],
              "tall",
              2.6,
              "compact",
              2.1,
              1.8,
            ],
            ["coalesce", ["get", "treeScale"], 1],
          ],
          "circle-stroke-color": "#3e6430",
          "circle-stroke-width": 0.6,
        },
      });
      addLayerIfMissing({
        id: parkTreeHighlightLayerId,
        type: "circle",
        source: parkTreeSourceId,
        minzoom: 15.8,
        paint: {
          "circle-color": "#cde8b7",
          "circle-opacity": [
            "match",
            ["get", "greenMode"],
            "grass_first",
            0.18,
            "dense_wooded",
            0.23,
            0.28,
          ],
          "circle-translate": [-0.6, -0.6],
          "circle-radius": [
            "*",
            [
              "match",
              ["get", "treeType"],
              "tall",
              1.1,
              "compact",
              0.9,
              0.7,
            ],
            ["coalesce", ["get", "treeScale"], 1],
          ],
        },
      });

      const transportSource = mapInstance.getSource(transportEntitySourceId) as
        | maplibregl.GeoJSONSource
        | undefined;
      const transportData = buildTransportEntities({
        phase: transportPhaseRef.current,
        zoom: mapZoom,
        routes: ambientRoutes,
        bounds: mapBounds,
        transportVisibility,
        bikeDensity: lodProfile.bikeDensity,
        peopleDensity: lodProfile.peopleDensity,
      });
      if (!transportSource) {
        mapInstance.addSource(transportEntitySourceId, {
          type: "geojson",
          data: transportData,
        });
      } else {
        transportSource.setData(transportData);
      }

      addLayerIfMissing({
        id: boatShadowLayerId,
        type: "fill",
        source: boatEntitySourceId,
        filter: ["==", ["get", "part"], "shadow"],
        minzoom: 12,
        paint: {
          "fill-color": "#0a1a25",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.16, 17, 0.24],
        },
      });
      addLayerIfMissing({
        id: boatHullLayerId,
        type: "fill",
        source: boatEntitySourceId,
        filter: ["==", ["get", "part"], "hull"],
        minzoom: 12,
        paint: {
          "fill-color": "#f7fbff",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.88, 17, 0.95],
        },
      });
      addLayerIfMissing({
        id: boatCabinLayerId,
        type: "fill",
        source: boatEntitySourceId,
        filter: ["==", ["get", "part"], "cabin"],
        minzoom: 12,
        paint: {
          "fill-color": "#dbe7f1",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.9, 17, 0.96],
        },
      });
      addLayerIfMissing({
        id: boatDeckLayerId,
        type: "line",
        source: boatEntitySourceId,
        filter: ["==", ["get", "part"], "deck"],
        minzoom: 13,
        paint: {
          "line-color": "#b9cad8",
          "line-opacity": 0.62,
          "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.6, 17, 1.2],
        },
      });
      addLayerIfMissing({
        id: bikeLayerId,
        type: "circle",
        source: transportEntitySourceId,
        filter: ["==", ["get", "mode"], "bike"],
        minzoom: 13,
        paint: {
          "circle-color": [
            "match",
            ["get", "roadClass"],
            "local",
            "#8ff3a5",
            "medium",
            "#84e9a9",
            "#9bf98f",
          ],
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.78, 17, 0.9],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 0.95, 17, 1.75],
          "circle-stroke-color": "#1f5138",
          "circle-stroke-opacity": 0.62,
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 13, 0.2, 17, 0.5],
        },
      });
      addLayerIfMissing({
        id: peopleLayerId,
        type: "circle",
        source: transportEntitySourceId,
        filter: ["==", ["get", "mode"], "people"],
        minzoom: 14,
        paint: {
          "circle-color": "#f8c6ee",
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.72, 18, 0.86],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 0.62, 18, 1.25],
          "circle-stroke-color": "#7a3a6d",
          "circle-stroke-opacity": 0.48,
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 14, 0.18, 18, 0.36],
        },
      });
    };

    refreshEnvironmentViewport();
    mapInstance.on("moveend", refreshEnvironmentViewport);
    mapInstance.on("style.load", refreshEnvironmentViewport);

    return () => {
      mapInstance.off("moveend", refreshEnvironmentViewport);
      mapInstance.off("style.load", refreshEnvironmentViewport);
    };
  }, [
    ambientRoutes,
    detailPreset,
    mapBounds,
    mapInstance,
    mapZoom,
    timeMode,
    transportVisibility,
    visibleLayers.buildings,
    weatherMode,
    lodProfile,
  ]);

  useEffect(() => {
    if (!mapInstance) return;

    let phase = 0;
    const interval = window.setInterval(() => {
      const profile = sceneControllerRef.current?.tick() ?? sceneProfileRef.current;
      if (profile) {
        sceneProfileRef.current = profile;
        setSceneUiProfile(profile);
        const tone = sceneControllerRef.current?.getToneMapping() ?? sceneToneRef.current;
        sceneToneRef.current = tone;
        setSceneToneMapping(tone);
        const traffic = deriveTrafficSceneTuning(profile);
        phase += 0.23 * traffic.speedMultiplier;
        waterCustomLayerRef.current?.setSceneContext(buildWaterSceneContext(profile, timeMode, weatherMode, tone, lodProfile));
        applySceneLighting(mapInstance, profile);
      } else {
        phase += 0.23;
      }
      transportPhaseRef.current = phase;

      try {
        const transportSource = mapInstance.getSource(transportEntitySourceId) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (transportSource) {
          transportSource.setData(
            buildTransportEntities({
              phase: transportPhaseRef.current,
              zoom: mapZoom,
              routes: ambientRoutes
                .filter((route) =>
                  lodProfile.trafficRoadBias === "all"
                    ? true
                    : lodProfile.trafficRoadBias === "major_secondary"
                      ? route.roadClass === "major" || route.roadClass === "medium"
                      : route.roadClass === "major",
                )
                .slice(0, Math.max(8, Math.floor(ambientRoutes.length * (sceneProfileRef.current?.trafficDensityMultiplier ?? 1)))),
              bounds: mapBounds,
              transportVisibility,
              bikeDensity: lodProfile.bikeDensity,
              peopleDensity: lodProfile.peopleDensity,
            }),
          );
        }
        const boatSource = mapInstance.getSource(boatEntitySourceId) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (boatSource) {
          boatSource.setData(
            buildBoatEntities({
              waterFeatures: visibleWaterFeaturesRef.current,
              zoom: mapZoom,
              phase: transportPhaseRef.current,
              bounds: mapBounds,
              enabled: transportVisibility.boats,
              densityMultiplier: lodProfile.boatDensity,
            }),
          );
        }
      } catch {}
    }, 280);

    return () => window.clearInterval(interval);
  }, [
    ambientRoutes,
    boatEntitySourceId,
    mapBounds,
    mapInstance,
    mapZoom,
    transportVisibility,
    transportEntitySourceId,
    timeMode,
    weatherMode,
    lodProfile,
  ]);

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
  const isRouteCameraActive =
    routeAutoCameraEnabled &&
    viewMode === "drive3d" &&
    Boolean(isNavigating && navCoordinate);

  useEffect(() => {
    if (!mapInstance || !isRouteCameraActive || !navCoordinate) return;
    const now = performance.now();
    const minFollowInterval = 140;
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
      duration: 280,
      easing: (t) => 1 - Math.pow(1 - t, 2.2),
    });
  }, [
    driveTiltDeg,
    mapInstance,
    navCoordinate,
    isRouteCameraActive,
    mapMode,
    navHeading,
    viewMode,
  ]);

  return (
    <div
      ref={mapShellRef}
      className="map-shell relative h-full w-full"
      style={{
        overscrollBehaviorX: "contain",
        overscrollBehaviorY: "contain",
        touchAction: "pan-x pan-y",
      }}
    >
      <Map
        initialViewState={initialViewState}
        style={{
          width: "100%",
          height: "100%",
          cursor,
          touchAction: "pan-x pan-y",
          overscrollBehaviorX: "contain",
          overscrollBehaviorY: "contain",
        }}
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
          if (Math.abs(event.viewState.bearing - mapBearing) > 0.9) {
            setMapBearing(event.viewState.bearing);
          }
        }}
        onMoveEnd={(event) => {
          const bounds = event.target.getBounds();
          const nextDistance = estimateBoundsWidthMeters(bounds);
          setCameraDistanceMeters((prev) => {
            if (prev !== null && Math.abs(prev - nextDistance) < 45)
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
              Math.abs(prev.west - next.west) < 0.0007 &&
              Math.abs(prev.south - next.south) < 0.0007 &&
              Math.abs(prev.east - next.east) < 0.0007 &&
              Math.abs(prev.north - next.north) < 0.0007
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

          if (mapMode === "2.5d" && !hasAppliedInitial25DCameraRef.current) {
            hasAppliedInitial25DCameraRef.current = true;
            loadedMap.easeTo({
              pitch: MAP_25D_DEFAULT_PITCH,
              bearing: MAP_25D_DEFAULT_BEARING,
              duration: 120,
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
          mapZoom={mapZoom}
          vehicleScaleMultiplier={vehicleScaleMultiplier}
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

      <WeatherOverlay
        weather={lodProfile.weatherParticleDensity === "off" ? "sun" : weatherMode}
        intensity={weatherIntensityFromLod(lodProfile.weatherParticleDensity)}
      />
      <ScenePostOverlay tone={sceneToneMapping} />

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
