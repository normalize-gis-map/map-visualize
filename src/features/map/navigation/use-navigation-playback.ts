import type { LineString } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";

import type { RouteStep, TransportMode } from "@/features/map/types/route.types";

import {
  buildTrafficProgress,
  normalizeBearing,
  offsetRouteSample,
  sampleRouteAtProgress,
} from "./route-sampling";

type UseNavigationPlaybackInput = {
  geometry: LineString | null;
  steps: RouteStep[];
  mode: TransportMode;
};

const SPEED_MULTIPLIERS = [0.5, 1, 2] as const;

type TrafficSample = {
  id: string;
  lng: number;
  lat: number;
  bearing: number;
  direction: "forward" | "backward";
  vehicleType: "car" | "bike";
};

export function useNavigationPlayback({
  geometry,
  steps,
  mode,
}: UseNavigationPlaybackInput) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heading, setHeading] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] =
    useState<(typeof SPEED_MULTIPLIERS)[number]>(1);
  const [trafficPhase, setTrafficPhase] = useState(0);
  const headingRef = useRef(0);

  const coordinates = useMemo(() => geometry?.coordinates ?? [], [geometry]);

  useEffect(() => {
    if (!isPlaying || coordinates.length < 2) return;

    let frameId = 0;
    let last = performance.now();
    const baseSpeed = mode === "car" ? 0.00008 : mode === "bike" ? 0.00006 : 0.00004;

    const animate = (now: number) => {
      const dt = now - last;
      last = now;

      setProgress((prev) => {
        const next = Math.min(1, prev + dt * baseSpeed * speedMultiplier);
        const sample = sampleRouteAtProgress(coordinates, next);

        if (sample) {
          const delta = ((((sample.bearing - headingRef.current) % 360) + 540) % 360) - 180;
          headingRef.current += delta * 0.16;
          setHeading(headingRef.current);
        }

        if (next >= 1) {
          setIsPlaying(false);
        }

        return next;
      });

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [coordinates, isPlaying, mode, speedMultiplier]);

  useEffect(() => {
    if (coordinates.length < 2) return;
    let frameId = 0;
    let last = performance.now();

    const animateTraffic = (now: number) => {
      const dt = now - last;
      last = now;
      setTrafficPhase((prev) => (prev + dt * 0.00005) % 1);
      frameId = requestAnimationFrame(animateTraffic);
    };

    frameId = requestAnimationFrame(animateTraffic);
    return () => cancelAnimationFrame(frameId);
  }, [coordinates]);

  const navSample = useMemo(
    () => sampleRouteAtProgress(coordinates, progress),
    [coordinates, progress],
  );

  const activeStepIndex = useMemo(() => {
    if (!steps.length) return 0;
    return Math.min(steps.length - 1, Math.floor(progress * steps.length));
  }, [progress, steps.length]);

  const trafficSamples = useMemo<TrafficSample[]>(() => {
    if (!coordinates.length) return [];

    const forwardLaneOffset = 0.45;
    const backwardLaneOffset = -0.45;
    const forward: TrafficSample[] = [];
    const backward: TrafficSample[] = [];

    buildTrafficProgress(trafficPhase, 12).forEach((item, index) => {
      const sample = sampleRouteAtProgress(coordinates, item.progress);
      if (!sample) return;
      const shifted = offsetRouteSample(sample, forwardLaneOffset);
      forward.push({
        id: `${item.id}-forward`,
        direction: "forward",
        vehicleType: index % 7 === 0 ? "bike" : "car",
        ...shifted,
        bearing: normalizeBearing(shifted.bearing),
      });
    });

    buildTrafficProgress(1 - trafficPhase, 10).forEach((item, index) => {
      const sample = sampleRouteAtProgress(coordinates, item.progress);
      if (!sample) return;
      const reversed = {
        ...sample,
        bearing: normalizeBearing(sample.bearing + 180),
      };
      const shifted = offsetRouteSample(reversed, backwardLaneOffset);
      backward.push({
        id: `${item.id}-backward`,
        direction: "backward",
        vehicleType: index % 8 === 0 ? "bike" : "car",
        ...shifted,
        bearing: normalizeBearing(shifted.bearing),
      });
    });

    return [...forward, ...backward];
  }, [coordinates, trafficPhase]);

  const seek = (nextProgress: number) => {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(nextProgress) ? nextProgress : 0));
    const sample = sampleRouteAtProgress(coordinates, clamped);
    if (sample) {
      headingRef.current = sample.bearing;
      setHeading(sample.bearing);
    }
    setProgress(clamped);
    if (clamped >= 1) {
      setIsPlaying(false);
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setProgress(0);
    headingRef.current = 0;
    setHeading(0);
  };

  return {
    isPlaying,
    progress,
    heading,
    speedMultiplier,
    availableSpeedMultipliers: SPEED_MULTIPLIERS,
    navCoordinate: navSample ? ([navSample.lng, navSample.lat] as [number, number]) : null,
    trafficSamples,
    activeStepIndex,
    togglePlayback: () => setIsPlaying((prev) => !prev),
    pause: () => setIsPlaying(false),
    reset,
    seek,
    setSpeedMultiplier,
  };
}
