import { PanelBottomClose, PanelBottomOpen } from "lucide-react";

import { MapLegend } from "@/components/map/map-legend";
import { NavigationMiniMapInset } from "@/components/map/navigation/navigation-mini-map-inset";
import { RouteDrawer } from "@/components/map/navigation/route-drawer";
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
}: Props) {
  return (
    <>
      {activeRoute && routePayload ? (
        <div className="pointer-events-none absolute top-24 left-1/2 z-20 w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 shadow-xl backdrop-blur md:block">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
                Navigation
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {routePayload.from.label} → {routePayload.to.label}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-blue-700">{etaMinutes} min</div>
              <div className="text-xs text-slate-500">{distanceKm} km</div>
            </div>
          </div>
        </div>
      ) : null}

      {activeRoute ? (
        <>
          <button
            type="button"
            onClick={() => setRoutePanelOpen(!routePanelOpen)}
            className="absolute right-3 bottom-3 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl"
            aria-label={routePanelOpen ? "Hide controls" : "Show controls"}
          >
            {routePanelOpen ? (
              <PanelBottomClose className="h-5 w-5" />
            ) : (
              <PanelBottomOpen className="h-5 w-5" />
            )}
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
          />
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
