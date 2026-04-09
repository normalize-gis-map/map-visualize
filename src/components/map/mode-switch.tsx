"use client";

import { useFloodStore } from "@/features/map/store/map.store";

type ModeSwitchProps = {
  compact?: boolean;
};

export function ModeSwitch({ compact = false }: ModeSwitchProps) {
  const { mapEngine, mapMode, setMapMode } = useFloodStore();

  const heightClass = compact ? "h-11" : "h-[52px]";

  if (mapEngine === "cesium") {
    return (
      <div
        className={`inline-flex ${heightClass} rounded-2xl border border-slate-200 bg-slate-50 p-1`}
      >
        <button
          type="button"
          className="rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm"
        >
          3D
        </button>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex ${heightClass} rounded-2xl border border-slate-200 bg-slate-50 p-1`}
    >
      {(["2d", "2.5d"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setMapMode(mode)}
          className={`rounded-xl px-4 text-sm font-medium transition ${
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
