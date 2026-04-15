"use client";

import type { SceneToneMapping } from "@/features/map/lib/scene/scene-tonemapping";

type ScenePostOverlayProps = {
  tone: SceneToneMapping;
};

export function ScenePostOverlay({ tone }: ScenePostOverlayProps) {
  const opacity = Math.max(0.04, Math.min(0.22, tone.bloomStrength * 0.7));
  const contrastScale = Math.max(0.92, Math.min(1.14, tone.contrast));
  const saturationScale = Math.max(0.82, Math.min(1.16, tone.saturation));

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            "radial-gradient(ellipse at 50% 22%, rgba(255, 250, 232, 0.22), rgba(255, 255, 255, 0.02) 44%, rgba(0, 0, 0, 0.0) 75%)",
          mixBlendMode: "screen",
          opacity,
          transition: "opacity 420ms ease",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          backdropFilter: `contrast(${contrastScale.toFixed(3)}) saturate(${saturationScale.toFixed(3)})`,
          transition: "backdrop-filter 420ms ease",
        }}
      />
    </>
  );
}
