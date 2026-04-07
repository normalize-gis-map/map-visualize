// src/features/map/utils/formatters.ts

export function formatMeters(value: number) {
  return `${value.toFixed(1)}m`;
}

export function formatScore(value: number) {
  return Number.isFinite(value) ? value.toString() : "0";
}

export function formatSeverityTone(severity: string) {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "info";
}

export function formatStatusTone(status: string) {
  if (status === "active") return "info";
  return "warning";
}

export function formatLevelTone(level: string) {
  if (level === "high") return "danger";
  if (level === "medium") return "warning";
  return "info";
}
