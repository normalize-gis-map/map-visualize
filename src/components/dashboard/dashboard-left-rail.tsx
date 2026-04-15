import type { ReactNode } from "react";

type DashboardLeftRailProps = {
  children: ReactNode;
};

export function DashboardLeftRail({ children }: DashboardLeftRailProps) {
  return (
    <aside className="pointer-events-none absolute top-[88px] left-3 z-40 md:top-[92px] md:left-4">
      <div className="pointer-events-auto">{children}</div>
    </aside>
  );
}
