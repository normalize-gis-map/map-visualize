import type { ReactNode } from "react";

type DashboardLeftRailProps = {
  children: ReactNode;
};

export function DashboardLeftRail({ children }: DashboardLeftRailProps) {
  return (
    <aside className="pointer-events-none absolute top-20 left-2 z-30 md:top-24 md:left-4">
      <div className="pointer-events-auto">{children}</div>
    </aside>
  );
}
