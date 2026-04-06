"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useState } from "react";

type TimeSliderProps = {
  value: number;
  onChange: React.Dispatch<React.SetStateAction<number>>;
};

export function TimeSlider({ value, onChange }: TimeSliderProps) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(() => {
      onChange((prev) => {
        const next = prev + 0.02;
        return next > 1 ? 0 : next;
      });
    }, 60);

    return () => window.clearInterval(interval);
  }, [playing, onChange]);

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xl backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800"
          aria-label={playing ? "Pause animation" : "Play animation"}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-[180px] md:w-[260px]"
        />

        <div className="w-[56px] text-right text-xs font-semibold text-slate-600">
          {Math.round(value * 100)}%
        </div>
      </div>

      <div className="mt-2 text-center text-[11px] text-slate-500">
        Flood progression
      </div>
    </div>
  );
}
