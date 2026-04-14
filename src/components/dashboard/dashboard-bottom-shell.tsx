import type { ReactNode } from "react";

type DashboardBottomShellProps = {
  children: ReactNode;
};

export function DashboardBottomShell({ children }: DashboardBottomShellProps) {
  return (
    <div className="pointer-events-auto w-full rounded-3xl border border-slate-200/70 bg-white/32 p-2 shadow-xl backdrop-blur-md md:max-w-[980px]">
      <div className="mb-2 flex items-center justify-between rounded-2xl bg-white/70 px-3 py-1.5 text-[11px] text-slate-500">
        <span className="font-semibold tracking-[0.1em] uppercase">
          Summary Zone
        </span>
        <span>Ready for alerts • timeline • playback</span>
      </div>
      {children}
    </div>
  );
}
