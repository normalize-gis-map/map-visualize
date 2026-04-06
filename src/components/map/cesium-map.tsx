"use client";

import { useEffect, useRef } from "react";
import * as Cesium from "cesium";

import type { PlaceItem } from "@/data/places";

type CesiumMapProps = {
  selectedPlace: PlaceItem | null;
};

export function CesiumMap({ selectedPlace }: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
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

    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewerRef.current = viewer;

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
        2000,
      ),
      duration: 1.5,
    });
  }, [selectedPlace]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute top-4 right-4 rounded-xl bg-white/90 px-3 py-2 text-xs font-medium text-slate-600 shadow backdrop-blur">
        Cesium 3D
      </div>
    </div>
  );
}
