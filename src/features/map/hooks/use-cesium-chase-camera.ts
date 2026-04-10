import * as Cesium from "cesium";
import { useCallback, useRef } from "react";

import { sampleRouteAtProgress } from "@/features/map/navigation/route-sampling";

const LOOKAHEAD_PROGRESS = 0.015;

export function useCesiumChaseCamera() {
  const smoothHeadingRef = useRef<number | null>(null);
  const smoothFocusRef = useRef<{ lng: number; lat: number } | null>(null);

  const resetChaseCamera = useCallback(() => {
    smoothHeadingRef.current = null;
    smoothFocusRef.current = null;
  }, []);

  const updateChaseCamera = useCallback(
    (
      viewer: Cesium.Viewer,
      coordinates: number[][],
      progress: number,
      options?: {
        altitude?: number;
        pitchDegrees?: number;
        lookAheadProgress?: number;
        damping?: number;
        speedFactor?: number;
      },
    ) => {
      const dynamicLookAhead = Math.max(
        0.01,
        (options?.lookAheadProgress ?? LOOKAHEAD_PROGRESS) +
          (options?.speedFactor ?? 0) * 0.006,
      );
      const focus = sampleRouteAtProgress(coordinates, progress);
      const ahead = sampleRouteAtProgress(
        coordinates,
        Math.min(1, progress + dynamicLookAhead),
      );

      if (!focus || !ahead) return;

      const damping = options?.damping ?? 0.18;
      const previousFocus = smoothFocusRef.current ?? { lng: focus.lng, lat: focus.lat };
      const smoothedFocus = {
        lng: previousFocus.lng + (focus.lng - previousFocus.lng) * Math.min(0.35, damping + 0.08),
        lat: previousFocus.lat + (focus.lat - previousFocus.lat) * Math.min(0.35, damping + 0.08),
      };
      smoothFocusRef.current = smoothedFocus;

      const targetHeading = Math.atan2(ahead.lng - focus.lng, ahead.lat - focus.lat);
      const currentHeading = smoothHeadingRef.current ?? targetHeading;
      const wrappedDelta = Cesium.Math.negativePiToPi(targetHeading - currentHeading);
      const nextHeading = currentHeading + wrappedDelta * damping;
      smoothHeadingRef.current = nextHeading;

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          smoothedFocus.lng,
          smoothedFocus.lat,
          (options?.altitude ?? 180) + (options?.speedFactor ?? 0) * 45,
        ),
        orientation: {
          heading: nextHeading,
          pitch: Cesium.Math.toRadians((options?.pitchDegrees ?? -24) - (options?.speedFactor ?? 0) * 3.5),
          roll: 0,
        },
      });
    },
    [],
  );

  return {
    updateChaseCamera,
    resetChaseCamera,
  };
}
