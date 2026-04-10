import { Gauge, Pause, Play, RotateCcw } from "lucide-react";

type Props = {
  progress: number;
  isPlaying: boolean;
  speedMultiplier: 0.5 | 1 | 2;
  availableSpeedMultipliers: readonly (0.5 | 1 | 2)[];
  onSeek: (value: number) => void;
  onTogglePlayback: () => void;
  onReset: () => void;
  onSetSpeed: (value: 0.5 | 1 | 2) => void;
  className?: string;
};

export function ControlBoard({
  progress,
  isPlaying,
  speedMultiplier,
  availableSpeedMultipliers,
  onSeek,
  onTogglePlayback,
  onReset,
  onSetSpeed,
  className,
}: Props) {
  return (
    <div className={className ?? "rounded-2xl border border-white/20 bg-slate-900/80 p-3 text-white backdrop-blur"}>
      <div className="mb-2 flex items-center justify-between text-xs">
        <span>{Math.round(progress * 100)}%</span>
        <div className="flex items-center gap-1">
          <Gauge className="h-3.5 w-3.5 text-cyan-200" />
          {availableSpeedMultipliers.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSetSpeed(item)}
              className={`rounded-md px-2 py-1 ${
                speedMultiplier === item ? "bg-cyan-300 text-slate-900" : "bg-white/15"
              }`}
            >
              {item}x
            </button>
          ))}
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={progress}
        onChange={(event) => onSeek(Number(event.target.value))}
        className="w-full accent-cyan-300"
      />

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onTogglePlayback}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-900"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center rounded-lg border border-white/30 px-3 py-2 text-sm"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
