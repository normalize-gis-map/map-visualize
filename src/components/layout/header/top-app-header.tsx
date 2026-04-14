"use client";

import {
  BellDot,
  Car,
  Coffee,
  Fuel,
  MapPinned,
  Search,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useState } from "react";

import { UserMenu } from "@/components/layout/header/user-menu";
import { RoutePlanner } from "@/components/search/route-planner";
import { SearchPanel } from "@/components/search/search-panel";
import type { PlaceItem } from "@/data/places";
import { AlertDrawer } from "@/features/flood/components/alert-drawer";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
import { MapControlsMenu } from "@/features/map/components/map-controls-menu";
import type { RouteAlternative } from "@/features/map/types/route.types";

type TopAppHeaderProps = {
  onSelectPlace: (place: PlaceItem) => void;
  onRoutesChange: (
    payload: {
      from: PlaceItem;
      to: PlaceItem;
      routes: RouteAlternative[];
      activeIndex: number;
    } | null,
  ) => void;
  alertOpen: boolean;
  onToggleAlert: () => void;
  floodData: FloodGeoJson | null;
};

export function TopAppHeader({
  onSelectPlace,
  onRoutesChange,
  alertOpen,
  onToggleAlert,
  floodData,
}: TopAppHeaderProps) {
  const [mode, setMode] = useState<"view" | "route">("view");
  const [searchOpen, setSearchOpen] = useState(false);
  const [routePlannerCollapsed, setRoutePlannerCollapsed] = useState(false);
  const [selectedPreviewPlace, setSelectedPreviewPlace] =
    useState<PlaceItem | null>(null);
  const activeMode = mode;

  const handleSelectPlace = (place: PlaceItem) => {
    setSelectedPreviewPlace(place);
    setSearchOpen(false);
    onSelectPlace(place);
  };

  return (
    <header className="pointer-events-auto sticky top-0 z-40 px-3 pt-3 md:px-5 md:pt-4">
      <div className="mx-auto max-w-[1700px]">
        <div className="rounded-2xl border border-slate-200/10 bg-slate-950/72 px-3 py-2.5 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.95)] backdrop-blur-2xl md:px-4">
          <div className="flex items-center gap-2.5 md:gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-slate-900/70 px-2.5 py-2 text-cyan-50">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-200">
                <MapPinned className="h-4 w-4" />
              </div>
              <div className="hidden sm:block">
                <div className="text-[10px] tracking-[0.14em] text-cyan-100/80 uppercase">
                  Flood GIS
                </div>
                <div className="text-xs font-semibold text-white">Command</div>
              </div>
            </div>

            <div className="inline-flex h-10 shrink-0 items-center rounded-xl border border-slate-700/80 bg-slate-900/70 p-1">
              <button
                type="button"
                onClick={() => setMode("view")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition md:text-sm ${
                  activeMode === "view"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                View
              </button>
              <button
                type="button"
                onClick={() => setMode("route")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition md:text-sm ${
                  activeMode === "route"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Route
              </button>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {activeMode === "view" ? <MapControlsMenu /> : null}
              <AlertDrawer
                open={alertOpen}
                onToggle={onToggleAlert}
                data={floodData}
                mode="popover"
              />
              <button
                type="button"
                onClick={onToggleAlert}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/80 text-slate-200 transition hover:border-cyan-400/40 hover:text-cyan-200"
                aria-label="Alert quick action"
              >
                <BellDot className="h-4 w-4" />
              </button>
              <UserMenu />
            </div>
          </div>

          {activeMode === "route" ? (
            <div className="mt-3 border-t border-slate-700/70 pt-3">
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setRoutePlannerCollapsed((prev) => !prev)}
                  className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-200"
                >
                  {routePlannerCollapsed
                    ? "Mở Route panel"
                    : "Thu gọn Route panel"}
                </button>
              </div>
              {!routePlannerCollapsed ? (
                <RoutePlanner
                  onRoutesChange={onRoutesChange}
                  initialToLabel={selectedPreviewPlace?.label}
                  onBackToSearch={() => setMode("view")}
                />
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
                  Route panel đã thu gọn. Bấm “Mở Route panel” để chỉnh tuyến.
                </div>
              )}
            </div>
          ) : null}

          {activeMode === "view" && selectedPreviewPlace ? (
            <div className="mt-3 rounded-2xl border border-slate-700/80 bg-slate-900/80 p-3 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold tracking-[0.13em] text-slate-400 uppercase">
                    Search Result
                  </div>
                  <div className="text-base font-semibold text-white">
                    {selectedPreviewPlace.label}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMode("route")}
                  className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Đường đi
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPreviewPlace(null)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800/70"
                >
                  Xoá
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Gas", icon: Fuel },
                  { label: "Parking", icon: Car },
                  { label: "Food", icon: UtensilsCrossed },
                  { label: "Cafe", icon: Coffee },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-200"
                  >
                    <item.icon className="h-4 w-4 text-cyan-200" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {activeMode === "view" ? (
        <div className="fixed bottom-4 left-4 z-40 md:bottom-6 md:left-6">
          {searchOpen ? (
            <div className="w-[min(92vw,420px)] rounded-3xl border border-slate-200/15 bg-slate-950/88 p-3 shadow-2xl backdrop-blur-2xl">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold tracking-[0.12em] text-cyan-100 uppercase">
                    Search
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Tip: dùng như command palette (⌘K style)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="rounded-lg border border-slate-700 p-1 text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SearchPanel
                onSelectPlace={handleSelectPlace}
                compact
                inlineResults
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/15 bg-slate-950/82 text-cyan-100 shadow-2xl backdrop-blur-2xl"
              aria-label="Open search"
            >
              <Search className="h-6 w-6" />
            </button>
          )}
        </div>
      ) : null}
    </header>
  );
}
