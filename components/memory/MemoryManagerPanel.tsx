"use client";

import { useAppState, useAppDispatch } from "@/lib/state/appState";

export default function MemoryManagerPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  return (
    <div className="rounded-3xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-inner shadow-slate-950/30">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Memory Manager</div>
        <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs text-slate-200">M = {state.memoryValue}</span>
      </div>
      <div className="grid gap-3">
        <button
          type="button"
          className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
          onClick={() => dispatch({ type: "MEMORY_STORE" })}
        >
          MS
        </button>
        <button
          type="button"
          className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
          onClick={() => dispatch({ type: "MEMORY_CLEAR" })}
        >
          MC
        </button>
        <button
          type="button"
          className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
          onClick={() => dispatch({ type: "MEMORY_ADD" })}
        >
          M+
        </button>
        <button
          type="button"
          className="rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
          onClick={() => dispatch({ type: "MEMORY_SUBTRACT" })}
        >
          M-
        </button>
      </div>
      <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/90 p-3 text-sm text-slate-300">
        <div className="text-xs uppercase tracking-[0.28em] text-slate-500">History</div>
        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
          {state.memoryHistory.map((entry, index) => (
            <div key={`${entry}-${index}`} className="rounded-2xl bg-slate-900 px-3 py-2 text-xs text-slate-400">
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
