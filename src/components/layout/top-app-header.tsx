"use client";

import {
  Car,
  Coffee,
  Fuel,
  MapPinned,
  Search,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useState } from "react";

import { AlertDrawer } from "@/components/flood/alert-drawer";
import { UserMenu } from "@/components/layout/user-menu";
import { MapControlsMenu } from "@/components/map/map-controls-menu";
import { RoutePlanner } from "@/components/search/route-planner";
import { SearchPanel } from "@/components/search/search-panel";
import type { PlaceItem } from "@/data/places";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";
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
    <header className="pointer-events-auto sticky top-0 z-40">
      <div className="border-b border-slate-200/70 bg-white/86 px-3 py-2.5 shadow-lg backdrop-blur-xl md:px-4">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm"
              aria-label="App logo"
            >
              <MapPinned className="h-5 w-5" />
            </button>

            <div className="inline-flex h-11 shrink-0 items-center rounded-2xl border border-slate-200 bg-slate-50 p-1 md:h-12">
              <button
                type="button"
                onClick={() => setMode("view")}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  activeMode === "view"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                View
              </button>
              <button
                type="button"
                onClick={() => setMode("route")}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  activeMode === "route"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500"
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
              <UserMenu />
            </div>
          </div>

          {activeMode === "route" ? (
            <div className="mt-3">
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setRoutePlannerCollapsed((prev) => !prev)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
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
                <div className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-600">
                  Route panel đã thu gọn. Bấm “Mở Route panel” để chỉnh tuyến.
                </div>
              )}
            </div>
          ) : null}

          {activeMode === "view" && selectedPreviewPlace ? (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold tracking-[0.13em] text-slate-500 uppercase">
                    Search Result
                  </div>
                  <div className="text-base font-semibold text-slate-900">
                    {selectedPreviewPlace.label}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMode("route")}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Đường đi
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPreviewPlace(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
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
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  >
                    <item.icon className="h-4 w-4 text-slate-500" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {activeMode === "view" ? (
        <div className="fixed bottom-4 left-4 z-40">
          {searchOpen ? (
            <div className="w-[min(92vw,420px)] rounded-3xl border border-white/70 bg-white/95 p-3 shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                    Search
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Tip: dùng như command palette (⌘K style)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="rounded-lg border border-slate-200 p-1 text-slate-500"
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
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/95 text-slate-700 shadow-2xl backdrop-blur"
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
