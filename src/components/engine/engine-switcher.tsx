"use client";

import { useFloodStore } from "@/features/flood/store/flood.store";

export function EngineSwitcher() {
  const { mapEngine, setMapEngine } = useFloodStore();

  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
      {(["maplibre", "cesium"] as const).map((engine) => (
        <button
          key={engine}
          type="button"
          onClick={() => setMapEngine(engine)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            mapEngine === engine
              ? "bg-slate-900 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {engine === "maplibre" ? "MapLibre" : "Cesium"}
        </button>
      ))}
    </div>
  );
}
