import type { ReactNode } from "react";

type DashboardLeftRailProps = {
  children: ReactNode;
};

export function DashboardLeftRail({ children }: DashboardLeftRailProps) {
  return (
    <aside className="pointer-events-none absolute top-[82px] left-1 z-40 md:top-[86px] md:left-1.5">
      <div className="pointer-events-auto">{children}</div>
    </aside>
  );
}
