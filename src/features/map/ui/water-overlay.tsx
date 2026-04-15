"use client";

import type { FeatureCollection, Geometry, Position } from "geojson";
import type maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";

type WaterOverlayProps = {
  map: maplibregl.Map | null;
  waterData: FeatureCollection;
};

function forEachRing(geometry: Geometry, onRing: (ring: Position[]) => void) {
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach((ring) => onRing(ring));
    return;
  }

  if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => onRing(ring)));
  }
}

export function WaterOverlay({ map, waterData }: WaterOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !map) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let phase = 0;

    const resize = () => {
      const container = map.getContainer();
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * window.devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(height * window.devicePixelRatio));
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const drawClippedContinuousWater = () => {
      context.clearRect(0, 0, width, height);
      if (!waterData.features.length) return;

      context.save();
      context.beginPath();

      for (const feature of waterData.features.slice(0, 56)) {
        const geometry = feature.geometry;
        if (!geometry) continue;

        forEachRing(geometry, (ring) => {
          const step = ring.length > 240 ? 2 : 1;
          let started = false;

          for (let i = 0; i < ring.length; i += step) {
            const point = ring[i];
            if (!point) continue;
            const projected = map.project([point[0], point[1]]);
            if (!started) {
              context.moveTo(projected.x, projected.y);
              started = true;
            } else {
              context.lineTo(projected.x, projected.y);
            }
          }

          if (started) context.closePath();
        });
      }

      context.clip("evenodd");

      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(88, 149, 191, 0.2)");
      gradient.addColorStop(0.48, "rgba(72, 130, 173, 0.24)");
      gradient.addColorStop(1, "rgba(66, 118, 161, 0.22)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(220, 242, 255, 0.15)";
      context.lineWidth = 1.1;
      context.lineCap = "round";

      const waveGap = 20;
      const waveShift = (phase * 24) % waveGap;
      for (let y = -height; y < height * 2; y += waveGap) {
        context.beginPath();
        context.moveTo(-40, y + waveShift);
        context.lineTo(width + 40, y - width * 0.24 + waveShift);
        context.stroke();
      }

      context.strokeStyle = "rgba(245, 252, 255, 0.1)";
      context.lineWidth = 0.7;
      const rippleGap = 38;
      const rippleShift = (phase * 14) % rippleGap;
      for (let x = -width; x < width * 2; x += rippleGap) {
        context.beginPath();
        context.moveTo(x + rippleShift, -30);
        context.lineTo(x - height * 0.18 + rippleShift, height + 30);
        context.stroke();
      }

      context.restore();
    };

    const draw = () => {
      phase += 0.012;
      drawClippedContinuousWater();
      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(map.getContainer());

    const rerender = () => drawClippedContinuousWater();
    map.on("move", rerender);

    return () => {
      resizeObserver.disconnect();
      map.off("move", rerender);
      window.cancelAnimationFrame(raf);
    };
  }, [map, waterData]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[12]" aria-hidden="true" />;
}
