import type { Feature, Geometry } from "geojson";
import type maplibregl from "maplibre-gl";

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

export type WaterCustomLayer = maplibregl.CustomLayerInterface & {
  setWaterFeatures: (features: WaterFeature[]) => void;
};
