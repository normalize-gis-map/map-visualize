import {
  Bike,
  Car,
  Footprints,
  Map,
  Navigation,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { useState } from "react";

import { ControlBoard } from "@/features/map/components/navigation/control-board";
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
  cameraTiltDeg: number;
  onCameraTiltChange: (value: number) => void;
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
  cameraTiltDeg,
  onCameraTiltChange,
}: Props) {
  const [activeTab, setActiveTab] = useState<"playback" | "tools">("playback");
  if (!routePanelOpen) return null;

  return (
    <div className="pointer-events-auto absolute right-2 bottom-3 left-2 z-30 rounded-3xl border border-white/70 bg-white/92 p-3 shadow-2xl backdrop-blur md:right-3 md:left-auto md:w-[min(95vw,390px)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
            Navigation
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">
            {routeFromLabel} → {routeToLabel}
          </p>
          <p className="text-xs text-slate-500">
            {etaMinutes} phút • {distanceKm} km
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleMinimalMode}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 px-2.5 text-xs font-semibold text-slate-600"
          aria-label={drawerMinimalMode ? "Expand route controls" : "Collapse route controls"}
        >
          {drawerMinimalMode ? "Expand" : "Minimal"}
        </button>
      </div>

      <div className="mb-2 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("playback")}
          className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${
            activeTab === "playback" ? "bg-white text-slate-900 shadow" : "text-slate-500"
          }`}
        >
          Playback
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tools")}
          className={`rounded-lg px-2 py-1.5 text-xs font-semibold ${
            activeTab === "tools" ? "bg-white text-slate-900 shadow" : "text-slate-500"
          }`}
        >
          Tools
        </button>
      </div>

      {activeTab === "playback" ? (
        <>
          <ControlBoard
            progress={navProgress}
            isPlaying={isNavigating}
            speedMultiplier={speedMultiplier}
            availableSpeedMultipliers={availableSpeedMultipliers}
            onSeek={onSeek}
            onSetSpeed={onSetSpeed}
            onTogglePlayback={onTogglePlayback}
            onReset={onReset}
            className="mb-2 rounded-xl border border-slate-200 bg-white p-2 text-slate-700"
            theme="light"
          />
        </>
      ) : (
        <>
          <div className="mb-2 grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => onToggleViewMode("map")}
              className={`flex h-10 items-center justify-center rounded-xl border ${
                viewMode === "map"
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600"
              }`}
              aria-label="Bản đồ thường"
            >
              <Map className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode("drive3d")}
              className={`flex h-10 items-center justify-center rounded-xl border ${
                viewMode === "drive3d"
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600"
              }`}
              aria-label="Góc nhìn lái xe 3D"
            >
              <Navigation className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMapLibreCar3D}
              className={`flex h-10 items-center justify-center rounded-xl border ${
                mapLibreCar3D
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-600"
              }`}
              aria-label="Toggle MapLibre car 3D style"
            >
              <Waypoints className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onSwitchToCesium}
              className="flex h-10 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700"
              aria-label="Switch to Cesium"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold tracking-[0.1em] text-slate-500 uppercase">
              <span>Góc nghiêng 3D</span>
              <span>{Math.round(cameraTiltDeg)}°</span>
            </div>
            <input
              type="range"
              min={55}
              max={83}
              step={1}
              value={cameraTiltDeg}
              onChange={(event) => onCameraTiltChange(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer accent-sky-600"
              aria-label="Điều chỉnh góc nghiêng 3D"
            />
          </div>
        </>
      )}

      {!drawerMinimalMode && activeTab === "playback" ? (
        <>
          <div className="mt-2 flex h-9 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700">
            {navMode === "car" ? (
              <Car className="h-4 w-4" />
            ) : navMode === "bike" ? (
              <Bike className="h-4 w-4" />
            ) : (
              <Footprints className="h-4 w-4" />
            )}
            {navMode === "car" ? "Ô tô" : navMode === "bike" ? "Xe đạp" : "Đi bộ"}
          </div>

          {steps.length ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
              <p className="mb-1 text-[10px] font-semibold tracking-[0.13em] text-slate-500 uppercase">
                Turn by turn
              </p>
              <ul className="space-y-1">
                {steps.slice(activeStepIndex, activeStepIndex + 2).map((step, idx) => (
                  <li
                    key={`${step.instruction}-${step.distanceMeters}`}
                    className={`rounded-lg px-2 py-1.5 text-xs ${
                      idx === 0
                        ? "border border-blue-200 bg-blue-50 text-blue-800"
                        : "bg-slate-50 text-slate-700"
                    }`}
                  >
                    {step.instruction}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
