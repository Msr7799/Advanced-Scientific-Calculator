"use client";

import { useMemo, useState } from "react";
import { useAppState, useAppDispatch } from "@/lib/state/appState";
import { useCalculatorDispatch } from "@/lib/state/calculatorState";

const constantCatalog = [
  { name: "Pi",           symbol: "π",  value: "3.14159265358979", category: "Mathematical", description: "نسبة المحيط للقطر" },
  { name: "Euler's e",    symbol: "e",  value: "2.71828182845904", category: "Mathematical", description: "قاعدة اللوغاريتم الطبيعي" },
  { name: "Speed of Light",symbol: "c", value: "299792458",        category: "Physical",     description: "سرعة الضوء (م/ث)" },
  { name: "Planck",       symbol: "h",  value: "6.62607015e-34",   category: "Physical",     description: "ثابت بلانك" },
  { name: "Gravity",      symbol: "g",  value: "9.80665",          category: "Physical",     description: "تسارع الجاذبية" },
  { name: "Boltzmann",    symbol: "k",  value: "1.380649e-23",     category: "Physical",     description: "ثابت بولتزمان" },
  { name: "Avogadro",     symbol: "Nₐ", value: "6.02214076e23",    category: "Physical",     description: "عدد أفوجادرو" },
  { name: "Golden Ratio", symbol: "φ",  value: "1.61803398874989", category: "Mathematical", description: "النسبة الذهبية" },
];

export default function ConstantsLibraryPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const calcDispatch = useCalculatorDispatch();
  const [activeTab, setActiveTab] = useState<"All" | "Mathematical" | "Physical" | "User">("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const all = [...constantCatalog, ...state.userConstants];
    const q = search.toLowerCase();
    return all.filter(
      (c) =>
        (activeTab === "All" || c.category === activeTab) &&
        (c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
    );
  }, [activeTab, search, state.userConstants]);

  const insert = (symbol: string) => {
    calcDispatch({ type: "APPEND_TOKEN", payload: symbol });
  };

  return (
    <div className="space-y-2">
      {/* Tab bar */}
      <div className="flex rounded-lg overflow-hidden border border-slate-700/50">
        {(["All", "Mathematical", "Physical", "User"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 text-[9px] font-semibold tracking-wide transition
              ${activeTab === tab
                ? "bg-slate-700 text-white"
                : "bg-slate-900/60 text-slate-500 hover:text-slate-300"}`}
          >
            {tab === "Mathematical" ? "Math" : tab === "Physical" ? "Phys" : tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search constants…"
        className="w-full rounded-lg border border-slate-700/60 bg-slate-900/80 px-3 py-1.5 text-[11px] text-slate-100 placeholder-slate-600 outline-none focus:border-sky-500/60"
      />

      {/* Constants list */}
      <div className="space-y-1">
        {filtered.map((c) => (
          <div
            key={c.symbol + c.name}
            className="flex items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-800/50 px-2 py-1.5"
          >
            <div className="w-7 h-7 rounded-md bg-slate-700/60 flex items-center justify-center text-[13px] font-mono text-white shrink-0">
              {c.symbol}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold text-white leading-tight truncate">{c.name}</div>
              <div className="text-[9px] text-slate-500 font-mono truncate">{c.value}</div>
            </div>
            <button
              type="button"
              onClick={() => insert(c.symbol)}
              className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 hover:bg-sky-600 hover:text-white transition"
            >
              ↵
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-[11px] text-slate-600 py-4">No constants found</div>
        )}
      </div>
    </div>
  );
}
