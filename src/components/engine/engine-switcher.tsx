"use client";

import { useFloodStore } from "@/features/flood/store/flood.store";

type EngineSwitchProps = {
  compact?: boolean;
};

export function EngineSwitch({ compact = false }: EngineSwitchProps) {
  const { mapEngine, setMapEngine, setMapMode } = useFloodStore();

  const handleSelect = (engine: "maplibre" | "cesium") => {
    setMapEngine(engine);

    if (engine === "maplibre") {
      setMapMode("2d");
    } else {
      setMapMode("3d");
    }
  };

  return (
    <div
      className={`inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 ${
        compact ? "h-11" : "h-[52px]"
      }`}
    >
      <button
        type="button"
        onClick={() => handleSelect("maplibre")}
        className={`rounded-xl px-4 text-sm font-medium transition ${
          mapEngine === "maplibre"
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        Map
      </button>

      <button
        type="button"
        onClick={() => handleSelect("cesium")}
        className={`rounded-xl px-4 text-sm font-medium transition ${
          mapEngine === "cesium"
            ? "bg-slate-900 text-white"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        3D
      </button>
    </div>
  );
}
