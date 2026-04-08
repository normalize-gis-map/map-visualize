"use client";

import { MapPinned } from "lucide-react";
import { useState } from "react";

import { MapControlsMenu } from "@/components/map/map-controls-menu";
import { SearchPanel } from "@/components/search/search-panel";
import { RoutePlanner } from "@/components/search/route-planner";
import { UserMenu } from "@/components/layout/user-menu";
import type { PlaceItem } from "@/data/places";
import { useFloodStore } from "@/features/flood/store/flood.store";
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
};

export function TopAppHeader({ onSelectPlace, onRoutesChange }: TopAppHeaderProps) {
  const { mapEngine } = useFloodStore();
  const [mode, setMode] = useState<"view" | "route">("view");
  const activeMode = mapEngine === "cesium" ? "view" : mode;

  return (
    <div className="pointer-events-auto absolute inset-x-0 top-0 z-30">
      <div className="border-b border-slate-200/80 bg-white/92 px-3 py-3 shadow-lg backdrop-blur md:px-4">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm"
              aria-label="App logo"
            >
              <MapPinned className="h-5 w-5" />
            </button>

            {mapEngine === "maplibre" ? (
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
            ) : null}

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {activeMode === "view" ? <MapControlsMenu /> : null}
              <UserMenu />
            </div>
          </div>

          <div className="mt-3">
            {activeMode === "view" ? (
              <SearchPanel onSelectPlace={onSelectPlace} compact />
            ) : (
              <RoutePlanner onRoutesChange={onRoutesChange} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
