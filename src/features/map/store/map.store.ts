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

export type TrafficDensity = "off" | "light" | "full";
export type DetailPreset = "balanced" | "high";
export type TransportMode = "cars" | "boats" | "bike" | "people";
export type WeatherMode = "sun" | "rain" | "snow";
export type TimeMode = "live" | "night" | "morning" | "noon" | "evening";

type VisibleLayers = Record<LayerKey, boolean>;
type TransportVisibility = Record<TransportMode, boolean>;

type MapUiStore = {
  mapMode: MapMode;
  mapEngine: MapEngine;
  visibleLayers: VisibleLayers;
  buildingOpacity: number;
  trafficVisualizationEnabled: boolean;
  trafficDensity: TrafficDensity;
  laneDetailEnabled: boolean;
  routeAutoCameraEnabled: boolean;
  detailPreset: DetailPreset;
  transportVisibility: TransportVisibility;
  weatherMode: WeatherMode;
  timeMode: TimeMode;
  setMapMode: (mode: MapMode) => void;
  setMapEngine: (engine: MapEngine) => void;
  toggleLayer: (layer: LayerKey) => void;
  setBuildingOpacity: (value: number) => void;
  toggleTrafficVisualization: () => void;
  setTrafficDensity: (density: TrafficDensity) => void;
  setLaneDetailEnabled: (enabled: boolean) => void;
  setRouteAutoCameraEnabled: (enabled: boolean) => void;
  setDetailPreset: (preset: DetailPreset) => void;
  toggleTransportMode: (mode: TransportMode) => void;
  setWeatherMode: (mode: WeatherMode) => void;
  setTimeMode: (mode: TimeMode) => void;
  mapInteractionTick: number;
  notifyMapInteraction: () => void;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
};

export const useMapStore = create<MapUiStore>()(
  persist(
    (set) => ({
      mapMode: "2.5d",
      mapEngine: "maplibre",
      visibleLayers: {
        flood: false,
        buildings: false,
        drainage: false,
        roads: false,
        riskZones: false,
      },
      buildingOpacity: 1,
      trafficVisualizationEnabled: true,
      trafficDensity: "light",
      laneDetailEnabled: true,
      routeAutoCameraEnabled: true,
      detailPreset: "balanced",
      transportVisibility: {
        cars: true,
        boats: false,
        bike: false,
        people: false,
      },
      weatherMode: "rain",
      timeMode: "live",
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
      toggleTrafficVisualization: () =>
        set((state) => ({
          trafficVisualizationEnabled: !state.trafficVisualizationEnabled,
          trafficDensity: state.trafficVisualizationEnabled ? "off" : "light",
        })),
      setTrafficDensity: (trafficDensity) =>
        set({
          trafficDensity,
          trafficVisualizationEnabled: trafficDensity !== "off",
        }),
      setLaneDetailEnabled: (laneDetailEnabled) => set({ laneDetailEnabled }),
      setRouteAutoCameraEnabled: (routeAutoCameraEnabled) =>
        set({ routeAutoCameraEnabled }),
      setDetailPreset: (detailPreset) => set({ detailPreset }),
      toggleTransportMode: (mode) =>
        set((state) => ({
          transportVisibility: {
            ...state.transportVisibility,
            [mode]: !state.transportVisibility[mode],
          },
          trafficDensity:
            mode === "cars"
              ? state.transportVisibility.cars
                ? "off"
                : state.trafficDensity === "off"
                  ? "light"
                  : state.trafficDensity
              : state.trafficDensity,
          trafficVisualizationEnabled:
            mode === "cars"
              ? !state.transportVisibility.cars
              : state.trafficVisualizationEnabled,
        })),
      setWeatherMode: (weatherMode) => set({ weatherMode }),
      setTimeMode: (timeMode) => set({ timeMode }),
      notifyMapInteraction: () =>
        set((state) => ({ mapInteractionTick: state.mapInteractionTick + 1 })),
    }),
    {
      name: "map-ui-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        mapMode: state.mapMode,
        mapEngine: state.mapEngine,
        visibleLayers: state.visibleLayers,
        buildingOpacity: state.buildingOpacity,
        trafficVisualizationEnabled: state.trafficVisualizationEnabled,
        trafficDensity: state.trafficDensity,
        laneDetailEnabled: state.laneDetailEnabled,
        routeAutoCameraEnabled: state.routeAutoCameraEnabled,
        detailPreset: state.detailPreset,
        transportVisibility: state.transportVisibility,
        weatherMode: state.weatherMode,
        timeMode: state.timeMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.mapMode === "2d") {
          state.setMapMode("2.5d");
        }
        if (state && state.buildingOpacity !== 1) {
          state.setBuildingOpacity(1);
        }
        state?.setHasHydrated(true);
      },
    },
  ),
);

// Backward-compat alias during migration.
export const useFloodStore = useMapStore;
