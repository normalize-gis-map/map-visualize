"use client";

import { useMemo, useState } from "react";

import { DashboardLeftRail } from "@/components/dashboard/dashboard-left-rail";
import { DashboardOverlay } from "@/components/dashboard/dashboard-overlay";
import { DashboardRightInspector } from "@/components/dashboard/dashboard-right-inspector";
import { TopAppHeader } from "@/components/layout/header/top-app-header";
import { MapEngineContainer } from "@/components/map/engines/map-engine-container";
import type { PlaceItem } from "@/data/places";
import { useFloodData } from "@/features/flood/hooks/use-flood-data";
import { LayerCatalog } from "@/features/map/components/controls/layer-catalog";
import { getSceneTone } from "@/features/map/lib/weather/weather-effects";
import { useFloodStore } from "@/features/map/store/map.store";
import type { RouteAlternative } from "@/features/map/types/route.types";

type RoutePayload = {
  from: PlaceItem;
  to: PlaceItem;
  routes: RouteAlternative[];
  activeIndex: number;
};

function SceneEffectsOverlay() {
  const { transportVisibility, weatherMode, timeMode, hasHydrated } = useFloodStore();
  const tone = getSceneTone(weatherMode, timeMode);

  const transportBadges = useMemo(
    () => [
      {
        key: "boats",
        enabled: transportVisibility.boats,
        label: "Boats active",
        className:
          "border-cyan-200/25 bg-cyan-300/12 text-cyan-100 bottom-16",
      },
      {
        key: "bike",
        enabled: transportVisibility.bike,
        label: "Bike flow active",
        className:
          "border-lime-200/25 bg-lime-300/12 text-lime-100 bottom-24",
      },
      {
        key: "people",
        enabled: transportVisibility.people,
        label: "Pedestrian flow active",
        className:
          "border-fuchsia-200/25 bg-fuchsia-300/12 text-fuchsia-100 bottom-32",
      },
    ],
    [transportVisibility.bike, transportVisibility.boats, transportVisibility.people],
  );

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 z-10 transition-colors duration-300 ${hasHydrated ? tone.weatherTone : "bg-transparent"}`}
      />
      <div
        className={`pointer-events-none absolute inset-0 z-10 transition-colors duration-300 ${hasHydrated ? tone.timeTone : "bg-transparent"}`}
      />
      <div
        className={`pointer-events-none absolute inset-0 z-10 transition duration-300 ${hasHydrated ? tone.weatherContrast : "contrast-100 saturate-100"}`}
      />

      {hasHydrated && tone.rainPattern ? (
        <div className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(108deg,rgba(148,163,184,0.1)_0px,rgba(148,163,184,0.1)_1px,transparent_1px,transparent_12px)] opacity-45" />
      ) : null}
      {hasHydrated && tone.snowPattern ? (
        <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle,rgba(226,232,240,0.55)_1px,transparent_1px)] bg-[length:16px_16px] opacity-30" />
      ) : null}

      {hasHydrated && transportBadges.map((badge) =>
        badge.enabled ? (
          <div
            key={badge.key}
            className={`pointer-events-none absolute right-10 z-20 rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase ${badge.className}`}
          >
            {badge.label}
          </div>
        ) : null,
      )}
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
