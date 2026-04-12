import type { Position } from "geojson";
import { useEffect, useMemo, useState } from "react";

import { normalizeBearing, offsetRouteSample, sampleRouteAtProgress } from "@/features/map/navigation/route-sampling";

export type AmbientTrafficVehicle = {
  id: string;
  lng: number;
  lat: number;
  bearing: number;
  speed: number;
  direction: "forward" | "backward";
};

type SeedVehicle = {
  id: string;
  routeIndex: number;
  progress: number;
  speed: number;
  direction: "forward" | "backward";
  laneOffset: number;
};

type UseAmbientTrafficInput = {
  routes: Position[][];
  zoom: number;
  enabled: boolean;
};

const MIN_ZOOM_TO_RENDER = 13;

export function useAmbientTraffic({ routes, zoom, enabled }: UseAmbientTrafficInput) {
  const [seedVehicles, setSeedVehicles] = useState<SeedVehicle[]>([]);

  const shouldRender = enabled && zoom >= MIN_ZOOM_TO_RENDER && routes.some((r) => r.length > 1);

  const targetCount = useMemo(() => {
    if (!shouldRender) return 0;
    if (zoom >= 15.5) return 46;
    if (zoom >= 14.2) return 30;
    return 18;
  }, [shouldRender, zoom]);

  useEffect(() => {
    if (!shouldRender || targetCount === 0) {
      const frame = requestAnimationFrame(() => setSeedVehicles([]));
      return () => cancelAnimationFrame(frame);
    }

    const seeded = Array.from({ length: targetCount }, (_, index) => ({
      id: `ambient-${index}`,
      routeIndex: Math.floor(Math.random() * routes.length),
      progress: Math.random(),
      speed: 0.02 + Math.random() * 0.05,
      direction: (index % 2 === 0 ? "forward" : "backward") as "forward" | "backward",
      laneOffset: index % 2 === 0 ? 2.1 : -2.1,
    }));

    const frame = requestAnimationFrame(() => setSeedVehicles(seeded));
    return () => cancelAnimationFrame(frame);
  }, [routes.length, shouldRender, targetCount]);

  useEffect(() => {
    if (!shouldRender || !seedVehicles.length) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      setSeedVehicles((prev) =>
        prev.map((vehicle) => {
          const dir = vehicle.direction === "forward" ? 1 : -1;
          const nextProgressRaw = vehicle.progress + vehicle.speed * dt * dir;
          const wrapped = ((nextProgressRaw % 1) + 1) % 1;
          return {
            ...vehicle,
            progress: wrapped,
          };
        }),
      );

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shouldRender, seedVehicles.length]);

  const vehicles = useMemo<AmbientTrafficVehicle[]>(() => {
    if (!shouldRender) return [];

    return seedVehicles
      .map((vehicle) => {
        const route = routes[vehicle.routeIndex] ?? routes[0];
        if (!route || route.length < 2) return null;

        const sample = sampleRouteAtProgress(route, vehicle.progress);
        if (!sample) return null;

        const directionalBearing =
          vehicle.direction === "forward"
            ? normalizeBearing(sample.bearing)
            : normalizeBearing(sample.bearing + 180);

        const shifted = offsetRouteSample(
          { ...sample, bearing: directionalBearing },
          vehicle.laneOffset,
        );

        return {
          id: vehicle.id,
          lng: shifted.lng,
          lat: shifted.lat,
          bearing: normalizeBearing(shifted.bearing),
          speed: vehicle.speed,
          direction: vehicle.direction,
        };
      })
      .filter((item): item is AmbientTrafficVehicle => Boolean(item));
  }, [routes, seedVehicles, shouldRender]);

  return { vehicles, minZoomToRender: MIN_ZOOM_TO_RENDER };
}
