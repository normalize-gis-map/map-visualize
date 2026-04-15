import type { Feature, Geometry } from "geojson";
import type maplibregl from "maplibre-gl";

import type { TimeMode, WeatherMode } from "@/features/map/lib/weather/weather-types";

export type WaterFeature = Feature<Geometry>;

export type WaterGeometryBuffers = {
  vertices: Float32Array;
  vertexCount: number;
};

export type WaterShaderConfig = {
  baseColor: [number, number, number];
  highlightColor: [number, number, number];
  opacity: number;
  rippleScale: number;
  flowDirection: [number, number];
};

export type BoatSample = {
  lng: number;
  lat: number;
  direction: [number, number];
  speed: number;
};

export type WakeState = {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  age: number;
  strength: number;
  alive: boolean;
};

export type WaterSceneContext = {
  weatherMode: WeatherMode;
  timeMode: TimeMode;
};

export type WaterCustomLayer = maplibregl.CustomLayerInterface & {
  setWaterFeatures: (features: WaterFeature[]) => void;
  setBoatSamples: (boats: BoatSample[]) => void;
  setSceneContext: (scene: WaterSceneContext) => void;
};
