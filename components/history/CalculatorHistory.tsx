"use client";

import { useCallback } from "react";
import { HistoryEntry } from "@/types/calculator";
import { useCalculatorDispatch } from "@/lib/state/calculatorState";

interface CalculatorHistoryProps {
  entries: HistoryEntry[];
}

export default function CalculatorHistory({ entries }: CalculatorHistoryProps) {
  const dispatch = useCalculatorDispatch();

  const handleRecall = useCallback(
    (expression: string) => {
      dispatch({ type: "SET_EXPRESSION", payload: expression });
    },
    [dispatch]
  );

  return (
    <div className="rounded-3xl border border-slate-700/80 bg-slate-900/80 p-4 text-slate-200 shadow-inner shadow-slate-950/30">
      {entries.length === 0 ? (
        <div className="text-sm text-slate-400">No history yet. Use the calculator to save results.</div>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-3xl border border-slate-700/70 bg-slate-950/80 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">{entry.expression}</p>
                  <p className="text-lg font-semibold text-white">{entry.result}</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-600/70 bg-slate-800 px-3 py-2 text-xs uppercase tracking-[0.25em] text-slate-200 transition hover:border-slate-400/50 hover:bg-slate-700/60"
                  onClick={() => handleRecall(entry.expression)}
                  aria-label={`Recall ${entry.expression}`}
                >
                  Recall
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
