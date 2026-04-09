"use client";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import type { RouteAlternative } from "@/features/map/types/route.types";
import { useMapStore } from "@/features/map/store/map.store";
import { FeaturePopupCard } from "@/components/map/feature-popup";
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

export function CesiumMap({ selectedPlace, routePayload }: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const osmBuildingsRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const routeTickCleanupRef = useRef<(() => void) | null>(null);
  const { visibleLayers, buildingOpacity, notifyMapInteraction } = useMapStore();
  const [selectedBuilding, setSelectedBuilding] =
    useState<SelectedBuildingInfo | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = createViewer(containerRef.current);
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
      if (osmBuildingsRef.current) {
        viewer.scene.primitives.remove(osmBuildingsRef.current);
        osmBuildingsRef.current = null;
      }
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

    viewer.entities.removeById("route-main");
    viewer.entities.removeById("route-car");
    viewer.entities.removeById("route-traffic-1");
    viewer.entities.removeById("route-traffic-2");
    viewer.entities.removeById("route-traffic-3");
    routeTickCleanupRef.current?.();
    routeTickCleanupRef.current = null;

    if (!routePayload) return;
    const activeRoute = routePayload.routes[routePayload.activeIndex];
    const coordinates = activeRoute.geometry.coordinates;
    if (!coordinates.length) return;

    const cartesianPath = coordinates.map((coord) =>
      Cesium.Cartesian3.fromDegrees(coord[0], coord[1], 3),
    );
    const routeLine = viewer.entities.add({
      id: "route-main",
      polyline: {
        positions: cartesianPath,
        width: 5,
        material: Cesium.Color.fromCssColorString("#2563eb").withAlpha(0.9),
        clampToGround: true,
      },
    });

    const sampleAt = (progress: number) => {
      const scaled = progress * (coordinates.length - 1);
      const index = Math.min(
        coordinates.length - 2,
        Math.max(0, Math.floor(scaled)),
      );
      const t = scaled - index;
      const pointA = coordinates[index];
      const pointB = coordinates[index + 1];
      if (!pointA || !pointB) return Cesium.Cartesian3.fromDegrees(0, 0, 3);

      const lng = pointA[0] + (pointB[0] - pointA[0]) * t;
      const lat = pointA[1] + (pointB[1] - pointA[1]) * t;
      return Cesium.Cartesian3.fromDegrees(lng, lat, 3);
    };

    const createCarEntity = (id: string, progress: number, scale = 12) =>
      viewer.entities.add({
        id,
        position: sampleAt(progress),
        model: {
          uri: CAR_MODEL_URL,
          minimumPixelSize: 26,
          maximumScale: scale,
          scale: 1.6,
        },
      });

    const mainCar = createCarEntity("route-car", 0.001, 15);
    const traffic1 = createCarEntity("route-traffic-1", 0.16);
    const traffic2 = createCarEntity("route-traffic-2", 0.31);
    const traffic3 = createCarEntity("route-traffic-3", 0.49);

    let progress = 0;
    const tick = () => {
      progress = (progress + 0.0008) % 1;
      const positions = [
        sampleAt(progress),
        sampleAt((progress + 0.18) % 1),
        sampleAt((progress + 0.35) % 1),
        sampleAt((progress + 0.52) % 1),
      ];
      mainCar.position = new Cesium.ConstantPositionProperty(positions[0]);
      traffic1.position = new Cesium.ConstantPositionProperty(positions[1]);
      traffic2.position = new Cesium.ConstantPositionProperty(positions[2]);
      traffic3.position = new Cesium.ConstantPositionProperty(positions[3]);
      viewer.scene.requestRender();
    };

    viewer.clock?.onTick.addEventListener(tick);
    if (viewer.clock) {
      viewer.clock.shouldAnimate = true;
    }
    routeTickCleanupRef.current = () => {
      viewer.clock?.onTick.removeEventListener(tick);
    };

    viewer.flyTo([routeLine, mainCar], {
      duration: 1.4,
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-28), 1800),
    });

    return () => {
      routeTickCleanupRef.current?.();
      routeTickCleanupRef.current = null;
    };
  }, [routePayload]);

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
