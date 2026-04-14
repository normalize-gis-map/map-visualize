import {
  ChevronsUpDown,
  Compass,
  Pause,
  Play,
  TriangleAlert,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useState } from "react";

import { MapLegend } from "@/features/map/components/map-legend";
import { NavigationMiniMapInset } from "@/features/map/components/navigation/navigation-mini-map-inset";
import { RouteDrawer } from "@/features/map/components/navigation/route-drawer";
import type { RouteAlternative } from "@/features/map/types/route.types";

type Props = {
  activeRoute: RouteAlternative | null;
  routePayload:
    | {
        from: { label: string; center: [number, number] };
        to: { label: string; center: [number, number] };
      }
    | null;
  mapZoom: number;
  visibleFloodLegend: boolean;
  routePanelOpen: boolean;
  setRoutePanelOpen: (open: boolean) => void;
  navProgress: number;
  navMode: "car" | "bike" | "walk";
  viewMode: "map" | "drive3d";
  mapLibreCar3D: boolean;
  routeFromLabel: string;
  routeToLabel: string;
  etaMinutes: number;
  distanceKm: string;
  activeStepIndex: number;
  isNavigating: boolean;
  speedMultiplier: 0.5 | 1 | 2;
  availableSpeedMultipliers: readonly (0.5 | 1 | 2)[];
  drawerMinimalMode: boolean;
  navCoordinate: [number, number] | null;
  onToggleViewMode: (mode: "map" | "drive3d") => void;
  onToggleMapLibreCar3D: () => void;
  onSwitchToCesium: () => void;
  onTogglePlayback: () => void;
  onSeek: (value: number) => void;
  onSetSpeed: (value: 0.5 | 1 | 2) => void;
  onToggleMinimalMode: () => void;
  onReset: () => void;
  cameraTiltDeg: number;
  onCameraTiltChange: (value: number) => void;
  onFocusVehicle: () => void;
  onToggleTraffic: () => void;
  mapBearing: number;
};

export function NavigationHud({
  activeRoute,
  routePayload,
  mapZoom,
  visibleFloodLegend,
  routePanelOpen,
  setRoutePanelOpen,
  navProgress,
  navMode,
  viewMode,
  mapLibreCar3D,
  routeFromLabel,
  routeToLabel,
  etaMinutes,
  distanceKm,
  activeStepIndex,
  isNavigating,
  speedMultiplier,
  availableSpeedMultipliers,
  drawerMinimalMode,
  navCoordinate,
  onToggleViewMode,
  onToggleMapLibreCar3D,
  onSwitchToCesium,
  onTogglePlayback,
  onSeek,
  onSetSpeed,
  onToggleMinimalMode,
  onReset,
  cameraTiltDeg,
  onCameraTiltChange,
  onFocusVehicle,
  onToggleTraffic,
  mapBearing,
}: Props) {
  const [muted, setMuted] = useState(false);

  return (
    <>
      {activeRoute && routePayload ? (
        <div className="pointer-events-none absolute top-24 left-1/2 z-20 w-[min(90vw,420px)] -translate-x-1/2 rounded-2xl border border-white/70 bg-white/85 px-4 py-2.5 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-3 text-sm">
            <div>
              <div className="font-semibold text-slate-900">
                {routePayload.from.label} → {routePayload.to.label}
              </div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <span className="font-semibold text-blue-700">{etaMinutes} min</span> • {distanceKm} km
            </div>
          </div>
        </div>
      ) : null}

      {activeRoute ? (
        <>
          <button
            type="button"
            onClick={onTogglePlayback}
            className="absolute right-3 bottom-16 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl"
            aria-label={isNavigating ? "Pause navigation" : "Start navigation"}
          >
            {isNavigating ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>

          <button
            type="button"
            onClick={() => setRoutePanelOpen(!routePanelOpen)}
            className="absolute right-3 bottom-3 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl"
            aria-label={routePanelOpen ? "Hide controls" : "Show controls"}
          >
            <ChevronsUpDown className="h-5 w-5" />
          </button>

          <RouteDrawer
            routePanelOpen={routePanelOpen}
            navProgress={navProgress}
            navMode={navMode}
            viewMode={viewMode}
            mapLibreCar3D={mapLibreCar3D}
            routeFromLabel={routeFromLabel}
            routeToLabel={routeToLabel}
            etaMinutes={etaMinutes}
            distanceKm={distanceKm}
            steps={activeRoute.steps}
            activeStepIndex={activeStepIndex}
            isNavigating={isNavigating}
            speedMultiplier={speedMultiplier}
            availableSpeedMultipliers={availableSpeedMultipliers}
            drawerMinimalMode={drawerMinimalMode}
            onToggleViewMode={onToggleViewMode}
            onToggleMapLibreCar3D={onToggleMapLibreCar3D}
            onSwitchToCesium={onSwitchToCesium}
            onTogglePlayback={onTogglePlayback}
            onSeek={onSeek}
            onSetSpeed={onSetSpeed}
            onToggleMinimalMode={onToggleMinimalMode}
            onReset={onReset}
            cameraTiltDeg={cameraTiltDeg}
            onCameraTiltChange={onCameraTiltChange}
          />

          <div className="pointer-events-auto absolute right-4 top-24 z-30 hidden flex-col gap-2 md:flex">
            <button
              type="button"
              onClick={onFocusVehicle}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 shadow-lg backdrop-blur"
              aria-label="Focus current vehicle"
              title="Đưa bản đồ về Bắc-up và focus xe"
            >
              <Compass className="h-4.5 w-4.5 transition-transform" style={{ transform: `rotate(${-mapBearing}deg)` }} />
            </button>
            <button
              type="button"
              onClick={() => setMuted((prev) => !prev)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur ${
                muted ? "border-amber-200 bg-amber-50 text-amber-700" : "border-white/70 bg-white/90 text-slate-700"
              }`}
              aria-label={muted ? "Unmute navigation sounds" : "Mute navigation sounds"}
            >
              {muted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </button>
            <button
              type="button"
              onClick={onToggleTraffic}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 shadow-lg backdrop-blur"
              aria-label="Toggle traffic visualization"
            >
              <TriangleAlert className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="pointer-events-auto absolute bottom-2 left-1/2 z-30 hidden w-[min(92vw,360px)] -translate-x-1/2 items-center justify-between rounded-2xl border border-white/70 bg-white/95 px-3 py-2 shadow-xl backdrop-blur md:flex">
            <div>
              <div className="text-lg font-semibold text-rose-600">{etaMinutes} min</div>
              <div className="text-xs text-slate-500">{distanceKm} km</div>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="rounded-xl bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white"
            >
              Exit
            </button>
          </div>
        </>
      ) : null}

      {visibleFloodLegend && <MapLegend />}

      <NavigationMiniMapInset
        visible={viewMode === "drive3d"}
        routeGeometry={activeRoute?.geometry ?? null}
        fromCenter={routePayload?.from.center ?? null}
        navCoordinate={navCoordinate}
        mapZoom={mapZoom}
      />
    </>
  );
}
