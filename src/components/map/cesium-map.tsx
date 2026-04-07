"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import type { PlaceItem } from "@/data/places";

type CesiumMapProps = {
  selectedPlace: PlaceItem | null;
};

export function CesiumMap({ selectedPlace }: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // ❌ KHÔNG dùng Ion nữa
    // window.CESIUM_BASE_URL = "/";
    // Cesium.Ion.defaultAccessToken = "...";

    const viewer = new Cesium.Viewer(containerRef.current, {
      // ❌ bỏ terrain
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),

      // UI gọn
      animation: false,
      timeline: false,
      baseLayerPicker: true,
      sceneModePicker: false,
      geocoder: false,
      navigationHelpButton: false,
      homeButton: true,
      infoBox: false,
      selectionIndicator: false,
    });

    viewer.scene.globe.depthTestAgainstTerrain = false;

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

  return <div ref={containerRef} className="h-full w-full" />;
}
