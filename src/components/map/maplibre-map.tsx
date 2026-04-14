"use client";

import type { FeatureCollection, Position } from "geojson";
import maplibregl from "maplibre-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { NavigationControl } from "react-map-gl/maplibre";

import floodData from "@/data/geojson/flood-sample.json";
import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import {
  AMBIENT_TRAFFIC_ROUTE_SCAN,
  MAP_DETAIL_ZOOM,
} from "@/features/map/constants/map-detail.constants";
import { useAmbientTraffic } from "@/features/map/hooks/use-ambient-traffic";
import type { AmbientTrafficRoute } from "@/features/map/hooks/use-ambient-traffic";
import { useBuildingLayer } from "@/features/map/hooks/use-building-layer";
import { useMapCursor } from "@/features/map/hooks/use-map-cursor";
import { useMapFlyToPlace } from "@/features/map/hooks/use-map-fly-to-place";
import { useMapViewMode } from "@/features/map/hooks/use-map-view-mode";
import { useSelectedFeatures } from "@/features/map/hooks/use-selected-features";
import { applyF4InspiredMapStyle } from "@/features/map/lib/apply-f4-inspired-map-style";
import { buildAmbientTrafficSource } from "@/features/map/lib/build-ambient-traffic-source";
import { useNavigationPlayback } from "@/features/map/navigation/use-navigation-playback";
import { useMapStore } from "@/features/map/store/map.store";
import type { RouteAlternative } from "@/features/map/types/route.types";
import {
  MAP_25D_DEFAULT_BEARING,
  MAP_25D_DEFAULT_PITCH,
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
    buildingOpacity,
    trafficVisualizationEnabled,
    trafficDensity,
    laneDetailEnabled,
    routeAutoCameraEnabled,
    detailPreset,
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
  const parkTreeSourceId = "f4-park-tree-points";
  const parkTreeShadowLayerId = "f4-park-tree-shadow-circles";
  const parkTreeCanopyLayerId = "f4-park-tree-canopy-circles";
  const parkTreeHighlightLayerId = "f4-park-tree-highlight-circles";
  const programmaticMoveRef = useRef(false);
  const hasAppliedInitial25DCameraRef = useRef(false);
  const patchedStyleSignatureRef = useRef<string | null>(null);
  const roadRefreshTickRef = useRef(0);
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

  const applyMapVisualStyle = useCallback(
    (map: maplibregl.Map) => {
      applyF4InspiredMapStyle(map, {
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

  useEffect(() => {
    if (
      !mapInstance ||
      !trafficVisualizationEnabled ||
      trafficDensity === "off"
    )
      return;

    const refreshRoadNetwork = () => {
      const now = performance.now();
      if (
        now - roadRefreshTickRef.current <
        AMBIENT_TRAFFIC_ROUTE_SCAN.throttleMs
      )
        return;
      roadRefreshTickRef.current = now;

      if (mapInstance.getZoom() < MAP_DETAIL_ZOOM.LOW) {
        setAmbientNetworkRoutes((prev) => (prev.length ? [] : prev));
        return;
      }

      const style = mapInstance.getStyle();
      const currentZoom = mapInstance.getZoom();
      const roadLayerIds =
        style.layers
          ?.filter(
            (layer) =>
              layer.type === "line" && layer.id.toLowerCase().includes("road"),
          )
          .map((layer) => layer.id) ?? [];

      if (!roadLayerIds.length) return;

      const features = mapInstance.queryRenderedFeatures(undefined, {
        layers: roadLayerIds.slice(0, AMBIENT_TRAFFIC_ROUTE_SCAN.layers),
      });

      const serviceSelectionMod = currentZoom >= MAP_DETAIL_ZOOM.CLOSE ? 3 : 5;
      const maxCollected =
        currentZoom >= MAP_DETAIL_ZOOM.CLOSE
          ? detailPreset === "high"
            ? 120
            : 96
          : currentZoom >= MAP_DETAIL_ZOOM.MID
            ? detailPreset === "high"
              ? 84
              : 64
            : 36;
      const minLengthMeters =
        currentZoom >= MAP_DETAIL_ZOOM.CLOSE
          ? 90
          : currentZoom >= MAP_DETAIL_ZOOM.MID
            ? 130
            : 190;

      const collected = features
        .flatMap((feature) => {
          const geometry = feature.geometry;
          const className = String(
            (feature.properties?.class as string | undefined) ??
              (feature.properties?.type as string | undefined) ??
              "",
          ).toLowerCase();

          const isMotorway = className.includes("motorway");
          const isTrunk = className.includes("trunk");
          const isPrimary = className.includes("primary");
          const isSecondary = className.includes("secondary");
          const isTertiary = className.includes("tertiary");
          const isResidential = className.includes("residential");
          const isService = className.includes("service");

          const isEligible =
            isMotorway ||
            isTrunk ||
            isPrimary ||
            isSecondary ||
            isTertiary ||
            isResidential ||
            isService;
          if (!isEligible) return [];

          if (!geometry) return [];
          if (geometry.type === "LineString") {
            const lengthMeters = estimateRouteLengthMeters(geometry.coordinates);
            if (lengthMeters < minLengthMeters) return [];

            if (isService) {
              const keep =
                Math.floor((geometry.coordinates[0]?.[0] ?? 0) * 10000) %
                  serviceSelectionMod ===
                0;
              if (!keep) return [];
            }

            return [
              {
                coordinates: geometry.coordinates,
                roadClass: classifyRoadClass(className),
                lengthMeters,
              } satisfies AmbientTrafficRoute,
            ];
          }
          if (geometry.type === "MultiLineString") {
            return geometry.coordinates.map(
              (coordinates) => {
                const lengthMeters = estimateRouteLengthMeters(coordinates);
                return {
                  coordinates,
                  roadClass: classifyRoadClass(className),
                  lengthMeters,
                } satisfies AmbientTrafficRoute;
              },
            );
          }
          return [];
        })
        .filter(
          (route) =>
            route.coordinates.length > 3 &&
            (route.lengthMeters ?? 0) >= minLengthMeters,
        )
        .map((route) => {
          const classScore =
            route.roadClass === "major" ? 1.25 : route.roadClass === "medium" ? 1 : 0.82;
          const zoomScore = currentZoom >= MAP_DETAIL_ZOOM.CLOSE ? 1.08 : 0.94;
          const lengthScore = Math.min(1.4, Math.max(0.35, (route.lengthMeters ?? 0) / 520));
          return {
            route,
            score: classScore * lengthScore * zoomScore,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(maxCollected, AMBIENT_TRAFFIC_ROUTE_SCAN.maxRoutes * 2))
        .map((item) => item.route);

      setAmbientNetworkRoutes((prev) => {
        if (prev.length === collected.length) {
          const sameHead =
            prev[0]?.coordinates?.[0]?.[0] === collected[0]?.coordinates?.[0]?.[0] &&
            prev[0]?.coordinates?.[0]?.[1] === collected[0]?.coordinates?.[0]?.[1];
          const sameTail =
            prev[prev.length - 1]?.coordinates?.[0]?.[0] ===
              collected[collected.length - 1]?.coordinates?.[0]?.[0] &&
            prev[prev.length - 1]?.coordinates?.[0]?.[1] ===
              collected[collected.length - 1]?.coordinates?.[0]?.[1];
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
  }, [
    classifyRoadClass,
    detailPreset,
    estimateRouteLengthMeters,
    mapInstance,
    trafficDensity,
    trafficVisualizationEnabled,
  ]);

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
  const { vehicles: ambientTraffic, minZoomToRender } = useAmbientTraffic({
    routes: ambientRoutes,
    zoom: mapZoom,
    enabled: trafficVisualizationEnabled,
    density: trafficDensity,
    detailPreset,
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
            ? 96
            : 78
          : detailPreset === "high"
            ? 66
            : 52
        : mapZoom >= MAP_DETAIL_ZOOM.MID
          ? trafficDensity === "full"
            ? detailPreset === "high"
              ? 54
              : 42
            : detailPreset === "high"
              ? 34
              : 24
          : 14;

    return Array.from(deduped.values()).slice(0, cap);
  }, [ambientTraffic, detailPreset, mapBounds, mapZoom, trafficDensity]);

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
  }, [mapInstance, mapZoom, visibleAmbientTraffic]);

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
    let frame = 0;
    let last = performance.now();
    let phase = 0;

    const tick = (now: number) => {
      const elapsed = now - last;
      if (elapsed < 120) {
        frame = requestAnimationFrame(tick);
        return;
      }
      last = now;
      phase += elapsed * 0.0012;

      if (mapInstance.getLayer("f4-water-shimmer")) {
        const shimmerOpacity = 0.12 + Math.sin(phase) * 0.05;
        try {
          mapInstance.setPaintProperty(
            "f4-water-shimmer",
            "line-opacity",
            shimmerOpacity,
          );
        } catch {}
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;

    const seededType = (lng: number, lat: number) => {
      const hash = Math.abs(Math.floor((lng * 9973 + lat * 7919) * 10000)) % 10;
      if (hash < 2) return "tall";
      if (hash < 7) return "compact";
      return "ornamental";
    };

    const refreshTrees = () => {
      const style = mapInstance.getStyle();
      const parkLayerIds =
        style?.layers
          ?.filter(
            (layer) =>
              layer.type === "fill" && /(park|green|grass)/i.test(layer.id),
          )
          .map((layer) => layer.id) ?? [];
      if (!parkLayerIds.length) return;

      const features = mapInstance.queryRenderedFeatures(undefined, {
        layers: parkLayerIds.slice(0, 3),
      });

      const maxTrees =
        mapZoom >= 17
          ? detailPreset === "high"
            ? 300
            : 220
          : mapZoom >= 15
            ? detailPreset === "high"
              ? 180
              : 130
            : 80;
      const step = mapZoom >= 17 ? 5 : mapZoom >= 15 ? 7 : 10;

      const points: Array<{
        type: "Feature";
        geometry: { type: "Point"; coordinates: [number, number] };
        properties: { treeType: "tall" | "compact" | "ornamental" };
      }> = [];

      for (const feature of features) {
        const geometry = feature.geometry;
        const rings =
          geometry?.type === "Polygon"
            ? geometry.coordinates
            : geometry?.type === "MultiPolygon"
              ? geometry.coordinates.flat()
              : [];

        for (const ring of rings) {
          for (let index = 0; index < ring.length; index += step) {
            const point = ring[index];
            if (!point) continue;
            points.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [point[0], point[1]] },
              properties: {
                treeType: seededType(point[0], point[1]),
              },
            });
            if (points.length >= maxTrees) break;
          }
          if (points.length >= maxTrees) break;
        }
        if (points.length >= maxTrees) break;
      }

      const treeData: FeatureCollection = {
        type: "FeatureCollection",
        features: points,
      };

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
        mapInstance.addLayer(layer);
      };

      addLayerIfMissing({
        id: parkTreeShadowLayerId,
        type: "circle",
        source: parkTreeSourceId,
        paint: {
          "circle-color": "#23311f",
          "circle-opacity": 0.18,
          "circle-translate": [1.4, 1.7],
          "circle-radius": [
            "match",
            ["get", "treeType"],
            "tall",
            3.2,
            "compact",
            2.6,
            2.1,
          ],
        },
      });

      addLayerIfMissing({
        id: parkTreeCanopyLayerId,
        type: "circle",
        source: parkTreeSourceId,
        paint: {
          "circle-color": [
            "match",
            ["get", "treeType"],
            "tall",
            "#4f7c3a",
            "compact",
            "#5d8e47",
            "#6ea45a",
          ],
          "circle-opacity": 0.76,
          "circle-radius": [
            "match",
            ["get", "treeType"],
            "tall",
            2.8,
            "compact",
            2.3,
            1.9,
          ],
          "circle-stroke-color": "#3e6430",
          "circle-stroke-width": 0.6,
        },
      });

      addLayerIfMissing({
        id: parkTreeHighlightLayerId,
        type: "circle",
        source: parkTreeSourceId,
        paint: {
          "circle-color": "#cde8b7",
          "circle-opacity": 0.26,
          "circle-translate": [-0.6, -0.6],
          "circle-radius": [
            "match",
            ["get", "treeType"],
            "tall",
            1.1,
            "compact",
            0.9,
            0.7,
          ],
        },
      });
    };

    refreshTrees();
    mapInstance.on("moveend", refreshTrees);
    mapInstance.on("style.load", refreshTrees);

    return () => {
      mapInstance.off("moveend", refreshTrees);
      mapInstance.off("style.load", refreshTrees);
    };
  }, [detailPreset, mapInstance, mapZoom]);

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
