"use client";

import * as Cesium from "cesium";
import { Globe, Map, Satellite } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { FeaturePopupCard } from "@/components/map/feature-popup";
import { ControlBoard } from "@/components/map/navigation/control-board";
import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import { useCesiumChaseCamera } from "@/features/map/hooks/use-cesium-chase-camera";
import { sampleRouteAtProgress } from "@/features/map/navigation/route-sampling";
import { useNavigationPlayback } from "@/features/map/navigation/use-navigation-playback";
import { useMapStore } from "@/features/map/store/map.store";
import type { RouteAlternative } from "@/features/map/types/route.types";
import {
  DEFAULT_MAP_CURSOR,
  INSPECT_FEATURE_CURSOR,
} from "@/lib/constants/cursor.constants";
import { CESIUM_ASSET_BASE_URL } from "@/lib/constants/map.constants";

type CesiumMapProps = {
  selectedPlace: PlaceItem | null;
  floodData: FloodGeoJson | null;
  routePayload: {
    from: PlaceItem;
    to: PlaceItem;
    routes: RouteAlternative[];
    activeIndex: number;
  } | null;
};

type CesiumBasemap = "satelliteLabel" | "satellite" | "road";

const CESIUM_ION_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5NDQzZmY3YS0zMzM5LTQxNjQtODExYy1lMjdlNmZiMjBiZTEiLCJpZCI6NDE0ODM1LCJpYXQiOjE3NzU1NTU0MjB9.thF7Xpi0ljcc9CbgVkumz2OuxExJgvcRkQeUveEs0AE";

function createViewer(container: HTMLDivElement) {
  (
    globalThis as typeof globalThis & {
      CESIUM_BASE_URL?: string;
    }
  ).CESIUM_BASE_URL = CESIUM_ASSET_BASE_URL;

  Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

  return new Cesium.Viewer(container, {
    baseLayer: Cesium.ImageryLayer.fromProviderAsync(
      Cesium.createWorldImageryAsync({
        style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
      }),
    ),
    terrain: Cesium.Terrain.fromWorldTerrain({
      requestVertexNormals: true,
      requestWaterMask: true,
    }),
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    sceneModePicker: false,
    geocoder: false,
    navigationHelpButton: false,
    homeButton: true,
    infoBox: false,
    selectionIndicator: false,
    scene3DOnly: true,
  });
}

function toRgbaColor(opacity: number) {
  const alpha = Math.max(0.1, Math.min(opacity, 1));
  return `rgba(37,99,235,${alpha.toFixed(3)})`;
}

type SelectedBuildingInfo = {
  name: string;
  height: string;
  kind: string;
  sourceId: string;
  position: { x: number; y: number };
  anchor: "top" | "bottom";
};

function getFeatureProperty(
  feature: Cesium.Cesium3DTileFeature,
  keys: string[],
): string {
  for (const key of keys) {
    if (feature.hasProperty(key)) {
      const value = feature.getProperty(key);
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return String(value);
      }
    }
  }

  return "N/A";
}

const CAR_MODEL_URL =
  "https://raw.githubusercontent.com/CesiumGS/cesium/main/Apps/SampleData/models/CesiumMilkTruck/CesiumMilkTruck.glb";
const BIKE_MODEL_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/VC/glTF-Binary/VC.glb";
const WALK_MODEL_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb";

export function CesiumMap({ selectedPlace, routePayload }: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const osmBuildingsRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const routeTickCleanupRef = useRef<(() => void) | null>(null);
  const viewerDestroyedRef = useRef(false);
  const {
    visibleLayers,
    buildingOpacity,
    trafficVisualizationEnabled,
    notifyMapInteraction,
  } = useMapStore();
  const [selectedBuilding, setSelectedBuilding] =
    useState<SelectedBuildingInfo | null>(null);
  const [basemap, setBasemap] = useState<CesiumBasemap>("satelliteLabel");
  const { updateChaseCamera, resetChaseCamera } = useCesiumChaseCamera();
  const activeRoute = routePayload?.routes[routePayload.activeIndex] ?? null;
  const navMode = activeRoute?.mode ?? "car";
  const {
    isPlaying: isNavigating,
    progress: navProgress,
    seek,
    togglePlayback,
    pause,
    reset,
    speedMultiplier,
    availableSpeedMultipliers,
    setSpeedMultiplier,
    trafficSamples,
  } = useNavigationPlayback({
    geometry: activeRoute?.geometry ?? null,
    steps: activeRoute?.steps ?? [],
    mode: navMode,
  });
  const navProgressRef = useRef(navProgress);
  const isNavigatingRef = useRef(isNavigating);
  const speedMultiplierRef = useRef(speedMultiplier);
  const trafficSamplesRef = useRef(trafficSamples);
  const trafficVisualizationEnabledRef = useRef(trafficVisualizationEnabled);

  useEffect(() => {
    navProgressRef.current = navProgress;
    isNavigatingRef.current = isNavigating;
    speedMultiplierRef.current = speedMultiplier;
    trafficSamplesRef.current = trafficSamples;
    trafficVisualizationEnabledRef.current = trafficVisualizationEnabled;
  }, [isNavigating, navProgress, speedMultiplier, trafficSamples, trafficVisualizationEnabled]);

  const resolveImageryStyle = (mode: CesiumBasemap) => {
    if (mode === "road") return Cesium.IonWorldImageryStyle.ROAD;
    if (mode === "satellite") return Cesium.IonWorldImageryStyle.AERIAL;
    return Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS;
  };

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = createViewer(containerRef.current);
    viewerDestroyedRef.current = false;
    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.globe.showWaterEffect = true;
    // Keep continuous render so imagery tiles can fully refine and avoid
    // visible semi-transparent tile patches while idle.
    viewer.scene.requestRenderMode = false;

    viewerRef.current = viewer;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(106.73, 10.82, 15000),
      duration: 1.5,
    });

    const clickHandler = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas,
    );
    clickHandler.setInputAction(
      (movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const picked = viewer.scene.pick(movement.position);

        if (picked && picked instanceof Cesium.Cesium3DTileFeature) {
          const y = movement.position.y;
          setSelectedBuilding({
            name: getFeatureProperty(picked, ["name", "name:en"]),
            height: getFeatureProperty(picked, ["height", "building:levels"]),
            kind: getFeatureProperty(picked, ["building", "building:use"]),
            sourceId: getFeatureProperty(picked, ["id", "elementId"]),
            position: { x: movement.position.x, y },
            anchor: y < 200 ? "top" : "bottom",
          });
          notifyMapInteraction();
          viewer.scene.requestRender();
          return;
        }

        setSelectedBuilding(null);
        notifyMapInteraction();
        viewer.scene.requestRender();
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );
    clickHandler.setInputAction(
      (movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        const picked = viewer.scene.pick(movement.endPosition);
        (viewer.container as HTMLElement).style.cursor =
          picked && picked instanceof Cesium.Cesium3DTileFeature
            ? INSPECT_FEATURE_CURSOR
            : DEFAULT_MAP_CURSOR;
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE,
    );

    const handleMoveStart = () => {
      setSelectedBuilding(null);
      notifyMapInteraction();
      viewer.scene.requestRender();
    };
    viewer.camera.moveStart.addEventListener(handleMoveStart);

    return () => {
      (viewer.container as HTMLElement).style.cursor = DEFAULT_MAP_CURSOR;
      viewer.camera.moveStart.removeEventListener(handleMoveStart);
      clickHandler.destroy();
      routeTickCleanupRef.current?.();
      routeTickCleanupRef.current = null;
      if (osmBuildingsRef.current) {
        viewer.scene.primitives.remove(osmBuildingsRef.current);
        osmBuildingsRef.current = null;
      }
      viewerDestroyedRef.current = true;
      viewer.destroy();
      viewerRef.current = null;
    };
  }, [notifyMapInteraction]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selectedPlace) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedPlace.center[0],
        selectedPlace.center[1],
        6000,
      ),
      duration: 1.5,
    });
  }, [selectedPlace]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    let alive = true;

    const updateBaseLayer = async () => {
      const provider = await Cesium.createWorldImageryAsync({
        style: resolveImageryStyle(basemap),
      });
      if (!alive) return;
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(provider);
      viewer.scene.requestRender();
    };

    void updateBaseLayer();

    return () => {
      alive = false;
    };
  }, [basemap]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeById("route-main");
    viewer.entities.removeById("route-main-glow");
    viewer.entities.removeById("route-remaining");
    viewer.entities.removeById("route-car");
    Array.from({ length: 8 }, (_, index) => {
      viewer.entities.removeById(`route-traffic-${index + 1}`);
    });
    routeTickCleanupRef.current?.();
    routeTickCleanupRef.current = null;
    resetChaseCamera();

    if (!routePayload) return;
    const coordinates = routePayload.routes[routePayload.activeIndex].geometry.coordinates;
    if (!coordinates.length) return;

    const cartesianPath = coordinates.map((coord) =>
      Cesium.Cartesian3.fromDegrees(coord[0], coord[1], 3),
    );
    const routeLine = viewer.entities.add({
      id: "route-main",
      polyline: {
        positions: cartesianPath,
        width: 8,
        material: Cesium.Color.fromCssColorString("#1d4ed8").withAlpha(0.35),
        clampToGround: true,
      },
    });
    const routeGlow = viewer.entities.add({
      id: "route-main-glow",
      polyline: {
        positions: cartesianPath,
        width: 14,
        material: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.15),
        clampToGround: true,
      },
    });
    const routeRemaining = viewer.entities.add({
      id: "route-remaining",
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          const startIndex = Math.min(
            cartesianPath.length - 1,
            Math.floor(navProgressRef.current * (cartesianPath.length - 1)),
          );
          return cartesianPath.slice(startIndex);
        }, false),
        width: 7,
        material: Cesium.Color.fromCssColorString("#38bdf8").withAlpha(0.95),
        clampToGround: true,
      },
    });

    const sampleAt = (progress: number) => {
      const sample = sampleRouteAtProgress(coordinates, progress);
      if (!sample) return Cesium.Cartesian3.fromDegrees(0, 0, 3);
      return Cesium.Cartesian3.fromDegrees(sample.lng, sample.lat, 3);
    };

    const createVehicleEntity = (
      id: string,
      progress: number,
      variant: "car" | "bike" | "walk" = "car",
      scale = 12,
    ) =>
      viewer.entities.add({
        id,
        position: sampleAt(progress),
        orientation: Cesium.Transforms.headingPitchRollQuaternion(
          sampleAt(progress),
          new Cesium.HeadingPitchRoll(0, 0, 0),
        ),
        model: {
          uri:
            variant === "bike"
              ? BIKE_MODEL_URL
              : variant === "walk"
                ? WALK_MODEL_URL
                : CAR_MODEL_URL,
          minimumPixelSize: 26,
          maximumScale: scale,
          scale: variant === "walk" ? 1.2 : variant === "bike" ? 1.1 : 1.6,
        },
      });

    const mainVehicleVariant = navMode === "walk" ? "walk" : navMode === "bike" ? "bike" : "car";
    const mainCar = createVehicleEntity("route-car", 0.001, mainVehicleVariant, 15);
    const trafficEntities = Array.from({ length: 8 }, (_, index) =>
      createVehicleEntity(`route-traffic-${index + 1}`, (0.15 + index * 0.1) % 1),
    );

    const tick = () => {
      const mainSample = sampleRouteAtProgress(coordinates, navProgressRef.current);
      const mainPosition = sampleAt(navProgressRef.current);
      mainCar.position = new Cesium.ConstantPositionProperty(mainPosition);
      const toOrientation = (position: Cesium.Cartesian3, bearing?: number) =>
        Cesium.Transforms.headingPitchRollQuaternion(
          position,
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians((bearing ?? 0) - 90),
            0,
            0,
          ),
        );
      mainCar.orientation = new Cesium.ConstantProperty(
        toOrientation(mainPosition, mainSample?.bearing),
      );

      const trafficActive = trafficVisualizationEnabledRef.current;
      const trafficNow = trafficActive ? trafficSamplesRef.current.slice(0, trafficEntities.length) : [];
      trafficEntities.forEach((entity, index) => {
        const sample = trafficNow[index];
        if (!sample) {
          entity.show = false;
          return;
        }
        entity.show = true;
        const position = Cesium.Cartesian3.fromDegrees(sample.lng, sample.lat, 2.8);
        entity.position = new Cesium.ConstantPositionProperty(position);
        entity.orientation = new Cesium.ConstantProperty(
          toOrientation(position, sample.bearing),
        );
      });

      if (!viewerDestroyedRef.current && isNavigatingRef.current) {
        updateChaseCamera(viewer, coordinates, navProgressRef.current, {
          altitude: 180,
          pitchDegrees: -22,
          lookAheadProgress: 0.015,
          damping: 0.2,
          speedFactor: speedMultiplierRef.current,
        });
      }
      viewer.scene.requestRender();
    };

    const clock = viewer.clock;
    clock?.onTick.addEventListener(tick);
    if (clock) clock.shouldAnimate = true;
    routeTickCleanupRef.current = () => {
      if (viewerDestroyedRef.current) return;
      clock?.onTick.removeEventListener(tick);
    };

    viewer.flyTo([routeLine, routeGlow, routeRemaining, mainCar], {
      duration: 1.4,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-28), 1800),
    });

    return () => {
      routeTickCleanupRef.current?.();
      routeTickCleanupRef.current = null;
    };
  }, [resetChaseCamera, routePayload, updateChaseCamera]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    let active = true;

    if (!visibleLayers.buildings) {
      if (osmBuildingsRef.current) {
        viewer.scene.primitives.remove(osmBuildingsRef.current);
        osmBuildingsRef.current = null;
      }
      viewer.scene.requestRender();
      return;
    }

    const attachBuildings = async () => {
      let tileset = osmBuildingsRef.current;

      if (!tileset) {
        tileset = await Cesium.createOsmBuildingsAsync();
        if (!active) return;

        viewer.scene.primitives.add(tileset);
        osmBuildingsRef.current = tileset;
      }

      tileset.style = new Cesium.Cesium3DTileStyle({
        color: toRgbaColor(buildingOpacity),
      });
      viewer.scene.requestRender();
    };

    void attachBuildings();

    return () => {
      active = false;
    };
  }, [buildingOpacity, visibleLayers.buildings]);

  return (
    <div className="relative h-full w-full bg-slate-900">
      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute top-3 right-3 z-20 flex gap-2 rounded-2xl border border-white/20 bg-slate-900/70 p-1.5 backdrop-blur">
        <button
          type="button"
          onClick={() => setBasemap("satelliteLabel")}
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            basemap === "satelliteLabel"
              ? "bg-white text-slate-900"
              : "text-white/80"
          }`}
          title="Satellite + labels"
        >
          <Globe className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setBasemap("satellite")}
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            basemap === "satellite"
              ? "bg-white text-slate-900"
              : "text-white/80"
          }`}
          title="Satellite"
        >
          <Satellite className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setBasemap("road")}
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            basemap === "road"
              ? "bg-white text-slate-900"
              : "text-white/80"
          }`}
          title="Road map"
        >
          <Map className="h-4 w-4" />
        </button>
      </div>

      {activeRoute ? (
        <ControlBoard
          progress={navProgress}
          isPlaying={isNavigating}
          speedMultiplier={speedMultiplier}
          availableSpeedMultipliers={availableSpeedMultipliers}
          onSeek={seek}
          onSetSpeed={setSpeedMultiplier}
          onTogglePlayback={() => {
            if (navProgress >= 1) seek(0);
            togglePlayback();
          }}
          onReset={() => {
            pause();
            reset();
          }}
          className="absolute right-3 bottom-3 z-30 w-[min(92vw,420px)] rounded-2xl border border-white/20 bg-slate-900/80 p-3 text-white backdrop-blur"
        />
      ) : null}

      {selectedBuilding && visibleLayers.buildings && (
        <div
          className="absolute z-20"
          style={{
            left: Math.max(12, selectedBuilding.position.x - 150),
            top:
              selectedBuilding.anchor === "top"
                ? selectedBuilding.position.y + 14
                : selectedBuilding.position.y - 240,
          }}
        >
          <FeaturePopupCard
            title={selectedBuilding.name}
            subtitle="3D extrusion"
            variant="building"
            onClose={() => setSelectedBuilding(null)}
            fields={[
              { label: "Type", value: selectedBuilding.kind },
              { label: "Height/Levels", value: selectedBuilding.height, tone: "info" },
              { label: "OSM ID", value: selectedBuilding.sourceId },
            ]}
          />
        </div>
      )}
    </div>
  );
}
