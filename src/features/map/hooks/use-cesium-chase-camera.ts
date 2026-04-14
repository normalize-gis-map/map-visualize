import * as Cesium from "cesium";
import { useCallback, useRef } from "react";

import { sampleRouteAtProgress } from "@/features/navigation/lib/route-sampling";

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
      const farAhead = sampleRouteAtProgress(
        coordinates,
        Math.min(1, progress + dynamicLookAhead * 1.9),
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
      const farHeading = farAhead
        ? Math.atan2(farAhead.lng - ahead.lng, farAhead.lat - ahead.lat)
        : targetHeading;
      const headingDelta = Cesium.Math.negativePiToPi(farHeading - targetHeading);
      const turnStrength = Math.min(1, Math.abs(headingDelta) / 0.85);
      const currentHeading = smoothHeadingRef.current ?? targetHeading;
      const wrappedDelta = Cesium.Math.negativePiToPi(targetHeading - currentHeading);
      const adaptiveDamping = damping + turnStrength * 0.09;
      const nextHeading = currentHeading + wrappedDelta * adaptiveDamping;
      smoothHeadingRef.current = nextHeading;

      const adaptiveAltitude =
        (options?.altitude ?? 180) +
        (options?.speedFactor ?? 0) * 45 -
        turnStrength * 55;
      const adaptivePitch =
        (options?.pitchDegrees ?? -24) -
        (options?.speedFactor ?? 0) * 3.5 +
        turnStrength * 8;

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          smoothedFocus.lng,
          smoothedFocus.lat,
          Math.max(85, adaptiveAltitude),
        ),
        orientation: {
          heading: nextHeading,
          pitch: Cesium.Math.toRadians(Math.min(-10, adaptivePitch)),
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
