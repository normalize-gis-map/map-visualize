import * as Cesium from "cesium";
import { useCallback, useRef } from "react";

import { sampleRouteAtProgress } from "@/features/map/navigation/route-sampling";

const LOOKAHEAD_PROGRESS = 0.015;

export function useCesiumChaseCamera() {
  const smoothHeadingRef = useRef<number | null>(null);

  const resetChaseCamera = useCallback(() => {
    smoothHeadingRef.current = null;
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
      },
    ) => {
      const focus = sampleRouteAtProgress(coordinates, progress);
      const ahead = sampleRouteAtProgress(
        coordinates,
        Math.min(1, progress + (options?.lookAheadProgress ?? LOOKAHEAD_PROGRESS)),
      );

      if (!focus || !ahead) return;

      const targetHeading = Math.atan2(ahead.lng - focus.lng, ahead.lat - focus.lat);
      const currentHeading = smoothHeadingRef.current ?? targetHeading;
      const damping = options?.damping ?? 0.18;
      const wrappedDelta = Cesium.Math.negativePiToPi(targetHeading - currentHeading);
      const nextHeading = currentHeading + wrappedDelta * damping;
      smoothHeadingRef.current = nextHeading;

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(
          focus.lng,
          focus.lat,
          options?.altitude ?? 180,
        ),
        orientation: {
          heading: nextHeading,
          pitch: Cesium.Math.toRadians(options?.pitchDegrees ?? -24),
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
