"use client";

import { useMemo } from "react";

interface CalculatorDisplayProps {
  expression: string;
  result: string;
  mode: "light" | "dark";
}

function formatExpression(expression: string) {
  return expression.replace(/\*/g, "×").replace(/\//g, "÷");
}

export default function CalculatorDisplay({ expression, result, mode }: CalculatorDisplayProps) {
  const formatted = useMemo(() => formatExpression(expression), [expression]);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6">
      <div className="flex items-center justify-between gap-4 pb-4 text-slate-500">
        <span className="text-xs uppercase tracking-[0.36em] text-slate-400">HP Prime</span>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-slate-300">
          {mode} mode
        </span>
      </div>
      <div className="min-h-[6.5rem] rounded-3xl bg-slate-900/90 p-4 text-right text-white shadow-inner shadow-slate-950/30 sm:p-5">
        <div className="min-h-[2.5rem] text-sm text-slate-400/90 break-words font-medium">{formatted || "0"}</div>
        <div className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{result}</div>
      </div>
    </div>
  );
}
