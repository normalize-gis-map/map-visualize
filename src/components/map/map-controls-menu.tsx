"use client";

import { CarFront, Layers3, Orbit } from "lucide-react";

import { useFloodStore } from "@/features/map/store/map.store";

export function MapControlsMenu() {
  const {
    mapEngine,
    mapMode,
    trafficVisualizationEnabled,
    setMapEngine,
    setMapMode,
    toggleTrafficVisualization,
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
    <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white/95 p-1.5 shadow-sm backdrop-blur">
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

      <div className="mx-1 h-6 w-px bg-slate-200" />

      {mapEngine === "maplibre" ? (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSelectMode("2.5d")}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              mapMode === "2.5d"
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Auto pitch theo zoom"
          >
            AUTO
          </button>
          <button
            type="button"
            onClick={toggleTrafficVisualization}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
              trafficVisualizationEnabled
                ? "bg-emerald-600 text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
            aria-label="Toggle traffic simulation"
            title="Traffic simulation"
          >
            <CarFront className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleSelectMode("3d")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white"
            aria-label="3D mode active"
            title="3D mode"
          >
            <Layers3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleTrafficVisualization}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
              trafficVisualizationEnabled
                ? "bg-emerald-600 text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
            aria-label="Toggle traffic simulation"
            title="Traffic simulation"
          >
            <CarFront className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
