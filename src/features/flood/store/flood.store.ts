import { create } from "zustand";

export type MapMode = "2d" | "2.5d" | "3d";
export type MapEngine = "maplibre" | "cesium";
export type LayerKey =
  | "flood"
  | "buildings"
  | "drainage"
  | "roads"
  | "riskZones";

type FloodStore = {
  mapMode: MapMode;
  mapEngine: MapEngine;
  visibleLayers: Record<LayerKey, boolean>;
  setMapMode: (mode: MapMode) => void;
  setMapEngine: (engine: MapEngine) => void;
  toggleLayer: (layer: LayerKey) => void;
};

export const useFloodStore = create<FloodStore>((set) => ({
  mapMode: "2d",
  mapEngine: "maplibre",
  visibleLayers: {
    flood: false,
    buildings: false,
    drainage: false,
    roads: false,
    riskZones: false,
  },
  setMapMode: (mapMode) => set({ mapMode }),
  setMapEngine: (mapEngine) => set({ mapEngine }),
  toggleLayer: (layer) =>
    set((state) => ({
      visibleLayers: {
        ...state.visibleLayers,
        [layer]: !state.visibleLayers[layer],
      },
    })),
}));
