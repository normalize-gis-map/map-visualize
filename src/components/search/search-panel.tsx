"use client";

import { useMemo, useState } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { Search, MapPinned, X } from "lucide-react";
import { PLACES } from "@/src/data/places";

type SearchPanelProps = {
  mapRef: React.RefObject<MapRef | null>;
};

export function SearchPanel({ mapRef }: SearchPanelProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return PLACES.filter((place) =>
      place.label.toLowerCase().includes(normalized)
    ).slice(0, 6);
  }, [query]);

  const handleMoveToPlace = (placeKey: string) => {
    const place = PLACES.find((item) => item.key === placeKey);
    if (!place || !mapRef.current) return;

    if (place.bounds) {
      mapRef.current.fitBounds(place.bounds, {
        padding: 60,
        duration: 1400,
      });
    } else {
      mapRef.current.flyTo({
        center: place.center,
        zoom: place.zoom,
        duration: 1400,
      });
    }

    setQuery(place.label);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Search className="h-4 w-4" />
        Search area
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by area name, e.g. Thủ Đức"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
        />

        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
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
              onClick={() => handleMoveToPlace(place.key)}
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
