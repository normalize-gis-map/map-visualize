export type BoatDensityPlan = {
  maxBoats: number;
  ringCandidateScale: number;
};

export function getBoatDensityPlan(zoom: number, totalVisibleWaterArea: number, densityMultiplier = 1): BoatDensityPlan {
  if (zoom < 12) {
    return { maxBoats: Math.round((totalVisibleWaterArea > 0.00045 ? 1 : 0) * densityMultiplier), ringCandidateScale: 0 };
  }

  if (zoom < 14) {
    const areaBoost = Math.min(3, Math.floor(totalVisibleWaterArea / 0.00042));
    return {
      maxBoats: Math.round((2 + areaBoost) * densityMultiplier),
      ringCandidateScale: 0.34,
    };
  }

  if (zoom < 16) {
    const areaBoost = Math.min(5, Math.floor(totalVisibleWaterArea / 0.00028));
    return {
      maxBoats: Math.round((4 + areaBoost) * densityMultiplier),
      ringCandidateScale: 0.5,
    };
  }

  const areaBoost = Math.min(9, Math.floor(totalVisibleWaterArea / 0.0002));
  return {
    maxBoats: Math.round((7 + areaBoost) * densityMultiplier),
    ringCandidateScale: 0.7,
  };
}

export function getRingBoatAllowance(ringArea: number, zoom: number): number {
  if (ringArea < 0.0000006) return 0;

  const base = zoom >= 16 ? 1.8 : zoom >= 14 ? 1.15 : 0.7;
  const areaFactor = ringArea / (zoom >= 16 ? 0.000035 : 0.00005);
  return Math.max(1, Math.floor(base + Math.min(5, areaFactor)));
}
