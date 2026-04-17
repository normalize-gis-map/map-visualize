export type WeatherMode = "sun" | "rain" | "snow";
export type TimeMode = "live" | "morning" | "noon" | "evening" | "night";
export type WeatherIntensity = "low" | "medium" | "high";

export type RainParticle = {
  x: number;
  y: number;
  length: number;
  width: number;
  speed: number;
  alpha: number;
  slant: number;
};

export type SnowParticle = {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  driftX: number;
  alpha: number;
};
