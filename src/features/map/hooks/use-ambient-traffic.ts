import { useEffect, useMemo, useState } from "react";

export type AmbientTrafficVehicle = {
  id: string;
  lng: number;
  lat: number;
  bearing: number;
  speed: number;
  direction: "forward" | "backward";
};

type UseAmbientTrafficInput = {
  center: [number, number];
  zoom: number;
  enabled: boolean;
};

const MIN_ZOOM_TO_RENDER = 13;

function wrapLng(lng: number) {
  if (lng > 180) return lng - 360;
  if (lng < -180) return lng + 360;
  return lng;
}

export function useAmbientTraffic({ center, zoom, enabled }: UseAmbientTrafficInput) {
  const [vehicles, setVehicles] = useState<AmbientTrafficVehicle[]>([]);

  const shouldRender = enabled && zoom >= MIN_ZOOM_TO_RENDER;

  const targetCount = useMemo(() => {
    if (!shouldRender) return 0;
    if (zoom >= 15.5) return 56;
    if (zoom >= 14.2) return 38;
    return 24;
  }, [shouldRender, zoom]);

  useEffect(() => {
    if (!shouldRender || targetCount === 0) {
      const frame = requestAnimationFrame(() => setVehicles([]));
      return () => cancelAnimationFrame(frame);
    }

    if (vehicles.length === targetCount) {
      return;
    }

    const spread = zoom >= 15 ? 0.012 : zoom >= 14 ? 0.018 : 0.024;
    const seeded = Array.from({ length: targetCount }, (_, index) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * spread;
      const lng = center[0] + Math.cos(angle) * radius;
      const lat = center[1] + Math.sin(angle) * radius * 0.72;
      const bearing = Math.random() * 360;
      return {
        id: `ambient-${index}`,
        lng,
        lat,
        bearing,
        speed: 7 + Math.random() * 14,
        direction: (index % 2 === 0 ? "forward" : "backward") as
          | "forward"
          | "backward",
      };
    });

    const frame = requestAnimationFrame(() => setVehicles(seeded));
    return () => cancelAnimationFrame(frame);
  }, [center, shouldRender, targetCount, vehicles.length, zoom]);

  useEffect(() => {
    if (!shouldRender || !vehicles.length) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      setVehicles((prev) =>
        prev.map((vehicle) => {
          const headingRad = (vehicle.bearing * Math.PI) / 180;
          const stepMeters = vehicle.speed * dt;
          const dLat = stepMeters / 111320;
          const dLng = stepMeters / (111320 * Math.max(0.2, Math.cos((vehicle.lat * Math.PI) / 180)));

          let nextLng = wrapLng(vehicle.lng + Math.sin(headingRad) * dLng);
          let nextLat = vehicle.lat + Math.cos(headingRad) * dLat;
          let nextBearing = vehicle.bearing;

          if (Math.abs(nextLng - center[0]) > 0.03 || Math.abs(nextLat - center[1]) > 0.02) {
            nextBearing = (vehicle.bearing + 140 + Math.random() * 70) % 360;
            nextLng = center[0] + (Math.random() - 0.5) * 0.035;
            nextLat = center[1] + (Math.random() - 0.5) * 0.024;
          }

          return {
            ...vehicle,
            lng: nextLng,
            lat: nextLat,
            bearing: nextBearing,
          };
        }),
      );

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [center, shouldRender, vehicles.length]);

  return { vehicles, minZoomToRender: MIN_ZOOM_TO_RENDER };
}
