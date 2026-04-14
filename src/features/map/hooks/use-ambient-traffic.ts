import type { Position } from "geojson";
import { useEffect, useMemo, useState } from "react";

import {
  normalizeBearing,
  offsetRouteSample,
  sampleRouteAtProgress,
} from "@/features/map/navigation/route-sampling";
import type {
  DetailPreset,
  TrafficDensity,
} from "@/features/map/store/map.store";

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
  density: TrafficDensity;
  detailPreset: DetailPreset;
};

const MIN_ZOOM_TO_RENDER = 13;

function getTargetVehicleCount(
  zoom: number,
  density: TrafficDensity,
  detailPreset: DetailPreset,
) {
  if (density === "off") return 0;

  const byZoom = zoom >= 16.8 ? 180 : zoom >= 15 ? 130 : zoom >= 14 ? 80 : 24;
  const densityFactor = density === "full" ? 1 : 0.58;
  const detailFactor = detailPreset === "high" ? 1.06 : 1;

  return Math.max(12, Math.round(byZoom * densityFactor * detailFactor));
}

export function useAmbientTraffic({
  routes,
  zoom,
  enabled,
  density,
  detailPreset,
}: UseAmbientTrafficInput) {
  const [seedVehicles, setSeedVehicles] = useState<SeedVehicle[]>([]);

  const shouldRender =
    enabled &&
    density !== "off" &&
    zoom >= MIN_ZOOM_TO_RENDER &&
    routes.some((r) => r.length > 1);

  const targetCount = useMemo(
    () => getTargetVehicleCount(zoom, density, detailPreset),
    [zoom, density, detailPreset],
  );

  useEffect(() => {
    if (!shouldRender || targetCount <= 0 || !routes.length) {
      const frame = requestAnimationFrame(() =>
        setSeedVehicles((prev) => (prev.length ? [] : prev)),
      );
      return () => cancelAnimationFrame(frame);
    }

    const frame = requestAnimationFrame(() => {
      const usableRouteIndexes = routes
        .map((route, index) => ({ route, index }))
        .filter((item) => item.route.length > 2)
        .slice(0, 48)
        .map((item) => item.index);

      if (!usableRouteIndexes.length) {
        setSeedVehicles((prev) => (prev.length ? [] : prev));
        return;
      }

      const perDirection = Math.max(
        1,
        Math.floor(targetCount / (usableRouteIndexes.length * 2)),
      );
      const maxPerDirection = zoom >= 16 ? 4 : zoom >= 15 ? 3 : 2;
      const vehiclesPerDirection = Math.min(maxPerDirection, perDirection);
      const generated: SeedVehicle[] = [];

      for (const routeIndex of usableRouteIndexes) {
        for (const direction of ["forward", "backward"] as const) {
          let progressCursor = Math.random() * 0.12;
          for (let lane = 0 as 0 | 1; lane < 2; lane += 1) {
            for (let slot = 0; slot < vehiclesPerDirection; slot += 1) {
              const spacingMeters = 15 + Math.random() * 45;
              const spacingProgress = spacingMeters / 1600;
              progressCursor = (progressCursor + spacingProgress) % 1;

              generated.push({
                id: `ambient-${routeIndex}-${direction}-${lane}-${slot}`,
                routeIndex,
                progress: progressCursor,
                lane,
                speed: 0.0105 + Math.random() * 0.0045,
                direction,
              });
              if (generated.length >= targetCount) break;
            }
            if (generated.length >= targetCount) break;
          }
          if (generated.length >= targetCount) break;
        }
        if (generated.length >= targetCount) break;
      }

      setSeedVehicles(generated);
    });

    return () => cancelAnimationFrame(frame);
  }, [routes, shouldRender, targetCount, zoom]);

  useEffect(() => {
    if (!shouldRender || !seedVehicles.length) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const elapsed = now - last;
      if (elapsed < 80) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const dt = elapsed / 1000;
      last = now;

      setSeedVehicles((prev) =>
        prev.map((vehicle, index) => {
          const directionSign = vehicle.direction === "forward" ? 1 : -1;
          const speedMultiplier = 0.8 + (index % 9) * 0.05;
          const nextProgress =
            vehicle.progress +
            vehicle.speed * dt * directionSign * speedMultiplier;

          return {
            ...vehicle,
            progress: ((nextProgress % 1) + 1) % 1,
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

        const laneOffset = vehicle.direction === "forward" ? 0.38 : -0.38;
        const shifted = offsetRouteSample(
          { ...sample, bearing: directionalBearing },
          laneOffset,
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
