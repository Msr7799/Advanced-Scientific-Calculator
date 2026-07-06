"use client";

import { useMemo, useState } from "react";
import { useAppState, useAppDispatch } from "@/lib/state/appState";
import { useCalculatorDispatch } from "@/lib/state/calculatorState";

const functionCatalog = [
  // Calc
  { name: "∫dx",    token: "∫(",   category: "Calculus",      label: "الحسبين" },
  { name: "asin",   token: "asin(",category: "Trigonometry",  label: "المتجلة" },
  { name: "C",      token: "C(",   category: "Combinatorics", label: "الأساسيات" },
  // Trig
  { name: "sin",    token: "sin(", category: "Trigonometry",  label: "" },
  { name: "cos",    token: "cos(", category: "Trigonometry",  label: "" },
  { name: "tan",    token: "tan(", category: "Trigonometry",  label: "" },
  { name: "acos",   token: "acos(",category: "Trigonometry",  label: "" },
  { name: "atan",   token: "atan(",category: "Trigonometry",  label: "" },
  { name: "sinh",   token: "sinh(",category: "Hyperbolic",    label: "" },
  { name: "cosh",   token: "cosh(",category: "Hyperbolic",    label: "" },
  { name: "tanh",   token: "tanh(",category: "Hyperbolic",    label: "" },
  // Logs
  { name: "log",    token: "log(", category: "Logarithm",     label: "" },
  { name: "ln",     token: "ln(",  category: "Logarithm",     label: "" },
  { name: "exp",    token: "exp(", category: "Exponential",   label: "" },
  { name: "10^x",   token: "10^(", category: "Exponential",   label: "" },
  // Algebra
  { name: "sqrt",   token: "sqrt(",category: "Algebra",       label: "" },
  { name: "abs",    token: "abs(", category: "Algebra",       label: "" },
  { name: "round",  token: "round(",category: "Numeric",      label: "" },
  { name: "floor",  token: "floor(",category: "Numeric",      label: "" },
  { name: "ceil",   token: "ceil(",category: "Numeric",       label: "" },
  { name: "Σ",      token: "Σ(",   category: "Calculus",      label: "" },
  { name: "P",      token: "P(",   category: "Combinatorics", label: "" },
];

export default function FunctionCatalogPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const calcDispatch = useCalculatorDispatch();
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => functionCatalog.filter(
      (f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.category.toLowerCase().includes(search.toLowerCase())
    ),
    [search]
  );

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, typeof functionCatalog>>((acc, f) => {
      if (!acc[f.category]) acc[f.category] = [];
      acc[f.category].push(f);
      return acc;
    }, {});
  }, [filtered]);

  const insert = (token: string) => {
    calcDispatch({ type: "APPEND_TOKEN", payload: token });
  };

  return (
    <div className="space-y-2">
      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search functions…"
        className="w-full rounded-lg border border-slate-700/60 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500/60"
      />

      {/* Groups */}
      <div className="space-y-2">
        {Object.entries(grouped).map(([cat, fns]) => (
          <div key={cat}>
            <div className="text-[9px] uppercase tracking-[0.3em] text-slate-600 mb-1 px-1">{cat}</div>
            <div className="grid grid-cols-3 gap-1">
              {fns.map((fn) => (
                <button
                  key={fn.name}
                  type="button"
                  onClick={() => insert(fn.token)}
                  className="flex flex-col items-center py-2 px-1 rounded-lg bg-slate-800/60 border border-slate-700/40 hover:bg-slate-700/70 hover:border-sky-500/40 transition calc-btn"
                >
                  <span className="text-[12px] font-mono text-white font-semibold">{fn.name}</span>
                  {fn.label && <span className="text-[8px] text-slate-500 mt-0.5">{fn.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
