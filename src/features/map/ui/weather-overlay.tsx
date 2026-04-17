"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import {
  createRainParticles,
  createSnowParticles,
  drawRain,
  drawSnow,
  getSafeDevicePixelRatio,
  updateRainParticles,
  updateSnowParticles,
} from "@/features/map/lib/weather/weather-canvas";
import type {
  RainParticle,
  SnowParticle,
  WeatherIntensity,
  WeatherMode,
} from "@/features/map/lib/weather/weather-types";

type WeatherOverlayProps = {
  weather: WeatherMode;
  intensity?: WeatherIntensity;
  className?: string;
};

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function WeatherOverlay({
  weather,
  intensity = "medium",
  className,
}: WeatherOverlayProps) {
  const mounted = useMounted();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rainRef = useRef<RainParticle[]>([]);
  const snowRef = useRef<SnowParticle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!mounted || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let lastTick = performance.now();
    let paused = document.visibilityState === "hidden";

    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    const rebuildParticles = () => {
      if (!width || !height) return;

      if (weather === "rain") {
        rainRef.current = createRainParticles(width, height, intensity, isMobile);
        snowRef.current = [];
      } else if (weather === "snow") {
        snowRef.current = createSnowParticles(width, height, intensity, isMobile);
        rainRef.current = [];
      } else {
        rainRef.current = [];
        snowRef.current = [];
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const dpr = getSafeDevicePixelRatio(isMobile);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      rebuildParticles();
    };

    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - lastTick) / 1000);
      lastTick = now;

      if (!paused && weather !== "sun") {
        context.clearRect(0, 0, width, height);
        if (weather === "rain") {
          updateRainParticles(rainRef.current, dt, width, height);
          drawRain(context, rainRef.current, width, height);
        } else if (weather === "snow") {
          updateSnowParticles(snowRef.current, dt, width, height);
          drawSnow(context, snowRef.current, width, height);
        }
      } else {
        context.clearRect(0, 0, width, height);
      }

      raf = window.requestAnimationFrame(animate);
    };

    const onVisibilityChange = () => {
      paused = document.visibilityState === "hidden";
    };

    resize();
    raf = window.requestAnimationFrame(animate);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.cancelAnimationFrame(raf);
      rainRef.current = [];
      snowRef.current = [];
    };
  }, [intensity, mounted, weather]);

  return (
    <div
      className={["pointer-events-none absolute inset-0 z-20", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
