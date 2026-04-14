import type { Position } from "geojson";
import { useEffect, useMemo, useState } from "react";

import {
  type AmbientRoadClass,
} from "@/features/map/lib/get-road-class-lane-offset";
import { getClampedLaneOffsetMeters } from "@/features/map/lib/get-clamped-lane-offset";
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
  roadClass: AmbientRoadClass;
};

export type AmbientTrafficRoute = {
  coordinates: Position[];
  roadClass: AmbientRoadClass;
  lengthMeters?: number;
};

type StreamVehicle = {
  id: string;
  routeIndex: number;
  baseProgress: number;
  laneVariant: 0 | 1;
  speedFactor: number;
  roadClass: AmbientRoadClass;
  direction: "forward" | "backward";
};

type UseAmbientTrafficInput = {
  routes: AmbientTrafficRoute[];
  zoom: number;
  enabled: boolean;
  density: TrafficDensity;
  detailPreset: DetailPreset;
};

const MIN_ZOOM_TO_RENDER = 13;

function hashNumber(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function seededUnit(seed: string) {
  return (hashNumber(seed) % 10000) / 10000;
}

function getClassSpeedRange(roadClass: AmbientRoadClass) {
  if (roadClass === "major") return { min: 1, max: 1.25 };
  if (roadClass === "medium") return { min: 0.9, max: 1.15 };
  return { min: 0.75, max: 1 };
}

function getTargetVehicleCount(
  zoom: number,
  density: TrafficDensity,
  detailPreset: DetailPreset,
) {
  if (density === "off") return 0;

  const byZoom = zoom >= 16.8 ? 280 : zoom >= 15.6 ? 200 : zoom >= 14.4 ? 120 : 42;
  const densityFactor = density === "full" ? 1 : 0.62;
  const detailFactor = detailPreset === "high" ? 1.12 : 1;

  return Math.max(12, Math.round(byZoom * densityFactor * detailFactor));
}

function getRoadLimitByZoom(zoom: number) {
  return zoom >= 16.8 ? 96 : zoom >= 15.6 ? 72 : zoom >= 14.4 ? 48 : 28;
}

function getBaseVehiclesPerDirection(roadClass: AmbientRoadClass, zoom: number) {
  const zoomBoost = zoom >= 16.8 ? 2 : zoom >= 15.6 ? 1 : 0;
  if (roadClass === "major") return 2 + zoomBoost;
  if (roadClass === "medium") return 2 + (zoom >= 15.2 ? 1 : 0);
  return zoom >= 16.2 ? 2 : 1;
}

function generateDirectionProgresses(count: number, seedRoot: string) {
  const progresses: number[] = [];
  let cursor = seededUnit(`${seedRoot}-start`);

  for (let index = 0; index < count; index += 1) {
    const random = seededUnit(`${seedRoot}-gap-${index}`);
    const queueChance = seededUnit(`${seedRoot}-queue-${index}`);

    let gap = 0.02 + random * 0.055;
    if (queueChance < 0.28) {
      gap *= 0.58; // compact micro-cluster
    } else if (queueChance > 0.86) {
      gap *= 1.55; // sparse pocket
    }

    gap = Math.max(0.012, Math.min(0.12, gap));
    cursor = (cursor + gap) % 1;
    progresses.push(cursor);
  }

  return progresses;
}

function allocateByClass(total: number) {
  return {
    major: Math.max(1, Math.round(total * 0.4)),
    medium: Math.max(1, Math.round(total * 0.35)),
    local: Math.max(1, Math.round(total * 0.25)),
  };
}

export function useAmbientTraffic({
  routes,
  zoom,
  enabled,
  density,
  detailPreset,
}: UseAmbientTrafficInput) {
  const [simulationClock, setSimulationClock] = useState(0);

  const shouldRender =
    enabled &&
    density !== "off" &&
    zoom >= MIN_ZOOM_TO_RENDER &&
    routes.some((r) => r.coordinates.length > 1);

  const targetCount = useMemo(
    () => getTargetVehicleCount(zoom, density, detailPreset),
    [zoom, density, detailPreset],
  );

  const streamVehicles = useMemo<StreamVehicle[]>(() => {
    if (!shouldRender || targetCount <= 0 || !routes.length) return [];

    const eligibleRoutes = routes
      .map((route, index) => ({ route, index }))
      .filter(({ route }) => route.coordinates.length > 3)
      .slice(0, getRoadLimitByZoom(zoom));

    const byClass = {
      major: eligibleRoutes.filter((entry) => entry.route.roadClass === "major"),
      medium: eligibleRoutes.filter((entry) => entry.route.roadClass === "medium"),
      local: eligibleRoutes.filter((entry) => entry.route.roadClass === "local"),
    };
    const classBudget = allocateByClass(targetCount);
    const generated: StreamVehicle[] = [];
    const addFromBucket = (
      entries: typeof eligibleRoutes,
      targetBudget: number,
      fallbackCount = 1,
    ) => {
      let bucketCount = 0;
      for (const { route, index: routeIndex } of entries) {
        const basePerDirection = Math.max(
          fallbackCount,
          getBaseVehiclesPerDirection(route.roadClass, zoom),
        );
        const asymmetry = 0.78 + seededUnit(`flow-bias-${routeIndex}`) * 0.5;
        const forwardCount = Math.max(1, Math.round(basePerDirection * asymmetry));
        const backwardCount = Math.max(
          1,
          Math.round(basePerDirection * (2 - asymmetry)),
        );

        for (const [direction, count] of [
          ["forward", forwardCount],
          ["backward", backwardCount],
        ] as const) {
          const progresses = generateDirectionProgresses(
            count,
            `${routeIndex}-${direction}`,
          );

          for (let slot = 0; slot < progresses.length; slot += 1) {
            const speedRange = getClassSpeedRange(route.roadClass);
            const speedBlend = seededUnit(`${routeIndex}-${direction}-speed-${slot}`);
            const speedFactor =
              speedRange.min + speedBlend * (speedRange.max - speedRange.min);
            const laneVariant =
              seededUnit(`${routeIndex}-${direction}-lane-${slot}`) > 0.62 ? 1 : 0;

            generated.push({
              id: `ambient-${routeIndex}-${direction}-${slot}`,
              routeIndex,
              baseProgress: progresses[slot] ?? 0,
              laneVariant,
              speedFactor,
              roadClass: route.roadClass,
              direction,
            });
            bucketCount += 1;
            if (generated.length >= targetCount || bucketCount >= targetBudget) {
              return;
            }
          }
        }
      }
    };

    addFromBucket(byClass.major, classBudget.major, 2);
    addFromBucket(byClass.medium, classBudget.medium, 1);
    addFromBucket(byClass.local, classBudget.local, 1);

    if (generated.length < targetCount) {
      addFromBucket(eligibleRoutes, targetCount - generated.length, 1);
    }

    return generated;
  }, [routes, shouldRender, targetCount, zoom]);

  useEffect(() => {
    if (!shouldRender || !streamVehicles.length) return;

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

      setSimulationClock((prev) => prev + dt);

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shouldRender, streamVehicles.length]);

  const vehicles = useMemo<AmbientTrafficVehicle[]>(() => {
    if (!shouldRender) return [];

    return streamVehicles
      .map((vehicle) => {
        const routeEntry = routes[vehicle.routeIndex] ?? routes[0];
        const route = routeEntry?.coordinates;
        if (!route || route.length < 2) return null;

        const baseLaneOffset = getClampedLaneOffsetMeters(vehicle.roadClass, zoom);
        const laneSpread = Math.min(
          vehicle.roadClass === "major"
            ? 0.62
            : vehicle.roadClass === "medium"
              ? 0.5
              : 0.36,
          baseLaneOffset * 0.22,
        );
        const directionSign = vehicle.direction === "forward" ? 1 : -1;
        const laneOffset =
          directionSign * baseLaneOffset +
          (vehicle.laneVariant === 1 ? directionSign * laneSpread : 0);
        const baseSpeed = 0.0095;
        const progressShift =
          simulationClock * baseSpeed * vehicle.speedFactor * directionSign;
        const progress = ((vehicle.baseProgress + progressShift) % 1 + 1) % 1;
        const nextSample = sampleRouteAtProgress(route, progress);
        if (!nextSample) return null;
        const directionalBearing =
          vehicle.direction === "forward"
            ? normalizeBearing(nextSample.bearing)
            : normalizeBearing(nextSample.bearing + 180);
        const shifted = offsetRouteSample(
          { ...nextSample, bearing: directionalBearing },
          laneOffset,
        );

        return {
          id: vehicle.id,
          lng: shifted.lng,
          lat: shifted.lat,
          bearing: normalizeBearing(shifted.bearing),
          speed: vehicle.speedFactor,
          direction: vehicle.direction,
          roadClass: vehicle.roadClass,
        };
      })
      .filter((item): item is AmbientTrafficVehicle => Boolean(item));
  }, [routes, shouldRender, simulationClock, streamVehicles, zoom]);

  return { vehicles, minZoomToRender: MIN_ZOOM_TO_RENDER };
}
