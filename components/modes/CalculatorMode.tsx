"use client";

import ExpressionEditor from "@/components/editor/ExpressionEditor";
import { useAppState } from "@/lib/state/appState";

export default function CalculatorMode() {
  const state = useAppState();

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-slate-700/80 bg-slate-950/90 p-5 shadow-inner shadow-slate-950/30">
        <h2 className="text-sm uppercase tracking-[0.32em] text-slate-400">Calculator Mode</h2>
        <ExpressionEditor />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-inner shadow-slate-950/30">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Result</div>
          <div className="mt-3 text-4xl font-semibold text-white">{state.result}</div>
        </div>
        <div className="rounded-3xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-inner shadow-slate-950/30">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Quick Actions</div>
          <div className="mt-4 grid gap-3">
            <button className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700">Calculate</button>
            <button className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700">Clear</button>
            <button className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700">Undo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
