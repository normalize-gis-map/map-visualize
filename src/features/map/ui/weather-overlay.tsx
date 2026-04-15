"use client";

import { useEffect, useRef } from "react";

import type { WeatherMode } from "@/features/map/lib/weather/weather-effects";

type WeatherOverlayProps = {
  weather: WeatherMode;
  hydrated: boolean;
};

type RainDrop = {
  x: number;
  y: number;
  speed: number;
  length: number;
  alpha: number;
  width: number;
};

type SnowFlake = {
  x: number;
  y: number;
  speed: number;
  drift: number;
  size: number;
  alpha: number;
};

function createRainLayer(count: number, baseSpeed: number, alphaRange: [number, number]): RainDrop[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    speed: baseSpeed + Math.random() * (baseSpeed * 0.9),
    length: 10 + Math.random() * 16,
    alpha: alphaRange[0] + Math.random() * (alphaRange[1] - alphaRange[0]),
    width: 0.8 + Math.random() * 0.9,
  }));
}

export function WeatherOverlay({ weather, hydrated }: WeatherOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let raf = 0;

    const rainNear = createRainLayer(170, 0.013, [0.26, 0.5]);
    const rainMid = createRainLayer(130, 0.009, [0.18, 0.35]);
    const rainFar = createRainLayer(90, 0.006, [0.12, 0.22]);

    const snowFlakes: SnowFlake[] = Array.from({ length: 150 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.0012 + Math.random() * 0.0033,
      drift: -0.001 + Math.random() * 0.002,
      size: 0.8 + Math.random() * 2.4,
      alpha: 0.28 + Math.random() * 0.44,
    }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * window.devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(height * window.devicePixelRatio));
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const drawRainLayer = (drops: RainDrop[], slant: number) => {
      for (const drop of drops) {
        const x = drop.x * width;
        const y = drop.y * height;

        context.strokeStyle = `rgba(196, 225, 245, ${drop.alpha})`;
        context.lineWidth = drop.width;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x - slant, y + drop.length);
        context.stroke();

        drop.y += drop.speed;
        drop.x -= drop.speed * 0.28;

        if (drop.y > 1.06 || drop.x < -0.08) {
          drop.y = -0.08;
          drop.x = Math.random() * 1.1;
        }
      }
    };

    const drawRain = () => {
      context.fillStyle = "rgba(18, 32, 46, 0.12)";
      context.fillRect(0, 0, width, height);

      context.lineCap = "round";
      drawRainLayer(rainFar, 2.9);
      drawRainLayer(rainMid, 3.8);
      drawRainLayer(rainNear, 4.9);
    };

    const drawSnow = () => {
      const haze = context.createLinearGradient(0, 0, 0, height);
      haze.addColorStop(0, "rgba(220, 232, 242, 0.14)");
      haze.addColorStop(1, "rgba(203, 213, 225, 0.08)");
      context.fillStyle = haze;
      context.fillRect(0, 0, width, height);

      for (const flake of snowFlakes) {
        const x = flake.x * width;
        const y = flake.y * height;

        context.fillStyle = `rgba(247, 250, 252, ${flake.alpha})`;
        context.beginPath();
        context.arc(x, y, flake.size, 0, Math.PI * 2);
        context.fill();

        flake.y += flake.speed;
        flake.x += flake.drift;

        if (flake.y > 1.08) {
          flake.y = -0.08;
          flake.x = Math.random();
        }
        if (flake.x < -0.1) flake.x = 1.1;
        if (flake.x > 1.1) flake.x = -0.1;
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      if (hydrated && weather === "rain") {
        drawRain();
      }

      if (hydrated && weather === "snow") {
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
  }, [hydrated, weather]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20"
      aria-hidden="true"
    />
  );
}
