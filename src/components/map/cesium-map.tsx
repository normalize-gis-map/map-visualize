"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

import type { PlaceItem } from "@/data/places";

type CesiumMapProps = {
  selectedPlace: PlaceItem | null;
};

const CESIUM_ASSET_BASE_URL =
  "https://cesium.com/downloads/cesiumjs/releases/1.140/Build/Cesium/";

function createViewer(container: HTMLDivElement) {
  (
    globalThis as typeof globalThis & {
      CESIUM_BASE_URL?: string;
    }
  ).CESIUM_BASE_URL = CESIUM_ASSET_BASE_URL;

  const imageryProvider = new Cesium.OpenStreetMapImageryProvider({
    url: "https://tile.openstreetmap.org/",
  });

  return new Cesium.Viewer(container, {
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    baseLayer: new Cesium.ImageryLayer(imageryProvider),
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

export function CesiumMap({ selectedPlace }: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = createViewer(containerRef.current);

    viewer.scene.globe.depthTestAgainstTerrain = false;
    viewer.scene.requestRenderMode = true;

    viewerRef.current = viewer;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(106.73, 10.82, 15000),
      duration: 1.5,
    });

    return () => {
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

  return <div ref={containerRef} className="h-full w-full bg-slate-900" />;
}
