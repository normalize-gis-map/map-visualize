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

type OverpassWay = {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

type OverpassResponse = {
  elements: OverpassWay[];
};

const CESIUM_ASSET_BASE_URL =
  "https://cesium.com/downloads/cesiumjs/releases/1.140/Build/Cesium/";
const BUILDING_RADIUS_METERS = 1800;
const OVERPASS_ENDPOINT = "https://overpass.kumi.systems/api/interpreter";
const OSM_RETRY_COOLDOWN_MS = 120000;

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

function parseBuildingHeight(tags?: Record<string, string>) {
  const explicitHeight = Number.parseFloat(tags?.height ?? "");
  if (Number.isFinite(explicitHeight)) {
    return Math.max(explicitHeight, 8);
  }

  const levels = Number.parseInt(tags?.["building:levels"] ?? "", 10);
  if (Number.isFinite(levels)) {
    return Math.max(levels * 3, 9);
  }

  return 12;
}

async function fetchOsmBuildingWays(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
) {
  const query = `[out:json][timeout:25];way["building"](around:${BUILDING_RADIUS_METERS},${latitude},${longitude});out geom;`;
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch OSM building footprints");
  }

  const json = (await response.json()) as OverpassResponse;
  return json.elements.filter((element) => element.type === "way");
}

function renderFallbackBuildings(
  viewer: Cesium.Viewer,
  floodData: FloodGeoJson,
  buildingOpacity: number,
) {
  const ids: string[] = [];

  floodData.features.slice(0, 120).forEach((feature, index) => {
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
          Cesium.Color.fromCssColorString("#2563eb").withAlpha(buildingOpacity),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString("#1e3a8a").withAlpha(
          Math.min(buildingOpacity + 0.15, 1),
        ),
      },
    });

    ids.push(entityId);
  });

  return ids;
}

export function CesiumMap({ selectedPlace, floodData }: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const buildingEntitiesRef = useRef<string[]>([]);
  const lastBuildingFetchKeyRef = useRef<string>("");
  const osmUnavailableUntilRef = useRef(0);
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

    if (!visibleLayers.buildings) {
      for (const entityId of buildingEntitiesRef.current) {
        viewer.entities.removeById(entityId);
      }
      buildingEntitiesRef.current = [];
      lastBuildingFetchKeyRef.current = "";
      return;
    }
    let active = true;
    let abortController: AbortController | null = null;

    const renderBuildings = () => {
      const cameraPosition = viewer.camera.positionCartographic;
      const latitude = Cesium.Math.toDegrees(cameraPosition.latitude);
      const longitude = Cesium.Math.toDegrees(cameraPosition.longitude);
      const fetchKey = `${latitude.toFixed(3)}:${longitude.toFixed(3)}:${buildingOpacity.toFixed(2)}`;

      if (fetchKey === lastBuildingFetchKeyRef.current) return;
      lastBuildingFetchKeyRef.current = fetchKey;

      for (const entityId of buildingEntitiesRef.current) {
        viewer.entities.removeById(entityId);
      }
      buildingEntitiesRef.current = [];

      abortController?.abort();
      abortController = new AbortController();

      if (Date.now() < osmUnavailableUntilRef.current) {
        if (!floodData) return;
        buildingEntitiesRef.current = renderFallbackBuildings(
          viewer,
          floodData,
          buildingOpacity,
        );
        return;
      }

      void fetchOsmBuildingWays(latitude, longitude, abortController.signal)
        .then((ways) => {
          if (!active) return;
          osmUnavailableUntilRef.current = 0;

          const ids: string[] = [];

          ways.slice(0, 450).forEach((way) => {
            const geometry = way.geometry;
            if (!geometry || geometry.length < 3) return;

            const positions = geometry.map((point) =>
              Cesium.Cartesian3.fromDegrees(point.lon, point.lat),
            );
            const first = geometry[0];
            const last = geometry[geometry.length - 1];
            if (
              first &&
              last &&
              (first.lon !== last.lon || first.lat !== last.lat)
            ) {
              positions.push(
                Cesium.Cartesian3.fromDegrees(first.lon, first.lat),
              );
            }

            const height = parseBuildingHeight(way.tags);
            const entityId = `osm-building-${way.id}`;

            viewer.entities.add({
              id: entityId,
              polygon: {
                hierarchy: positions,
                extrudedHeight: height,
                material:
                  Cesium.Color.fromCssColorString("#2563eb").withAlpha(
                    buildingOpacity,
                  ),
                outline: true,
                outlineColor: Cesium.Color.fromCssColorString(
                  "#1e3a8a",
                ).withAlpha(Math.min(buildingOpacity + 0.2, 1)),
              },
            });

            ids.push(entityId);
          });

          buildingEntitiesRef.current = ids;
        })
        .catch(() => {
          osmUnavailableUntilRef.current = Date.now() + OSM_RETRY_COOLDOWN_MS;
          if (!active || !floodData) return;
          buildingEntitiesRef.current = renderFallbackBuildings(
            viewer,
            floodData,
            buildingOpacity,
          );
        });
    };

    renderBuildings();
    viewer.camera.moveEnd.addEventListener(renderBuildings);

    return () => {
      active = false;
      abortController?.abort();
      viewer.camera.moveEnd.removeEventListener(renderBuildings);
    };
  }, [buildingOpacity, floodData, visibleLayers.buildings]);

  return <div ref={containerRef} className="h-full w-full bg-slate-900" />;
}
