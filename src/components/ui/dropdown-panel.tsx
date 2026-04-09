"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";

type DropdownPanelProps = {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  closeSignal?: number;
};

export function DropdownPanel({
  label,
  icon,
  children,
  className = "",
  closeSignal,
}: DropdownPanelProps) {
  const signal = closeSignal ?? 0;
  const [panelState, setPanelState] = useState({ open: false, signal });
  const open = useMemo(
    () => panelState.open && panelState.signal === signal,
    [panelState.open, panelState.signal, signal],
  );

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() =>
          setPanelState((prev) => ({
            open: !(prev.open && prev.signal === signal),
            signal,
          }))
        }
        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setPanelState({ open: false, signal })}
            aria-label={`Close ${label}`}
          />

          <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-[280px] rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
