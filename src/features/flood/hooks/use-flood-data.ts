"use client";

import { useEffect, useState } from "react";
import { useFloodStore } from "@/src/features/flood/store/flood.store";
import type { FloodGeoJson } from "@/src/features/flood/types/flood.types";

export function useFloodData() {
  const { data, setData } = useFloodStore();
  const [loading, setLoading] = useState(false);
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

    if (!data) {
      void run();
    }

    return () => {
      active = false;
    };
  }, [data, setData]);

  return { data, loading, error };
}
