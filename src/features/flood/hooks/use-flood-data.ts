"use client";

import { useEffect, useState } from "react";
import type { FloodGeoJson } from "@/features/flood/types/flood.types";

export function useFloodData() {
  const [data, setData] = useState<FloodGeoJson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/flood");
        if (!response.ok) {
          throw new Error("Failed to fetch flood data");
        }

        const json: FloodGeoJson = await response.json();

        if (active) {
          setData(json);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
