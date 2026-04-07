"use client";

import { useEffect, useRef } from "react";
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

export function CesiumMap({ selectedPlace, floodData }: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const buildingEntitiesRef = useRef<string[]>([]);
  const { visibleLayers, buildingOpacity } = useFloodStore();

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

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    for (const entityId of buildingEntitiesRef.current) {
      viewer.entities.removeById(entityId);
    }
    buildingEntitiesRef.current = [];

    if (!visibleLayers.buildings || !floodData) {
      return;
    }

    const maxBuildings = 120;
    const buildingIds: string[] = [];

    floodData.features.slice(0, maxBuildings).forEach((feature, index) => {
      if (feature.geometry.type !== "Polygon") return;

      const ring = feature.geometry.coordinates[0];
      if (!ring?.length) return;

      const [longitude, latitude] = ring.reduce(
        (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
        [0, 0],
      );
      const lng = longitude / ring.length;
      const lat = latitude / ring.length;

      const height = 20 + (feature.properties.riskScore ?? 0.5) * 45;
      const width = 24 + (index % 5) * 8;
      const depth = 20 + (index % 4) * 6;
      const entityId = `cesium-building-${feature.properties.id}-${index}`;

      viewer.entities.add({
        id: entityId,
        name: `Building ${index + 1}`,
        position: Cesium.Cartesian3.fromDegrees(lng, lat, height / 2),
        box: {
          dimensions: new Cesium.Cartesian3(width, depth, height),
          material:
            Cesium.Color.fromCssColorString("#2563eb").withAlpha(
              buildingOpacity,
            ),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#1e3a8a").withAlpha(
            Math.min(buildingOpacity + 0.15, 1),
          ),
        },
      });

      buildingIds.push(entityId);
    });

    buildingEntitiesRef.current = buildingIds;
  }, [buildingOpacity, floodData, visibleLayers.buildings]);

  return <div ref={containerRef} className="h-full w-full bg-slate-900" />;
}
