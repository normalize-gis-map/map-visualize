import type { ReactNode } from "react";

type DashboardOverlayProps = {
  children: ReactNode;
};

export function DashboardOverlay({ children }: DashboardOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="relative flex h-full w-full flex-col">{children}</div>
    </div>
  );
}
