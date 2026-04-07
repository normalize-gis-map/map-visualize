"use client";

import { ArrowRight, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { PLACES, type PlaceItem } from "@/data/places";
import type { RouteAlternative } from "@/features/map/types/route.types";
import { getDrivingRoutes } from "@/services/routing/route.service";

type RoutePlannerProps = {
  onRoutesChange: (
    payload: {
      from: PlaceItem;
      to: PlaceItem;
      routes: RouteAlternative[];
      activeIndex: number;
    } | null,
  ) => void;
};

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  const remain = mins % 60;
  return `${hours} giờ ${remain} phút`;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function RoutePlanner({ onRoutesChange }: RoutePlannerProps) {
  const [fromLabel, setFromLabel] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [routes, setRoutes] = useState<RouteAlternative[]>([]);
  const [activeRoute, setActiveRoute] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fromPlace = useMemo(
    () => PLACES.find((item) => item.label === fromLabel) ?? null,
    [fromLabel],
  );
  const toPlace = useMemo(
    () => PLACES.find((item) => item.label === toLabel) ?? null,
    [toLabel],
  );

  const searchId = "hcm-route-place-options";

  const handlePlan = async () => {
    if (!fromPlace || !toPlace) {
      setError("Chọn đúng From/To từ danh sách gợi ý.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const alternatives = await getDrivingRoutes(fromPlace, toPlace);
      setRoutes(alternatives);
      setActiveRoute(0);
      onRoutesChange({
        from: fromPlace,
        to: toPlace,
        routes: alternatives,
        activeIndex: 0,
      });
    } catch (err) {
      setRoutes([]);
      onRoutesChange(null);
      setError(err instanceof Error ? err.message : "Không thể tìm đường.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFromLabel("");
    setToLabel("");
    setRoutes([]);
    setActiveRoute(0);
    setError("");
    onRoutesChange(null);
  };

  const handleSelectRoute = (index: number) => {
    if (!fromPlace || !toPlace || !routes[index]) return;
    setActiveRoute(index);
    onRoutesChange({
      from: fromPlace,
      to: toPlace,
      routes,
      activeIndex: index,
    });
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            From
          </span>
          <input
            list={searchId}
            value={fromLabel}
            onChange={(event) => setFromLabel(event.target.value)}
            placeholder="Quận 1..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            To
          </span>
          <input
            list={searchId}
            value={toLabel}
            onChange={(event) => setToLabel(event.target.value)}
            placeholder="Huyện Cần Giờ..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>

        <button
          type="button"
          onClick={handlePlan}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Go
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      </div>

      <datalist id={searchId}>
        {PLACES.map((place) => (
          <option key={place.key} value={place.label} />
        ))}
      </datalist>

      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}

      {routes.length > 0 ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {routes.map((route, index) => {
            const active = index === activeRoute;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => handleSelectRoute(index)}
                className={`rounded-xl border px-3 py-2 text-left ${
                  active
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="text-sm font-semibold text-slate-800">
                  {active ? "Đường chính" : `Gợi ý ${index + 1}`}
                </div>
                <div className="text-xs text-slate-600">
                  {formatDuration(route.durationSeconds)} •{" "}
                  {formatDistance(route.distanceMeters)}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
