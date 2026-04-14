import { Info, PanelRightOpen } from "lucide-react";

type DashboardRightInspectorProps = {
  selected: boolean;
};

export function DashboardRightInspector({
  selected,
}: DashboardRightInspectorProps) {
  return (
    <aside className="pointer-events-none absolute top-20 right-2 bottom-24 z-20 hidden w-[300px] md:top-24 md:right-4 xl:block">
      <div className="pointer-events-auto flex h-full flex-col rounded-3xl border border-slate-200/75 bg-white/80 p-3 shadow-xl backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2 border-b border-slate-200/75 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
            <PanelRightOpen className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
              Inspector
            </div>
            <div className="text-sm font-semibold text-slate-900">
              Feature Details
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-center">
          <div>
            <Info className="mx-auto mb-2 h-4 w-4 text-slate-400" />
            <p className="text-xs text-slate-500">
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
