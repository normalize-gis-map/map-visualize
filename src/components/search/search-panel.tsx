"use client";

import { useMemo, useState } from "react";
import { MapPinned, Search, X } from "lucide-react";

import { PLACES, type PlaceItem } from "@/data/places";

type SearchPanelProps = {
  onSelectPlace: (place: PlaceItem) => void;
  compact?: boolean;
};

export function SearchPanel({
  onSelectPlace,
  compact = false,
}: SearchPanelProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return PLACES.filter((place) =>
      place.label.toLowerCase().includes(normalized),
    ).slice(0, 30);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search area..."
          className={`w-full rounded-2xl border border-slate-200 bg-slate-50 pr-10 pl-10 text-sm transition outline-none focus:border-blue-500 focus:bg-white ${
            compact ? "py-3" : "py-3.5"
          }`}
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute top-[calc(100%+8px)] right-0 left-0 z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
          <div className="space-y-2">
            {results.map((place) => (
              <button
                key={place.key}
                type="button"
                onClick={() => {
                  setQuery(place.label);
                  onSelectPlace(place);
                }}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">
                    {place.label}
                  </div>
                  <div className="text-xs text-slate-500">
                    Move map to selected area
                  </div>
                </div>

                <MapPinned className="ml-3 h-4 w-4 shrink-0 text-blue-600" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
