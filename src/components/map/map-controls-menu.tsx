"use client";

import {
  CarFront,
  Gauge,
  Layers3,
  Orbit,
  Route,
  Waypoints,
} from "lucide-react";

import { useFloodStore } from "@/features/map/store/map.store";

export function MapControlsMenu() {
  const {
    mapEngine,
    mapMode,
    trafficVisualizationEnabled,
    trafficDensity,
    laneDetailEnabled,
    routeAutoCameraEnabled,
    detailPreset,
    setMapEngine,
    setMapMode,
    setTrafficDensity,
    setLaneDetailEnabled,
    setRouteAutoCameraEnabled,
    setDetailPreset,
  } = useFloodStore();

  const handleSelectEngine = (engine: "maplibre" | "cesium") => {
    setMapEngine(engine);

    if (engine === "maplibre") {
      setMapMode("2.5d");
    } else {
      setMapMode("3d");
    }
  };

  const handleSelectMode = (mode: "2d" | "2.5d" | "3d") => {
    setMapMode(mode);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-sm backdrop-blur-xl">
      <button
        type="button"
        onClick={() => handleSelectEngine("maplibre")}
        className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-semibold transition ${
          mapEngine === "maplibre"
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100"
        }`}
        aria-label="Use map view"
        title="Map view"
      >
        <Layers3 className="h-4 w-4" />
        2.5D
      </button>

      <button
        type="button"
        onClick={() => handleSelectEngine("cesium")}
        className={`inline-flex h-9 items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-semibold transition ${
          mapEngine === "cesium"
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100"
        }`}
        aria-label="Use 3D globe view"
        title="3D view"
      >
        <Orbit className="h-4 w-4" />
        3D
      </button>

      <div className="mx-0.5 h-6 w-px bg-slate-200" />

      {mapEngine === "maplibre" ? (
        <div className="inline-flex items-center gap-1 rounded-xl bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => handleSelectMode("2.5d")}
            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
              mapMode === "2.5d"
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:bg-slate-200"
            }`}
            title="2.5D mode"
          >
            2.5D
          </button>

          <button
            type="button"
            onClick={() =>
              setTrafficDensity(trafficVisualizationEnabled ? "off" : "light")
            }
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition ${
              trafficVisualizationEnabled
                ? "bg-emerald-600 text-white"
                : "text-slate-500 hover:bg-slate-200"
            }`}
            aria-label="Toggle traffic"
            title="Traffic"
          >
            <CarFront className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => handleSelectMode("3d")}
          className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-2 text-[11px] font-semibold text-white"
          aria-label="3D mode active"
          title="3D mode"
        >
          Globe
        </button>
      )}

      <div className="mx-0.5 h-6 w-px bg-slate-200" />

      <div className="hidden items-center gap-1 lg:inline-flex">
        {(["off", "light", "full"] as const).map((density) => (
          <button
            key={density}
            type="button"
            onClick={() => setTrafficDensity(density)}
            className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
              trafficDensity === density
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            title={`Traffic ${density}`}
          >
            <Waypoints className="mr-1 inline h-3.5 w-3.5" />
            {density}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setLaneDetailEnabled(!laneDetailEnabled)}
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
            laneDetailEnabled
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          title="Lane detail"
        >
          <Route className="mr-1 inline h-3.5 w-3.5" />
          Lane {laneDetailEnabled ? "On" : "Off"}
        </button>

        <button
          type="button"
          onClick={() => setRouteAutoCameraEnabled(!routeAutoCameraEnabled)}
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
            routeAutoCameraEnabled
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          title="Route auto camera"
        >
          AutoCam {routeAutoCameraEnabled ? "On" : "Off"}
        </button>

        <button
          type="button"
          onClick={() =>
            setDetailPreset(detailPreset === "balanced" ? "high" : "balanced")
          }
          className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
            detailPreset === "high"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          title="3D detail preset"
        >
          <Gauge className="mr-1 inline h-3.5 w-3.5" />
          {detailPreset === "high" ? "High" : "Balanced"}
        </button>
      </div>
    </div>
  );
}
