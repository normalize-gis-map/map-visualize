import { Bike, Car, Footprints, Navigation, Pause, Play } from "lucide-react";

import type { RouteStep } from "@/features/map/types/route.types";

type Props = {
  routePanelOpen: boolean;
  navProgress: number;
  navMode: "car" | "bike" | "walk";
  viewMode: "map" | "drive3d";
  mapLibreCar3D: boolean;
  routeFromLabel: string;
  routeToLabel: string;
  etaMinutes: number;
  distanceKm: string;
  steps: RouteStep[];
  activeStepIndex: number;
  isNavigating: boolean;
  speedMultiplier: 0.5 | 1 | 2;
  availableSpeedMultipliers: readonly (0.5 | 1 | 2)[];
  drawerMinimalMode: boolean;
  onToggleViewMode: (mode: "map" | "drive3d") => void;
  onToggleMapLibreCar3D: () => void;
  onSwitchToCesium: () => void;
  onTogglePlayback: () => void;
  onReset: () => void;
  onSeek: (value: number) => void;
  onSetSpeed: (value: 0.5 | 1 | 2) => void;
  onToggleMinimalMode: () => void;
};

export function RouteDrawer({
  routePanelOpen,
  navProgress,
  navMode,
  viewMode,
  mapLibreCar3D,
  routeFromLabel,
  routeToLabel,
  etaMinutes,
  distanceKm,
  steps,
  activeStepIndex,
  isNavigating,
  speedMultiplier,
  availableSpeedMultipliers,
  drawerMinimalMode,
  onToggleViewMode,
  onToggleMapLibreCar3D,
  onSwitchToCesium,
  onTogglePlayback,
  onReset,
  onSeek,
  onSetSpeed,
  onToggleMinimalMode,
}: Props) {
  if (!routePanelOpen) return null;

  return (
    <div className="absolute right-2 bottom-20 left-2 z-30 max-h-[52vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur md:right-3 md:bottom-20 md:left-3 md:max-h-[46vh]">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
          Route drawer
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{Math.round(navProgress * 100)}%</span>
          <button
            type="button"
            onClick={onToggleMinimalMode}
            className="rounded-lg border border-slate-200 px-2 py-0.5 font-medium text-slate-600"
          >
            {drawerMinimalMode ? "Hiện đầy đủ" : "Minimal"}
          </button>
        </div>
      </div>

      <div className="mb-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <div className="mb-1 flex items-center justify-between text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
          <span>Playback</span>
          <span>{Math.round(navProgress * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={navProgress}
          onChange={(event) => onSeek(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer accent-blue-600"
          aria-label="Seek route playback"
        />
        <div className="mt-2 flex gap-2">
          {availableSpeedMultipliers.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSetSpeed(item)}
              className={`h-8 flex-1 rounded-xl border text-xs font-semibold ${
                speedMultiplier === item
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {item}x
            </button>
          ))}
        </div>
      </div>

      {!drawerMinimalMode ? (
        <>
          <div className="mb-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700">
            {navMode === "car" ? (
              <Car className="h-4 w-4" />
            ) : navMode === "bike" ? (
              <Bike className="h-4 w-4" />
            ) : (
              <Footprints className="h-4 w-4" />
            )}
            Chế độ: {navMode === "car" ? "Ô tô" : navMode === "bike" ? "Xe đạp" : "Đi bộ"}
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onToggleViewMode("map")}
              className={`h-10 rounded-2xl border text-sm font-semibold ${
                viewMode === "map"
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              Bản đồ thường
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode("drive3d")}
              className={`h-10 rounded-2xl border text-sm font-semibold ${
                viewMode === "drive3d"
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              Góc nhìn lái xe 3D
            </button>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onToggleMapLibreCar3D}
              className={`flex h-10 items-center justify-center rounded-2xl border text-sm font-semibold ${
                mapLibreCar3D
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-600"
              }`}
            >
              {mapLibreCar3D ? "Phase 1: Tắt demo MapLibre" : "Phase 1: Demo MapLibre"}
            </button>
            <button
              type="button"
              onClick={onSwitchToCesium}
              className="flex h-10 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-sm font-semibold text-violet-700"
            >
              Phase 2: Cesium cinematic
            </button>
          </div>

          <div className="mb-2 rounded-2xl bg-slate-50 px-3 py-2">
            <div className="text-sm font-semibold text-slate-800">
              {routeFromLabel} → {routeToLabel}
            </div>
            <div className="text-xs text-slate-600">ETA {etaMinutes} phút • {distanceKm} km</div>
          </div>

          {steps.length ? (
            <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3">
              <p className="mb-1 text-[11px] font-semibold tracking-[0.13em] text-slate-500 uppercase">
                Turn by turn
              </p>
              <ul className="space-y-1.5">
                {steps.slice(activeStepIndex, activeStepIndex + 3).map((step, idx) => {
                  const isActive = idx === 0;
                  return (
                    <li
                      key={`${step.instruction}-${step.distanceMeters}`}
                      className={`rounded-xl px-2.5 py-2 text-xs ${
                        isActive
                          ? "border border-blue-200 bg-blue-50 text-blue-800"
                          : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="mr-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/90 px-1 text-[10px] font-semibold text-slate-500">
                        {activeStepIndex + idx + 1}
                      </span>
                      {step.instruction}
                      {step.roadName ? ` (${step.roadName})` : ""} • {(step.distanceMeters / 1000).toFixed(2)} km • {Math.max(1, Math.round(step.durationSeconds / 60))} phút
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="sticky bottom-0 flex gap-2 bg-white/95 pt-1">
        <button
          type="button"
          onClick={onTogglePlayback}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-semibold text-white"
        >
          {isNavigating ? (
            <>
              <Pause className="h-4 w-4" />
              Tạm dừng
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Di chuyển
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 text-sm font-medium text-slate-700"
        >
          <Navigation className="h-4 w-4" />
          Reset
        </button>
      </div>
    </div>
  );
}
