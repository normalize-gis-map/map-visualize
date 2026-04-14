"use client";

import { ArrowLeft, ArrowRight, Bike, Car, Footprints, Loader2, LocateFixed, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PLACES, type PlaceItem } from "@/data/places";
import type {
  RouteAlternative,
  TransportMode,
} from "@/features/map/types/route.types";
import { getRoutes } from "@/services/routing/route.service";

type RoutePlannerProps = {
  onRoutesChange: (
    payload: {
      from: PlaceItem;
      to: PlaceItem;
      routes: RouteAlternative[];
      activeIndex: number;
    } | null,
  ) => void;
  initialToLabel?: string;
  onBackToSearch?: () => void;
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

export function RoutePlanner({
  onRoutesChange,
  initialToLabel,
  onBackToSearch,
}: RoutePlannerProps) {
  const [fromLabel, setFromLabel] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [routes, setRoutes] = useState<RouteAlternative[]>([]);
  const [activeRoute, setActiveRoute] = useState(0);
  const [mode, setMode] = useState<TransportMode>("car");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [myLocation, setMyLocation] = useState<PlaceItem | null>(null);

  const fromPlace = useMemo(
    () => {
      if (myLocation && fromLabel === myLocation.label) return myLocation;
      return PLACES.find((item) => item.label === fromLabel) ?? null;
    },
    [fromLabel, myLocation],
  );
  const toPlace = useMemo(
    () => PLACES.find((item) => item.label === toLabel) ?? null,
    [toLabel],
  );

  const searchId = "hcm-route-place-options";

  useEffect(() => {
    if (initialToLabel) {
      setToLabel(initialToLabel);
    }
  }, [initialToLabel]);

  const handlePlan = async () => {
    if (!fromPlace || !toPlace) {
      setError("Chọn đúng From/To từ danh sách gợi ý.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const alternatives = await getRoutes(fromPlace, toPlace, mode);
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
    setMyLocation(null);
    onRoutesChange(null);
  };

  const handleUseMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPlace: PlaceItem = {
          key: "my-current-location",
          label: "Vị trí của tôi",
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14.5,
        };
        setMyLocation(currentPlace);
        setFromLabel(currentPlace.label);
        setError("");
        setLocating(false);
      },
      () => {
        setError("Không lấy được vị trí hiện tại. Hãy bật quyền định vị.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
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
    <div className="rounded-3xl border border-slate-200/90 bg-white/92 p-3 shadow-lg backdrop-blur md:p-4">
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { id: "car", label: "Car", icon: Car },
          { id: "bike", label: "Bike", icon: Bike },
          { id: "walk", label: "Walk", icon: Footprints },
        ].map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id as TransportMode)}
              className={`flex h-11 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition ${
                active
                  ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-2 md:grid-cols-[auto_minmax(160px,1fr)_auto_minmax(160px,1fr)_auto_auto]">
        {onBackToSearch ? (
          <button
            type="button"
            onClick={onBackToSearch}
            className="inline-flex h-11 items-center justify-center gap-1 rounded-2xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Search
          </button>
        ) : null}
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2">
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
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-2xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          title="Dùng vị trí hiện tại cho điểm đi"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          Vị trí tôi
        </button>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2">
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
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Go
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {routes.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
          {routes.map((route, index) => {
            const active = index === activeRoute;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => handleSelectRoute(index)}
                className={`min-w-[180px] rounded-2xl border px-3 py-2 text-left transition md:min-w-0 ${
                  active
                    ? "border-blue-300 bg-blue-50 shadow-sm"
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
