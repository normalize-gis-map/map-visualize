"use client";

import { useRef } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import { LayerCatalog } from "@/src/components/layout/layer-catalog";
import { FloodSummary } from "@/src/components/flood/flood-summary";
import { MapSwitcher } from "@/src/components/map/map-switcher";
import { Map2D } from "@/src/components/map/map-2d";
import { SearchPanel } from "@/src/components/search/search-panel";
import { useFloodData } from "@/src/features/flood/hooks/use-flood-data";

export default function Page() {
  const { data, loading } = useFloodData();
  const mapRef = useRef<MapRef | null>(null);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Flood Warning GIS Platform
          </h1>
          <p className="mt-2 text-sm text-slate-500 md:text-base">
            Monitor flood risk zones, switch map modes, and search areas
            instantly
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <LayerCatalog />
            <SearchPanel mapRef={mapRef} />
          </div>

          <div className="space-y-4">
            <FloodSummary data={data} />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <MapSwitcher />

              <div className="text-xs text-slate-500">
                Try searching:{" "}
                <span className="font-semibold text-slate-700">Thủ Đức</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="h-[60vh] md:h-[72vh]">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    Loading map...
                  </div>
                ) : (
                  <Map2D mapRef={mapRef} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
