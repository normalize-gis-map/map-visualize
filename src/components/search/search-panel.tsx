"use client";

import { useMemo, useState } from "react";
import { MapPinned, Search, X } from "lucide-react";
import { PLACES, type PlaceItem } from "@/data/places";

type SearchPanelProps = {
  onSelectPlace: (place: PlaceItem) => void;
};

export function SearchPanel({ onSelectPlace }: SearchPanelProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return PLACES.filter((place) =>
      place.label.toLowerCase().includes(normalized),
    ).slice(0, 6);
  }, [query]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
      <div className="relative">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search area, e.g. Thủ Đức"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-10 text-sm transition outline-none focus:border-blue-500 focus:bg-white"
        />

        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />

        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-3 space-y-2">
          {results.map((place) => (
            <button
              key={place.key}
              type="button"
              onClick={() => {
                setQuery(place.label);
                onSelectPlace(place);
              }}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50"
            >
              <div>
                <div className="text-sm font-medium text-slate-900">
                  {place.label}
                </div>
                <div className="text-xs text-slate-500">
                  Move map to selected area
                </div>
              </div>

              <MapPinned className="h-4 w-4 text-blue-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
