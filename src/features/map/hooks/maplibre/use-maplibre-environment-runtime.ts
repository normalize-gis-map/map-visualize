import type { FeatureCollection } from "geojson";
import type maplibregl from "maplibre-gl";
import { useEffect } from "react";

import type { AmbientTrafficRoute, AmbientTrafficVehicle } from "@/features/map/hooks/use-ambient-traffic";
import { buildBuildingShadows, type ShadowSceneTuning } from "@/features/map/lib/buildings/building-shadows";
import type { SceneLodProfile } from "@/features/map/lib/lod/lod-types";
import { shadowMaxFeaturesFromLod } from "@/features/map/lib/lod/scene-lod";
import type { SceneProfile } from "@/features/map/lib/scene/scene-profile";
import { applySceneLighting } from "@/features/map/lib/scene/scene-sync-light";
import { deriveTrafficSceneTuning } from "@/features/map/lib/scene/scene-sync-traffic";
import { buildWaterSceneContext } from "@/features/map/lib/scene/scene-sync-water";
import type { SceneToneMapping } from "@/features/map/lib/scene/scene-tonemapping";
import { buildAmbientTrafficSource } from "@/features/map/lib/traffic/build-ambient-traffic-source";
import { buildBoatEntities } from "@/features/map/lib/transport/boat-entities";
import { buildTransportEntities } from "@/features/map/lib/transport/transport-entities";
import { buildViewportVegetation } from "@/features/map/lib/vegetation/build-viewport-vegetation";
import { buildViewportWaterEffect } from "@/features/map/lib/water/build-viewport-water-effect";
import { createWaterCustomLayer } from "@/features/map/lib/water/water-custom-layer";
import { ensureWaterLayerOrder } from "@/features/map/lib/water/water-layer-order";
import { extractBoatSamples } from "@/features/map/lib/water/water-wake-system";
import type { TimeMode, WeatherMode } from "@/features/map/store/map.store";

type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type TransportVisibility = Record<"cars" | "boats" | "bike" | "people", boolean>;

type Params = {
  ambientRoutes: AmbientTrafficRoute[];
  boatEntitySourceId: string;
  boatCabinLayerId: string;
  boatDeckLayerId: string;
  boatWakeLayerId: string;
  boatHullLayerId: string;
  boatShadowLayerId: string;
  buildingShadowLayerId: string;
  buildingShadowSourceId: string;
  detailPreset: "balanced" | "high";
  lodProfile: SceneLodProfile;
  mapBounds: Bounds | null;
  mapInstance: maplibregl.Map | null;
  mapZoom: number;
  parkTreeCanopyLayerId: string;
  parkTreeHighlightLayerId: string;
  parkTreeShadowLayerId: string;
  parkTreeSourceId: string;
  peopleLayerId: string;
  bikeLayerId: string;
  sceneControllerRef: React.MutableRefObject<{ tick: () => SceneProfile; getToneMapping: () => SceneToneMapping } | null>;
  sceneProfileRef: React.MutableRefObject<SceneProfile>;
  sceneToneRef: React.MutableRefObject<SceneToneMapping>;
  setSceneToneMapping: React.Dispatch<React.SetStateAction<SceneToneMapping>>;
  setSceneUiProfile: React.Dispatch<React.SetStateAction<SceneProfile>>;
  timeMode: TimeMode;
  transportEntitySourceId: string;
  transportPhaseRef: React.MutableRefObject<number>;
  transportVisibility: TransportVisibility;
  visibleAmbientTraffic: AmbientTrafficVehicle[];
  visibleLayersBuildings: boolean;
  visibleWaterFeaturesRef: React.MutableRefObject<FeatureCollection["features"]>;
  waterCustomLayerRef: React.MutableRefObject<ReturnType<typeof createWaterCustomLayer> | null>;
  weatherMode: WeatherMode;
  ambientTrafficBodyLayerId: string;
  ambientTrafficRoofLayerId: string;
  ambientTrafficShadowLayerId: string;
  ambientTrafficSourceId: string;
  ambientTrafficWindshieldLayerId: string;
};

export function useMaplibreEnvironmentRuntime({
  ambientRoutes,
  boatEntitySourceId,
  boatCabinLayerId,
  boatDeckLayerId,
  boatWakeLayerId,
  boatHullLayerId,
  boatShadowLayerId,
  buildingShadowLayerId,
  buildingShadowSourceId,
  detailPreset,
  lodProfile,
  mapBounds,
  mapInstance,
  mapZoom,
  parkTreeCanopyLayerId,
  parkTreeHighlightLayerId,
  parkTreeShadowLayerId,
  parkTreeSourceId,
  peopleLayerId,
  bikeLayerId,
  sceneControllerRef,
  sceneProfileRef,
  sceneToneRef,
  setSceneToneMapping,
  setSceneUiProfile,
  timeMode,
  transportEntitySourceId,
  transportPhaseRef,
  transportVisibility,
  visibleAmbientTraffic,
  visibleLayersBuildings,
  visibleWaterFeaturesRef,
  waterCustomLayerRef,
  weatherMode,
  ambientTrafficBodyLayerId,
  ambientTrafficRoofLayerId,
  ambientTrafficShadowLayerId,
  ambientTrafficSourceId,
  ambientTrafficWindshieldLayerId,
}: Params) {
  useEffect(() => {
    if (!mapInstance) return;

    const ensureAmbientTrafficLayers = () => {
      const style = mapInstance.getStyle();
      if (!style?.layers?.length) return;

      const beforeLayerId = style.layers.find(
        (layer) => layer.type === "fill-extrusion" && /building/i.test(layer.id),
      )?.id;
      if (!beforeLayerId) return;

      const sourceData = buildAmbientTrafficSource(visibleAmbientTraffic, mapZoom);
      const source = mapInstance.getSource(ambientTrafficSourceId) as maplibregl.GeoJSONSource | null;

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
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.08, 16, 0.12, 20, 0.16],
        },
      });

      addOrMoveLayer({
        id: ambientTrafficBodyLayerId,
        type: "fill-extrusion",
        source: ambientTrafficSourceId,
        filter: ["==", ["get", "part"], "body"],
        paint: {
          "fill-extrusion-color": ["match", ["get", "roadClass"], "major", "#d8dde5", "medium", "#c8d0db", "#bcc4d0"],
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
    ambientTrafficBodyLayerId,
    ambientTrafficRoofLayerId,
    ambientTrafficShadowLayerId,
    ambientTrafficSourceId,
    ambientTrafficWindshieldLayerId,
    mapInstance,
    mapZoom,
    visibleAmbientTraffic,
  ]);

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
          ?.filter((layer) => layer.type === "fill" && /(water|ocean|river|lake)/i.test(layer.id))
          .map((layer) => layer.id)
          .slice(0, 4) ?? [];
      const firstRoadBridgeLayerId = style.layers?.find((layer) => /(bridge|road|street|highway)/i.test(layer.id))?.id;
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
          mapInstance.addLayer(waterCustomLayerRef.current as maplibregl.CustomLayerInterface, firstRoadBridgeLayerId);
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
        const boatSource = mapInstance.getSource(boatEntitySourceId) as maplibregl.GeoJSONSource | undefined;
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
          ?.filter((layer) => layer.type === "fill" && /(park|green|grass)/i.test(layer.id))
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

      const source = mapInstance.getSource(parkTreeSourceId) as maplibregl.GeoJSONSource | undefined;
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
          ?.filter((layer) => layer.type === "fill-extrusion" && layer.id.toLowerCase().includes("building"))
          .map((layer) => layer.id) ?? [];

      if (visibleLayersBuildings && buildingLayerIds.length && lodProfile.shadowQuality !== "off") {
        const buildingFeatures = mapInstance.queryRenderedFeatures(queryBox, {
          layers: buildingLayerIds.slice(0, 3),
        });
        const shadowProfile = sceneProfileRef.current;
        const shadowTuning: ShadowSceneTuning | undefined = shadowProfile
          ? {
              lightDirection: shadowProfile.lightDirection,
              shadowLength: shadowProfile.shadowLength,
              shadowSoftness: shadowProfile.shadowSoftness,
              shadowIntensity: shadowProfile.sun.intensity,
            }
          : undefined;
        const shadowData = buildBuildingShadows(
          buildingFeatures,
          timeMode,
          shadowMaxFeaturesFromLod(lodProfile),
          shadowTuning,
        );
        const shadowSource = mapInstance.getSource(buildingShadowSourceId) as maplibregl.GeoJSONSource | undefined;

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
        const shadowSource = mapInstance.getSource(buildingShadowSourceId) as maplibregl.GeoJSONSource | undefined;
        shadowSource?.setData({ type: "FeatureCollection", features: [] });
      }

      addLayerIfMissing({
        id: parkTreeShadowLayerId,
        type: "circle",
        source: parkTreeSourceId,
        minzoom: 13,
        paint: {
          "circle-color": "#23311f",
          "circle-opacity": ["match", ["get", "greenMode"], "grass_first", 0.11, "dense_wooded", 0.24, 0.2],
          "circle-translate": [1.4, 1.7],
          "circle-radius": ["*", ["match", ["get", "treeType"], "tall", 2.9, "compact", 2.4, 2.05], ["coalesce", ["get", "treeScale"], 1]],
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
            ["match", ["get", "treeArchetype"], "pine", "#4c7d45", "broadleaf", "#5a9261", "ornamental", "#73aa6f", "waterside", "#66a985", "#5e9362"],
            ["==", ["get", "treeTone"], "warm"],
            ["match", ["get", "treeArchetype"], "pine", "#567737", "broadleaf", "#688e44", "ornamental", "#78a25e", "waterside", "#6a9a6e", "#658d4d"],
            ["match", ["get", "treeArchetype"], "pine", "#4d7a3b", "broadleaf", "#5c8f4a", "ornamental", "#6ea55f", "waterside", "#5f9c70", "#5b8e45"],
          ],
          "circle-opacity": ["match", ["get", "greenMode"], "grass_first", 0.63, "dense_wooded", 0.82, 0.78],
          "circle-radius": ["*", ["match", ["get", "treeType"], "tall", 2.6, "compact", 2.1, 1.8], ["coalesce", ["get", "treeScale"], 1]],
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
          "circle-opacity": ["match", ["get", "greenMode"], "grass_first", 0.18, "dense_wooded", 0.23, 0.28],
          "circle-translate": [-0.6, -0.6],
          "circle-radius": ["*", ["match", ["get", "treeType"], "tall", 1.1, "compact", 0.9, 0.7], ["coalesce", ["get", "treeScale"], 1]],
        },
      });

      const transportSource = mapInstance.getSource(transportEntitySourceId) as maplibregl.GeoJSONSource | undefined;
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
        id: boatWakeLayerId,
        type: "line",
        source: boatEntitySourceId,
        filter: ["==", ["get", "part"], "wake"],
        minzoom: 12,
        paint: {
          "line-color": "#d7efff",
          "line-opacity": [
            "*",
            ["coalesce", ["get", "wakeOpacity"], 0.24],
            ["interpolate", ["linear"], ["zoom"], 12, 0.55, 17, 0.3],
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.3, 17, 0.85],
          "line-blur": ["interpolate", ["linear"], ["zoom"], 12, 0.35, 17, 0.6],
        },
      });
      addLayerIfMissing({
        id: bikeLayerId,
        type: "circle",
        source: transportEntitySourceId,
        filter: ["==", ["get", "mode"], "bike"],
        minzoom: 13,
        paint: {
          "circle-color": ["match", ["get", "roadClass"], "local", "#8ff3a5", "medium", "#84e9a9", "#9bf98f"],
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
    bikeLayerId,
    boatCabinLayerId,
    boatDeckLayerId,
    boatWakeLayerId,
    boatEntitySourceId,
    boatHullLayerId,
    boatShadowLayerId,
    buildingShadowLayerId,
    buildingShadowSourceId,
    detailPreset,
    lodProfile,
    mapBounds,
    mapInstance,
    mapZoom,
    parkTreeCanopyLayerId,
    parkTreeHighlightLayerId,
    parkTreeShadowLayerId,
    parkTreeSourceId,
    peopleLayerId,
    sceneControllerRef,
    sceneProfileRef,
    sceneToneRef,
    setSceneToneMapping,
    setSceneUiProfile,
    timeMode,
    transportEntitySourceId,
    transportPhaseRef,
    transportVisibility,
    visibleLayersBuildings,
    visibleWaterFeaturesRef,
    waterCustomLayerRef,
    weatherMode,
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
        const transportSource = mapInstance.getSource(transportEntitySourceId) as maplibregl.GeoJSONSource | undefined;
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
        const boatSource = mapInstance.getSource(boatEntitySourceId) as maplibregl.GeoJSONSource | undefined;
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
    lodProfile,
    mapBounds,
    mapInstance,
    mapZoom,
    sceneControllerRef,
    sceneProfileRef,
    sceneToneRef,
    setSceneToneMapping,
    setSceneUiProfile,
    timeMode,
    transportEntitySourceId,
    transportPhaseRef,
    transportVisibility,
    visibleWaterFeaturesRef,
    waterCustomLayerRef,
    weatherMode,
  ]);
}
