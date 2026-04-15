"use client";

import type maplibregl from "maplibre-gl";
import { useEffect, useRef, useSyncExternalStore } from "react";

import {
  buildWaterMaskSnapshot,
  carveBridgeCorridors,
  clipToWaterMask,
  getMaskLayerIds,
  type WaterMaskSnapshot,
} from "@/features/map/lib/water/visible-water-mask";

type WaterOverlayProps = {
  map: maplibregl.Map | null;
  enabled?: boolean;
  className?: string;
};

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function WaterOverlay({ map, enabled = true, className }: WaterOverlayProps) {
  const mounted = useMounted();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotRef = useRef<WaterMaskSnapshot>({ waterFeatures: [], bridgeFeatures: [] });

  useEffect(() => {
    if (!mounted || !map || !enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let raf = 0;
    let phase = 0;
    let lastMaskUpdate = 0;

    const refreshMask = () => {
      const now = performance.now();
      if (now - lastMaskUpdate < 180) return;
      lastMaskUpdate = now;

      const style = map.getStyle();
      const { waterLayerIds, bridgeLayerIds } = getMaskLayerIds(style);
      snapshotRef.current = buildWaterMaskSnapshot(map, waterLayerIds, bridgeLayerIds);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      refreshMask();
    };

    const draw = () => {
      phase += 0.0105;
      context.clearRect(0, 0, width, height);

      const snapshot = snapshotRef.current;
      if (!snapshot.waterFeatures.length) {
        raf = window.requestAnimationFrame(draw);
        return;
      }

      context.save();
      clipToWaterMask(context, map, snapshot.waterFeatures);

      const baseGradient = context.createLinearGradient(0, 0, width, height);
      baseGradient.addColorStop(0, "rgba(78, 130, 170, 0.16)");
      baseGradient.addColorStop(0.5, "rgba(68, 118, 157, 0.2)");
      baseGradient.addColorStop(1, "rgba(72, 126, 166, 0.16)");
      context.fillStyle = baseGradient;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(232, 246, 255, 0.14)";
      context.lineWidth = 1;
      context.lineCap = "round";
      const shimmerGap = 18;
      const shimmerShift = (phase * 52) % shimmerGap;
      for (let y = -height; y < height * 2; y += shimmerGap) {
        context.beginPath();
        context.moveTo(-80, y + shimmerShift);
        context.lineTo(width + 80, y - width * 0.25 + shimmerShift);
        context.stroke();
      }

      context.strokeStyle = "rgba(255, 255, 255, 0.08)";
      context.lineWidth = 0.7;
      const rippleGap = 34;
      const rippleShift = (phase * 21) % rippleGap;
      for (let x = -width; x < width * 2; x += rippleGap) {
        context.beginPath();
        context.moveTo(x + rippleShift, -40);
        context.lineTo(x - height * 0.17 + rippleShift, height + 40);
        context.stroke();
      }

      context.restore();
      carveBridgeCorridors(context, map, snapshot.bridgeFeatures, map.getZoom());

      raf = window.requestAnimationFrame(draw);
    };

    const onMove = () => refreshMask();

    resize();
    refreshMask();
    raf = window.requestAnimationFrame(draw);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    map.on("moveend", onMove);
    map.on("zoomend", onMove);
    map.on("style.load", onMove);

    return () => {
      observer.disconnect();
      map.off("moveend", onMove);
      map.off("zoomend", onMove);
      map.off("style.load", onMove);
      window.cancelAnimationFrame(raf);
      snapshotRef.current = { waterFeatures: [], bridgeFeatures: [] };
    };
  }, [enabled, map, mounted]);

  return (
    <div
      className={["pointer-events-none absolute inset-0 z-[11]", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
