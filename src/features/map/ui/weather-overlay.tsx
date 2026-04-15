"use client";

import { useEffect, useRef } from "react";

import type { WeatherMode } from "@/features/map/lib/weather/weather-effects";

type WeatherOverlayProps = {
  weather: WeatherMode;
};

export function WeatherOverlay({ weather }: WeatherOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let raf = 0;
    let width = 0;
    let height = 0;

    const raindrops = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.008 + Math.random() * 0.015,
      length: 8 + Math.random() * 10,
    }));

    const snowflakes = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.002 + Math.random() * 0.004,
      drift: -0.001 + Math.random() * 0.002,
      size: 1 + Math.random() * 2,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio));
      canvas.height = Math.max(
        1,
        Math.floor(rect.height * window.devicePixelRatio),
      );
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      if (weather === "rain") {
        context.strokeStyle = "rgba(191, 219, 254, 0.35)";
        context.lineWidth = 1.2;
        raindrops.forEach((drop) => {
          const x = drop.x * width;
          const y = drop.y * height;
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x - 4, y + drop.length);
          context.stroke();

          drop.y += drop.speed;
          if (drop.y > 1.05) {
            drop.y = -0.05;
            drop.x = Math.random();
          }
        });
      }

      if (weather === "snow") {
        context.fillStyle = "rgba(241, 245, 249, 0.75)";
        snowflakes.forEach((flake) => {
          const x = flake.x * width;
          const y = flake.y * height;
          context.beginPath();
          context.arc(x, y, flake.size, 0, Math.PI * 2);
          context.fill();

          flake.y += flake.speed;
          flake.x += flake.drift;
          if (flake.y > 1.05) {
            flake.y = -0.05;
            flake.x = Math.random();
          }
          if (flake.x < -0.1) flake.x = 1.1;
          if (flake.x > 1.1) flake.x = -0.1;
        });
      }

      raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [weather]);

  if (weather === "sun") return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20"
      aria-hidden="true"
    />
  );
}
