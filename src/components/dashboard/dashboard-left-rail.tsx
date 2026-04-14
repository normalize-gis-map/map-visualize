import type { ReactNode } from "react";

type DashboardLeftRailProps = {
  children: ReactNode;
};

export function DashboardLeftRail({ children }: DashboardLeftRailProps) {
  return (
    <aside className="pointer-events-none absolute top-[84px] left-3 z-30 md:top-[96px] md:left-5">
      <div className="pointer-events-auto">{children}</div>
    </aside>
  );
}
