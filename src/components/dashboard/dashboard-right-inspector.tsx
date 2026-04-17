import { Info, PanelRightOpen } from "lucide-react";

type DashboardRightInspectorProps = {
  selected: boolean;
};

export function DashboardRightInspector({
  selected,
}: DashboardRightInspectorProps) {
  return (
    <aside className="pointer-events-none absolute top-[96px] right-5 bottom-24 z-20 hidden w-[300px] xl:block">
      <div className="pointer-events-auto flex h-full flex-col rounded-3xl border border-slate-700/70 bg-slate-950/72 p-3 shadow-2xl backdrop-blur-2xl">
        <div className="mb-3 flex items-center gap-2 border-b border-slate-700/70 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-100">
            <PanelRightOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase">
              Inspector
            </div>
            <div className="text-sm font-semibold text-slate-100">
              Feature Details
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/70 p-4 text-center">
          <div>
            <Info className="mx-auto mb-2 h-4 w-4 text-slate-500" />
            <p className="text-xs text-slate-400">
              {selected
                ? "Feature inspection support will appear here in a future update."
                : "Select a building, flood area, or route element to inspect."}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
