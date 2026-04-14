"use client";

import { useFloodStore } from "@/features/map/store/map.store";

export function MapSwitcher() {
  const { mapMode, setMapMode, mapEngine } = useFloodStore();

  const options =
    mapEngine === "maplibre"
      ? (["2d", "2.5d", "3d"] as const)
      : (["3d"] as const);

  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur">
      {options.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setMapMode(mode)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            mapMode === mode
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          {mode.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
