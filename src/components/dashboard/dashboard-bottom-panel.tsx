import type { ReactNode } from "react";

type DashboardBottomPanelProps = {
  children: ReactNode;
};

export function DashboardBottomPanel({ children }: DashboardBottomPanelProps) {
  return (
    <section className="pointer-events-none absolute inset-x-2 bottom-2 z-30 md:inset-x-4 md:bottom-4">
      <div className="pointer-events-auto flex justify-end">{children}</div>
    </section>
  );
}
