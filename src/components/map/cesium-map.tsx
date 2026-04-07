"use client";

import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";

import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import { useFloodStore } from "@/features/flood/store/flood.store";

type CesiumMapProps = {
  selectedPlace: PlaceItem | null;
  floodData: FloodGeoJson | null;
};

const CESIUM_ASSET_BASE_URL =
  "https://cesium.com/downloads/cesiumjs/releases/1.140/Build/Cesium/";
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

export function CesiumMap({ selectedPlace }: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const osmBuildingsRef = useRef<Cesium.Cesium3DTileset | null>(null);
  const { visibleLayers, buildingOpacity } = useFloodStore();
  const [selectedBuilding, setSelectedBuilding] =
    useState<SelectedBuildingInfo | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = createViewer(containerRef.current);
    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.globe.showWaterEffect = true;
    viewer.scene.requestRenderMode = true;

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
          setSelectedBuilding({
            name: getFeatureProperty(picked, ["name", "name:en"]),
            height: getFeatureProperty(picked, ["height", "building:levels"]),
            kind: getFeatureProperty(picked, ["building", "building:use"]),
            sourceId: getFeatureProperty(picked, ["id", "elementId"]),
          });
          return;
        }

        setSelectedBuilding(null);
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK,
    );

    return () => {
      clickHandler.destroy();
      if (osmBuildingsRef.current) {
        viewer.scene.primitives.remove(osmBuildingsRef.current);
        osmBuildingsRef.current = null;
      }
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

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

    let active = true;

    if (!visibleLayers.buildings) {
      if (osmBuildingsRef.current) {
        viewer.scene.primitives.remove(osmBuildingsRef.current);
        osmBuildingsRef.current = null;
      }
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
        <div className="pointer-events-none absolute top-4 right-4 z-20 w-[260px] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
          <div className="text-sm font-semibold text-slate-900">
            {selectedBuilding.name}
          </div>
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            <div>
              <span className="font-medium text-slate-800">Type:</span>{" "}
              {selectedBuilding.kind}
            </div>
            <div>
              <span className="font-medium text-slate-800">Height/Levels:</span>{" "}
              {selectedBuilding.height}
            </div>
            <div>
              <span className="font-medium text-slate-800">OSM ID:</span>{" "}
              {selectedBuilding.sourceId}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
