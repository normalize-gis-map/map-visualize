import type { LineString } from "geojson";
import { useEffect, useMemo, useRef, useState } from "react";

import type { RouteStep, TransportMode } from "@/features/map/types/route.types";

import { buildTrafficProgress, sampleRouteAtProgress } from "./route-sampling";

type UseNavigationPlaybackInput = {
  geometry: LineString | null;
  steps: RouteStep[];
  mode: TransportMode;
};

export function useNavigationPlayback({
  geometry,
  steps,
  mode,
}: UseNavigationPlaybackInput) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heading, setHeading] = useState(0);
  const headingRef = useRef(0);

  const coordinates = geometry?.coordinates ?? [];

  useEffect(() => {
    if (!isPlaying || coordinates.length < 2) return;

    let frameId = 0;
    let last = performance.now();
    const speed = mode === "car" ? 0.00008 : mode === "bike" ? 0.00006 : 0.00004;

    const animate = (now: number) => {
      const dt = now - last;
      last = now;

      setProgress((prev) => {
        const next = Math.min(1, prev + dt * speed);
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
  }, [coordinates, isPlaying, mode]);

  const navSample = useMemo(
    () => sampleRouteAtProgress(coordinates, progress),
    [coordinates, progress],
  );

  const activeStepIndex = useMemo(() => {
    if (!steps.length) return 0;
    return Math.min(steps.length - 1, Math.floor(progress * steps.length));
  }, [progress, steps.length]);

  const trafficSamples = useMemo(() => {
    if (!coordinates.length) return [];
    return buildTrafficProgress(progress).map((item) => {
      const sample = sampleRouteAtProgress(coordinates, item.progress);
      return sample ? { id: item.id, ...sample } : null;
    }).filter((item): item is { id: string; lng: number; lat: number; bearing: number } => Boolean(item));
  }, [coordinates, progress]);

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
    navCoordinate: navSample ? ([navSample.lng, navSample.lat] as [number, number]) : null,
    trafficSamples,
    activeStepIndex,
    togglePlayback: () => setIsPlaying((prev) => !prev),
    pause: () => setIsPlaying(false),
    reset,
    setProgress,
  };
}
