"use client";

import { MapPinned, UserCircle2 } from "lucide-react";

import { MapControlsMenu } from "@/components/map/map-controls-menu";
import { SearchPanel } from "@/components/search/search-panel";
import type { PlaceItem } from "@/data/places";

type TopAppHeaderProps = {
  onSelectPlace: (place: PlaceItem) => void;
};

export function TopAppHeader({ onSelectPlace }: TopAppHeaderProps) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-0 z-30">
      <div className="border-b border-slate-200/80 bg-white/92 px-3 py-3 shadow-lg backdrop-blur md:px-4">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3">
          <button
            type="button"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm"
            aria-label="App logo"
          >
            <MapPinned className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <SearchPanel onSelectPlace={onSelectPlace} compact />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <MapControlsMenu />

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
              aria-label="Account"
            >
              <UserCircle2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
