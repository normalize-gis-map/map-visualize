"use client";

import { useEffect, useRef } from "react";

import type { WeatherMode } from "@/features/map/lib/weather/weather-effects";

type WeatherOverlayProps = {
  weather: WeatherMode;
};

type RainDrop = {
  x: number;
  y: number;
  speed: number;
  length: number;
  tilt: number;
};

type SnowFlake = {
  x: number;
  y: number;
  speed: number;
  drift: number;
  size: number;
  alpha: number;
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

    const raindrops: RainDrop[] = Array.from({ length: 160 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.012 + Math.random() * 0.018,
      length: 8 + Math.random() * 12,
      tilt: 3 + Math.random() * 3.6,
    }));

    const snowflakes: SnowFlake[] = Array.from({ length: 130 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.0018 + Math.random() * 0.004,
      drift: -0.0009 + Math.random() * 0.0018,
      size: 0.9 + Math.random() * 2.2,
      alpha: 0.35 + Math.random() * 0.45,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio));
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const drawRain = () => {
      context.fillStyle = "rgba(42, 58, 76, 0.12)";
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(191, 219, 254, 0.45)";
      context.lineCap = "round";
      context.lineWidth = 1.1;

      raindrops.forEach((drop) => {
        const x = drop.x * width;
        const y = drop.y * height;

        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - drop.tilt, y + drop.length);
        context.stroke();

        drop.y += drop.speed;
        drop.x -= drop.speed * 0.24;

        if (drop.y > 1.08 || drop.x < -0.08) {
          drop.y = -0.06;
          drop.x = Math.random() * 1.05;
        }
      });
    };

    const drawSnow = () => {
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(214, 228, 238, 0.18)");
      gradient.addColorStop(1, "rgba(203, 213, 225, 0.08)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      snowflakes.forEach((flake) => {
        const x = flake.x * width;
        const y = flake.y * height;

        context.fillStyle = `rgba(248, 250, 252, ${flake.alpha})`;
        context.beginPath();
        context.arc(x, y, flake.size, 0, Math.PI * 2);
        context.fill();

        flake.y += flake.speed;
        flake.x += flake.drift;

        if (flake.y > 1.06) {
          flake.y = -0.06;
          flake.x = Math.random();
        }
        if (flake.x < -0.12) flake.x = 1.12;
        if (flake.x > 1.12) flake.x = -0.12;
      });
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      if (weather === "rain") {
        drawRain();
      }

      if (weather === "snow") {
        drawSnow();
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
