// src/features/map/utils/normalize-properties.ts

export type NormalizedProperties = {
  areaName: string;
  district: string;
  depth: number;
  severity: string;
  riskScore: number;
  render_height: number;
  render_min_height: number;
  status: string;
  level: string;
  label: string;
};

export function normalizeProperties(
  raw: Record<string, unknown> | null | undefined,
): NormalizedProperties {
  return {
    areaName:
      typeof raw?.areaName === "string" && raw.areaName.trim()
        ? raw.areaName
        : "Unknown area",

    district:
      typeof raw?.district === "string" && raw.district.trim()
        ? raw.district
        : "-",

    depth:
      typeof raw?.depth === "number" ? raw.depth : Number(raw?.depth ?? 0) || 0,

    severity:
      typeof raw?.severity === "string" && raw.severity.trim()
        ? raw.severity
        : "unknown",

    riskScore:
      typeof raw?.riskScore === "number"
        ? raw.riskScore
        : Number(raw?.riskScore ?? 0) || 0,

    render_height:
      typeof raw?.render_height === "number"
        ? raw.render_height
        : Number(raw?.render_height ?? 0) || 0,

    render_min_height:
      typeof raw?.render_min_height === "number"
        ? raw.render_min_height
        : Number(raw?.render_min_height ?? 0) || 0,

    status:
      typeof raw?.status === "string" && raw.status.trim()
        ? raw.status
        : "unknown",

    level:
      typeof raw?.level === "string" && raw.level.trim()
        ? raw.level
        : "unknown",

    label:
      typeof raw?.label === "string" && raw.label.trim()
        ? raw.label
        : "Unknown",
  };
}
