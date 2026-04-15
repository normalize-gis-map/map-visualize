"use client";

import {
  CarFront,
  Coffee,
  Fuel,
  MapPinned,
  Orbit,
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
import { useFloodStore } from "@/features/map/store/map.store";
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
  const { mapEngine, setMapEngine, setMapMode } = useFloodStore();

  const handleSelectPlace = (place: PlaceItem) => {
    setSelectedPreviewPlace(place);
    setSearchOpen(false);
    onSelectPlace(place);
  };

  const handleSelectEngine = (engine: "maplibre" | "cesium") => {
    setMapEngine(engine);
    setMapMode(engine === "cesium" ? "3d" : "2.5d");
  };

  return (
    <header className="pointer-events-none absolute top-0 right-0 left-0 z-50 flex flex-col items-center px-3 pt-3 md:px-4 md:pt-4">
      <div className="pointer-events-auto w-full max-w-[1320px]">
        <div className="flex h-16 items-center rounded-2xl border border-slate-200/12 bg-slate-950/78 px-4 shadow-[0_16px_36px_-24px_rgba(2,6,23,0.95)] backdrop-blur-2xl md:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-100">
              <MapPinned className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <div className="text-[10px] tracking-[0.14em] text-cyan-100/80 uppercase">
                Flood GIS
              </div>
              <div className="text-sm font-semibold text-white">Command</div>
            </div>
          </div>

          <div className="mx-auto hidden items-center rounded-xl border border-slate-700 bg-slate-900/70 p-1 sm:inline-flex">
            <button
              type="button"
              onClick={() => setMode("view")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
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
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                activeMode === "route"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Route
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/70 p-1 md:inline-flex">
              <button
                type="button"
                onClick={() => handleSelectEngine("maplibre")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  mapEngine === "maplibre"
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                2.5D
              </button>
              <button
                type="button"
                onClick={() => handleSelectEngine("cesium")}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  mapEngine === "cesium"
                    ? "bg-cyan-500 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Orbit className="h-3.5 w-3.5" />
                3D
              </button>
            </div>

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
          <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/82 p-3 shadow-xl backdrop-blur-xl">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setRoutePlannerCollapsed((prev) => !prev)}
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-200"
              >
                {routePlannerCollapsed ? "Mở Route panel" : "Thu gọn Route panel"}
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
          <div className="mt-3 rounded-2xl border border-slate-700/80 bg-slate-950/82 p-3 shadow-xl">
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
                { label: "Parking", icon: CarFront },
                { label: "Food", icon: UtensilsCrossed },
                { label: "Cafe", icon: Coffee },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200"
                >
                  <item.icon className="h-4 w-4 text-cyan-200" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {activeMode === "view" ? (
        <div className="pointer-events-auto fixed right-4 bottom-4 left-4 z-40 md:right-auto md:bottom-6 md:left-6">
          {searchOpen ? (
            <div className="w-full md:w-[420px] rounded-3xl border border-slate-200/15 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-2xl">
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
              className="ml-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200/15 bg-slate-950/85 text-cyan-100 shadow-xl backdrop-blur-2xl md:ml-0 md:h-14 md:w-14"
              aria-label="Open search"
            >
              <Search className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          )}
        </div>
      ) : null}
    </header>
  );
}
