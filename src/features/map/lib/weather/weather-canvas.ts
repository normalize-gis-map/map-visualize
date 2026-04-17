import type { RainParticle, SnowParticle, WeatherIntensity } from "@/features/map/lib/weather/weather-types";

const INTENSITY_FACTOR: Record<WeatherIntensity, number> = {
  low: 0.6,
  medium: 1,
  high: 1.45,
};

const DPR_CAP_MOBILE = 1.5;
const DPR_CAP_DESKTOP = 2;

export function getSafeDevicePixelRatio(isMobile: boolean): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, isMobile ? DPR_CAP_MOBILE : DPR_CAP_DESKTOP);
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function createRainParticles(
  width: number,
  height: number,
  intensity: WeatherIntensity,
  isMobile: boolean,
): RainParticle[] {
  const density = INTENSITY_FACTOR[intensity] * (isMobile ? 0.62 : 1);
  const count = Math.max(60, Math.floor((width * height) / 7500) * density);

  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    length: randomBetween(8, 20),
    width: randomBetween(0.7, 1.4),
    speed: randomBetween(420, 740) * (intensity === "high" ? 1.06 : 1),
    alpha: randomBetween(0.14, 0.4),
    slant: randomBetween(28, 42),
  }));
}

export function createSnowParticles(
  width: number,
  height: number,
  intensity: WeatherIntensity,
  isMobile: boolean,
): SnowParticle[] {
  const density = INTENSITY_FACTOR[intensity] * (isMobile ? 0.65 : 1);
  const count = Math.max(40, Math.floor((width * height) / 13000) * density);

  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: randomBetween(0.8, 2.4),
    speedY: randomBetween(18, 56),
    driftX: randomBetween(-16, 16),
    alpha: randomBetween(0.25, 0.72),
  }));
}

export function updateRainParticles(
  particles: RainParticle[],
  dt: number,
  width: number,
  height: number,
): void {
  for (const particle of particles) {
    particle.y += particle.speed * dt;
    particle.x -= particle.slant * dt;

    if (particle.y > height + particle.length || particle.x < -particle.length) {
      particle.x = Math.random() * (width + 20);
      particle.y = -particle.length;
    }
  }
}

export function updateSnowParticles(
  particles: SnowParticle[],
  dt: number,
  width: number,
  height: number,
): void {
  for (const particle of particles) {
    particle.y += particle.speedY * dt;
    particle.x += particle.driftX * dt;

    if (particle.y > height + particle.radius) {
      particle.y = -particle.radius;
      particle.x = Math.random() * width;
    }
    if (particle.x > width + particle.radius) particle.x = -particle.radius;
    if (particle.x < -particle.radius) particle.x = width + particle.radius;
  }
}

export function drawRain(
  context: CanvasRenderingContext2D,
  particles: RainParticle[],
  width: number,
  height: number,
): void {
  context.fillStyle = "rgba(16, 32, 46, 0.1)";
  context.fillRect(0, 0, width, height);

  context.lineCap = "round";
  for (const particle of particles) {
    context.strokeStyle = `rgba(188, 218, 238, ${particle.alpha})`;
    context.lineWidth = particle.width;
    context.beginPath();
    context.moveTo(particle.x, particle.y);
    context.lineTo(particle.x - particle.slant * 0.28, particle.y + particle.length);
    context.stroke();
  }
}

export function drawSnow(
  context: CanvasRenderingContext2D,
  particles: SnowParticle[],
  width: number,
  height: number,
): void {
  const haze = context.createLinearGradient(0, 0, 0, height);
  haze.addColorStop(0, "rgba(217, 230, 240, 0.13)");
  haze.addColorStop(1, "rgba(203, 213, 225, 0.08)");
  context.fillStyle = haze;
  context.fillRect(0, 0, width, height);

  for (const particle of particles) {
    context.fillStyle = `rgba(246, 249, 252, ${particle.alpha})`;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    context.fill();
  }
}
