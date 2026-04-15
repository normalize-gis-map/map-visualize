"use client";

import { useState } from "react";

import { DashboardLeftRail } from "@/components/dashboard/dashboard-left-rail";
import { DashboardOverlay } from "@/components/dashboard/dashboard-overlay";
import { DashboardRightInspector } from "@/components/dashboard/dashboard-right-inspector";
import { TopAppHeader } from "@/components/layout/header/top-app-header";
import { MapEngineContainer } from "@/components/map/engines/map-engine-container";
import type { PlaceItem } from "@/data/places";
import { useFloodData } from "@/features/flood/hooks/use-flood-data";
import { LayerCatalog } from "@/features/map/components/controls/layer-catalog";
import { useFloodStore } from "@/features/map/store/map.store";
import type { RouteAlternative } from "@/features/map/types/route.types";

type RoutePayload = {
  from: PlaceItem;
  to: PlaceItem;
  routes: RouteAlternative[];
  activeIndex: number;
};

function SceneEffectsOverlay() {
  const { transportVisibility, weatherMode, timeMode } = useFloodStore();

  const weatherTone =
    weatherMode === "sun"
      ? "bg-amber-300/10"
      : weatherMode === "snows"
        ? "bg-cyan-100/12"
        : "bg-slate-700/18";

  const timeTone =
    timeMode === "night"
      ? "bg-slate-950/45"
      : timeMode === "morning"
        ? "bg-amber-300/8"
        : timeMode === "noon"
          ? "bg-white/8"
          : timeMode === "evening"
            ? "bg-orange-400/10"
            : "bg-transparent";

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 z-10 transition-colors duration-300 ${weatherTone}`}
      />
      <div
        className={`pointer-events-none absolute inset-0 z-10 transition-colors duration-300 ${timeTone}`}
      />

      {weatherMode === "rain" ? (
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(110deg,rgba(148,163,184,0.03)_0%,rgba(148,163,184,0.03)_45%,transparent_45%,transparent_55%,rgba(148,163,184,0.03)_55%,rgba(148,163,184,0.03)_100%)] bg-[length:28px_28px] opacity-70" />
      ) : null}

      {transportVisibility.boats ? (
        <div className="pointer-events-none absolute right-10 bottom-16 z-20 rounded-full border border-cyan-200/25 bg-cyan-300/12 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-cyan-100 uppercase">
          Boats active
        </div>
      ) : null}
      {transportVisibility.bike ? (
        <div className="pointer-events-none absolute right-10 bottom-24 z-20 rounded-full border border-lime-200/25 bg-lime-300/12 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-lime-100 uppercase">
          Bike flow active
        </div>
      ) : null}
      {transportVisibility.people ? (
        <div className="pointer-events-none absolute right-10 bottom-32 z-20 rounded-full border border-fuchsia-200/25 bg-fuchsia-300/12 px-3 py-1 text-[10px] font-semibold tracking-[0.12em] text-fuchsia-100 uppercase">
          Pedestrian flow active
        </div>
      ) : null}
    </>
  );
}

export function DashboardShell() {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [routePayload, setRoutePayload] = useState<RoutePayload | null>(null);

  const { data, loading, error } = useFloodData();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950">
      <h1 className="sr-only">Flood warning monitoring dashboard</h1>

      <div className="absolute inset-0 z-0">
        {loading ? (
          <div className="flex h-full items-center justify-center text-slate-300">
            Loading map...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-red-300">
            {error}
          </div>
        ) : (
          <MapEngineContainer
            selectedPlace={selectedPlace}
            floodData={data}
            routePayload={routePayload}
            onRouteClear={() => setRoutePayload(null)}
          />
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.18),transparent_36%),radial-gradient(circle_at_left,rgba(30,64,175,0.14),transparent_40%)]" />
      <SceneEffectsOverlay />

      <DashboardOverlay>
        <TopAppHeader
          onSelectPlace={setSelectedPlace}
          onRoutesChange={setRoutePayload}
          alertOpen={alertOpen}
          onToggleAlert={() => setAlertOpen((prev) => !prev)}
          floodData={data}
        />

        <DashboardLeftRail>
          <LayerCatalog
            open={catalogOpen}
            onToggle={() => setCatalogOpen((prev) => !prev)}
          />
        </DashboardLeftRail>

        <DashboardRightInspector selected={false} />
      </DashboardOverlay>
    </main>
  );
}
