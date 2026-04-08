import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
};

export const useFloodStore = create<FloodStore>()(
  persist(
    (set) => ({
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
      hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
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
    }),
    {
      name: "flood-map-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mapMode: state.mapMode,
        mapEngine: state.mapEngine,
        visibleLayers: state.visibleLayers,
        buildingOpacity: state.buildingOpacity,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
