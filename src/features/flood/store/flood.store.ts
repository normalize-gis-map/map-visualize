import { create } from "zustand";
import type { FloodGeoJson } from "@/src/features/flood/types/flood.types";

export type MapMode = "2d" | "2.5d" | "3d";
export type LayerKey = "flood" | "drainage" | "roads" | "riskZones";

type FloodStore = {
  data: FloodGeoJson | null;
  mapMode: MapMode;
  selectedAreaId: string | null;
  visibleLayers: Record<LayerKey, boolean>;
  setData: (data: FloodGeoJson) => void;
  setMapMode: (mode: MapMode) => void;
  setSelectedAreaId: (id: string | null) => void;
  toggleLayer: (layer: LayerKey) => void;
};

export const useFloodStore = create<FloodStore>((set) => ({
  data: null,
  mapMode: "2d",
  selectedAreaId: null,
  visibleLayers: {
    flood: true,
    drainage: false,
    roads: false,
    riskZones: false,
  },
  setData: (data) => set({ data }),
  setMapMode: (mapMode) => set({ mapMode }),
  setSelectedAreaId: (selectedAreaId) => set({ selectedAreaId }),
  toggleLayer: (layer) =>
    set((state) => ({
      visibleLayers: {
        ...state.visibleLayers,
        [layer]: !state.visibleLayers[layer],
      },
    })),
}));
