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
  lane: 0 | 1;
  speed: number;
  direction: "forward" | "backward";
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
    if (zoom >= 16.5) return 180;
    if (zoom >= 15.5) return 130;
    if (zoom >= 14.6) return 90;
    if (zoom >= 13.8) return 58;
    return 34;
  }, [shouldRender, zoom]);

  useEffect(() => {
    if (!shouldRender || targetCount === 0) {
      const frame = requestAnimationFrame(() =>
        setSeedVehicles((prev) => (prev.length ? [] : prev)),
      );
      return () => cancelAnimationFrame(frame);
    }

    const frame = requestAnimationFrame(() =>
      setSeedVehicles((prev) => {
        const limitedPrev = prev.slice(0, targetCount);
        if (limitedPrev.length === targetCount) return limitedPrev;

        const appended = Array.from(
          { length: targetCount - limitedPrev.length },
          (_, index) => {
            const order = limitedPrev.length + index;
            const lane = (order % 2) as 0 | 1;
            const progressBand = ((order * 0.071) % 1 + Math.random() * 0.02) % 1;
            return {
              id: `ambient-${order}`,
              routeIndex: Math.floor(Math.random() * routes.length),
              progress: progressBand,
              lane,
              speed: 0.012 + (order % 5) * 0.0025 + Math.random() * 0.003,
              direction: (lane === 0 ? "forward" : "backward") as "forward" | "backward",
            };
          },
        );

        return [...limitedPrev, ...appended];
      }),
    );
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
        {
          const moved = prev.map((vehicle, index) => {
            const dir = vehicle.direction === "forward" ? 1 : -1;
            const tempo = 0.85 + Math.sin(now * 0.00035 + index) * 0.15;
            const nextProgressRaw = vehicle.progress + vehicle.speed * dt * dir * tempo;
            const wrapped = ((nextProgressRaw % 1) + 1) % 1;
            return { ...vehicle, progress: wrapped };
          });

          const minGap = 0.011;
          const grouped = new Map<string, SeedVehicle[]>();
          moved.forEach((vehicle) => {
            const key = `${vehicle.routeIndex}-${vehicle.direction}-${vehicle.lane}`;
            const list = grouped.get(key);
            if (list) list.push(vehicle);
            else grouped.set(key, [vehicle]);
          });

          grouped.forEach((items) => {
            items.sort((a, b) => a.progress - b.progress);
            for (let index = 1; index < items.length; index += 1) {
              const prevItem = items[index - 1];
              const current = items[index];
              if (current.progress - prevItem.progress < minGap) {
                current.progress = (prevItem.progress + minGap) % 1;
              }
            }
            if (items.length > 1) {
              const first = items[0];
              const lastItem = items[items.length - 1];
              const wrappedGap = (first.progress + 1) - lastItem.progress;
              if (wrappedGap < minGap) {
                first.progress = (lastItem.progress + minGap) % 1;
              }
            }
          });

          return moved;
        },
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

        const laneOffset = vehicle.direction === "forward" ? 0.85 : -0.85;
        const shifted = offsetRouteSample({ ...sample, bearing: directionalBearing }, laneOffset);

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
