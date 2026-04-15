import type { Position } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type AmbientRoadClass,
} from "@/features/map/lib/traffic/get-road-class-lane-offset";
import { getClampedLaneOffsetMeters } from "@/features/map/lib/traffic/get-clamped-lane-offset";
import { getRoadTrafficEnvelope } from "@/features/map/lib/traffic/get-road-traffic-envelope";
import {
  normalizeBearing,
  offsetRouteSample,
  sampleRouteAtProgress,
} from "@/features/navigation/lib/route-sampling";
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
  densityMultiplier?: number;
  speedMultiplier?: number;
};

const MIN_ZOOM_TO_RENDER = 11.6;

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

  const byZoom =
    zoom >= 16.8
      ? 640
      : zoom >= 15.6
        ? 460
        : zoom >= 14.4
          ? 280
          : zoom >= 12.4
            ? 150
            : 72;
  const densityFactor = density === "full" ? 1.08 : 0.82;
  const detailFactor = detailPreset === "high" ? 1.08 : 1;

  return Math.max(18, Math.round(byZoom * densityFactor * detailFactor));
}

function getRoadLimitByZoom(zoom: number) {
  return zoom >= 16.8 ? 168 : zoom >= 15.6 ? 128 : zoom >= 14.4 ? 92 : zoom >= 12.4 ? 56 : 32;
}

function getBaseVehiclesPerDirection(roadClass: AmbientRoadClass, zoom: number) {
  if (roadClass === "major") {
    if (zoom < 12) return 2;
    if (zoom < 14) return 4;
    if (zoom < 16) return 6;
    return 8;
  }
  if (roadClass === "medium") {
    if (zoom < 12) return 1;
    if (zoom < 14) return 2;
    if (zoom < 16) return 4;
    return 6;
  }
  if (zoom < 14) return 1;
  if (zoom < 16) return 2;
  return 3;
}

function generateDirectionProgresses(
  count: number,
  seedRoot: string,
  roadClass: AmbientRoadClass,
  routeLengthMeters: number,
  convoyMode: boolean,
) {
  const progresses: number[] = [];
  let cursor = seededUnit(`${seedRoot}-start`);

  for (let index = 0; index < count; index += 1) {
    const random = seededUnit(`${seedRoot}-gap-${index}`);
    const queueChance = seededUnit(`${seedRoot}-queue-${index}`);

    let gap: number;
    if (convoyMode) {
      const baseGapMeters =
        roadClass === "major"
          ? 8.8 + random * 4.2
          : roadClass === "medium"
            ? 10.5 + random * 4.8
            : 12.8 + random * 5.2;
      const jitterScale = 0.82 + seededUnit(`${seedRoot}-gap-jitter-${index}`) * 0.36;
      gap = (baseGapMeters * jitterScale) / Math.max(180, routeLengthMeters);
      gap = Math.max(0.0048, Math.min(0.026, gap));
    } else {
      gap =
        roadClass === "major"
          ? 0.010 + random * 0.020
          : roadClass === "medium"
            ? 0.013 + random * 0.026
            : 0.017 + random * 0.032;
      if (queueChance < 0.35) {
        gap *= 0.72; // compact micro-cluster
      } else if (queueChance > 0.86) {
        gap *= 1.24; // sparse pocket
      }

      gap = Math.max(0.007, Math.min(0.068, gap));
    }

    cursor = (cursor + gap) % 1;
    progresses.push(cursor);
  }

  return progresses;
}

function allocateByClass(total: number) {
  return {
    major: Math.max(1, Math.round(total * 0.52)),
    medium: Math.max(1, Math.round(total * 0.34)),
    local: Math.max(1, Math.round(total * 0.14)),
  };
}

export function useAmbientTraffic({
  routes,
  zoom,
  enabled,
  density,
  detailPreset,
  densityMultiplier = 1,
  speedMultiplier = 1,
}: UseAmbientTrafficInput) {
  const [simulationClock, setSimulationClock] = useState(0);
  const hasLoggedEnvelopeDebugRef = useRef(false);

  const shouldRender =
    enabled &&
    density !== "off" &&
    zoom >= MIN_ZOOM_TO_RENDER &&
    routes.some((r) => r.coordinates.length > 1);

  const targetCount = useMemo(
    () => Math.max(0, Math.round(getTargetVehicleCount(zoom, density, detailPreset) * densityMultiplier)),
    [zoom, density, densityMultiplier, detailPreset],
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
    const convoyMode = zoom >= 15;
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
        const asymmetry = 0.92 + seededUnit(`flow-bias-${routeIndex}`) * 0.2;
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
            route.roadClass,
            route.lengthMeters ?? 280,
            convoyMode,
          );

          for (let slot = 0; slot < progresses.length; slot += 1) {
            const speedRange = getClassSpeedRange(route.roadClass);
            const speedBlend = seededUnit(`${routeIndex}-${direction}-speed-${slot}`);
            const speedFactor = convoyMode
              ? (0.94 + speedBlend * 0.12) * ((speedRange.min + speedRange.max) / 2)
              : speedRange.min + speedBlend * (speedRange.max - speedRange.min);
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
        const baseRoute = routeEntry?.coordinates;
        const route =
          vehicle.direction === "backward" && baseRoute
            ? [...baseRoute].reverse()
            : baseRoute;
        if (!route || route.length < 2) return null;

        const envelope = getRoadTrafficEnvelope(vehicle.roadClass, zoom);
        const baseLaneOffset = getClampedLaneOffsetMeters(vehicle.roadClass, zoom);
        const laneSpread = vehicle.laneVariant === 1 ? envelope.laneJitter : 0;
        const directionSign = vehicle.direction === "forward" ? 1 : -1;
        const laneOffset = directionSign * Math.min(
          envelope.maxLaneCenterOffset,
          baseLaneOffset + laneSpread,
        );
        const baseSpeed = 0.0095;
        const progressShift = simulationClock * baseSpeed * vehicle.speedFactor * speedMultiplier;
        const progress = ((vehicle.baseProgress + progressShift) % 1 + 1) % 1;
        const nextSample = sampleRouteAtProgress(route, progress);
        if (!nextSample) return null;
        const directionalBearing = normalizeBearing(nextSample.bearing);
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
  }, [routes, shouldRender, simulationClock, speedMultiplier, streamVehicles, zoom]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (hasLoggedEnvelopeDebugRef.current) return;
    const firstVehicle = vehicles[0];
    if (!firstVehicle) return;

    const envelope = getRoadTrafficEnvelope(firstVehicle.roadClass, zoom);
    console.log({
      roadWidth: envelope.roadWidth,
      laneOffset: envelope.laneOffset,
      vehicleWidth: envelope.vehicleWidth,
    });
    hasLoggedEnvelopeDebugRef.current = true;
  }, [vehicles, zoom]);

  return { vehicles, minZoomToRender: MIN_ZOOM_TO_RENDER };
}
