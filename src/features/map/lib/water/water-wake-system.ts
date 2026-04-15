import type { FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";

import type { BoatSample, WakeState } from "@/features/map/lib/water/water-types";

const WAKE_LIFETIME_SECONDS = 2.8;
const WAKE_MIN_SPEED = 0.08;

function toMercator(lng: number, lat: number): [number, number] {
  const merc = maplibregl.MercatorCoordinate.fromLngLat({ lng, lat });
  return [merc.x, merc.y];
}



export function extractBoatSamples(collection: FeatureCollection): BoatSample[] {
  const samples: BoatSample[] = [];

  for (let i = 0; i < collection.features.length; i += 1) {
    const feature = collection.features[i];
    if (!feature || feature.geometry.type !== "Polygon") continue;

    const properties = (feature.properties ?? {}) as Record<string, unknown>;
    if (properties.part !== "hull") continue;

    const lng = Number(properties.centerLng);
    const lat = Number(properties.centerLat);
    const dx = Number(properties.dirX);
    const dy = Number(properties.dirY);
    const speed = Number(properties.speed ?? 0.12);

    if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(dx) || !Number.isFinite(dy)) {
      continue;
    }

    const len = Math.hypot(dx, dy);
    if (len < 1e-8) continue;

    samples.push({
      lng,
      lat,
      direction: [dx / len, dy / len],
      speed: Number.isFinite(speed) ? Math.max(0, speed) : 0.12,
    });
  }

  return samples;
}
export class WaterWakeSystem {
  private readonly maxWakes: number;

  private readonly wakes: WakeState[];

  private cursor = 0;

  private activeCount = 0;

  constructor(maxWakes: number) {
    this.maxWakes = Math.max(1, maxWakes);
    this.wakes = Array.from({ length: this.maxWakes }, () => ({
      x: 0,
      y: 0,
      dirX: 1,
      dirY: 0,
      age: WAKE_LIFETIME_SECONDS,
      strength: 0,
      alive: false,
    }));
  }

  ingestBoats(boats: BoatSample[]) {
    for (let i = 0; i < boats.length; i += 1) {
      const boat = boats[i];
      if (!boat || boat.speed < WAKE_MIN_SPEED) continue;

      const [x, y] = toMercator(boat.lng, boat.lat);
      const [fx, fy] = toMercator(
        boat.lng + boat.direction[0] * 0.00018,
        boat.lat + boat.direction[1] * 0.00018,
      );
      const dx = fx - x;
      const dy = fy - y;
      const len = Math.hypot(dx, dy);
      if (len < 1e-10) continue;

      const wake = this.wakes[this.cursor]!;
      wake.x = x;
      wake.y = y;
      wake.dirX = dx / len;
      wake.dirY = dy / len;
      wake.age = 0;
      wake.strength = Math.min(1, 0.35 + boat.speed * 1.8);
      wake.alive = true;

      this.cursor = (this.cursor + 1) % this.maxWakes;
      this.activeCount = Math.min(this.maxWakes, this.activeCount + 1);
    }
  }

  step(dtSeconds: number) {
    if (this.activeCount === 0) return;

    const dt = Math.min(0.16, Math.max(0, dtSeconds));
    for (let i = 0; i < this.activeCount; i += 1) {
      const wake = this.wakes[i]!;
      if (!wake.alive) continue;
      wake.age += dt;
      if (wake.age >= WAKE_LIFETIME_SECONDS) {
        wake.alive = false;
      }
    }
  }

  fillUniforms(target: Float32Array): number {
    let writeIndex = 0;

    for (let i = 0; i < this.maxWakes; i += 1) {
      const wake = this.wakes[i]!;
      const base = i * 4;
      if (!wake.alive) {
        target[base] = 0;
        target[base + 1] = 0;
        target[base + 2] = 0;
        target[base + 3] = 0;
        continue;
      }

      const fade = Math.max(0, 1 - wake.age / WAKE_LIFETIME_SECONDS);
      const strength = wake.strength * fade;
      target[base] = wake.x;
      target[base + 1] = wake.y;
      target[base + 2] = wake.dirX * strength;
      target[base + 3] = wake.dirY * strength;
      writeIndex += 1;
    }

    return writeIndex;
  }
}
