import { create } from "zustand";

export type MapMode = "2d" | "2.5d" | "3d";
export type MapEngine = "maplibre" | "cesium";
export type LayerKey =
  | "flood"
  | "buildings"
  | "drainage"
  | "roads"
  | "riskZones";

type VisibleLayers = Record<LayerKey, boolean>;

type FloodStore = {
  mapMode: MapMode;
  mapEngine: MapEngine;
  visibleLayers: VisibleLayers;
  buildingOpacity: number;
  setMapMode: (mode: MapMode) => void;
  setMapEngine: (engine: MapEngine) => void;
  toggleLayer: (layer: LayerKey) => void;
  setBuildingOpacity: (value: number) => void;
  mapInteractionTick: number;
  notifyMapInteraction: () => void;
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
  buildingOpacity: 0.9,
  mapInteractionTick: 0,
  setMapMode: (mapMode) => set({ mapMode }),
  setMapEngine: (mapEngine) => set({ mapEngine }),
  toggleLayer: (layer) =>
    set((state) => ({
      visibleLayers: {
        ...state.visibleLayers,
        [layer]: !state.visibleLayers[layer],
      },
    })),
  setBuildingOpacity: (buildingOpacity) => set({ buildingOpacity }),
  notifyMapInteraction: () =>
    set((state) => ({ mapInteractionTick: state.mapInteractionTick + 1 })),
}));
