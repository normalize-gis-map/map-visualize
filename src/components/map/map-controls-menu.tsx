"use client";

import { Layers3, Map, Orbit } from "lucide-react";

import { DropdownPanel } from "@/components/ui/dropdown-panel";
import { useFloodStore } from "@/features/flood/store/flood.store";

export function MapControlsMenu() {
  const { mapEngine, mapMode, setMapEngine, setMapMode, mapInteractionTick } =
    useFloodStore();

  const handleSelectEngine = (engine: "maplibre" | "cesium") => {
    setMapEngine(engine);

    if (engine === "maplibre") {
      if (mapMode === "3d") {
        setMapMode("2d");
      }
    } else {
      setMapMode("3d");
    }
  };

  const handleSelectMode = (mode: "2d" | "2.5d" | "3d") => {
    setMapMode(mode);
  };

  return (
    <DropdownPanel
      label="View"
      icon={<Layers3 className="h-4 w-4" />}
      closeSignal={mapInteractionTick}
    >
      <div className="mb-3 rounded-2xl bg-slate-50 px-3 py-2">
        <div className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
          Engine
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSelectEngine("maplibre")}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
              mapEngine === "maplibre"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            <Map className="h-4 w-4" />
            Map
          </button>

          <button
            type="button"
            onClick={() => handleSelectEngine("cesium")}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
              mapEngine === "cesium"
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            <Orbit className="h-4 w-4" />
            3D
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 px-3 py-2">
        <div className="text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
          Mode
        </div>

        {mapEngine === "maplibre" ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["2d", "2.5d"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleSelectMode(mode)}
                className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                  mapMode === mode
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                }`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => handleSelectMode("3d")}
              className="w-full rounded-2xl bg-blue-600 px-3 py-2.5 text-sm font-medium text-white"
            >
              3D
            </button>
          </div>
        )}
      </div>
    </DropdownPanel>
  );
}
