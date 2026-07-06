"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppProvider } from "@/lib/state/appState";
import CalculatorShell from "@/components/calculator/CalculatorShell";
import FunctionCatalogPanel from "@/components/catalog/FunctionCatalogPanel";
import ConstantsLibraryPanel from "@/components/constants/ConstantsLibraryPanel";

import { CalculatorProvider, useCalculatorState, useCalculatorDispatch } from "@/lib/state/calculatorState";

// ─── App mode definitions ────────────────────────────────────────────────────
type AppModeId =
  | "calculator" | "graph" | "matrix" | "vector"
  | "complex" | "table" | "tabline" | "graph2" | "vector2" | "complex2" | "other" | "custom";

const APPS: { id: AppModeId; label: string; icon: string; arabic?: string; labelAr?: string }[] = [
  { id: "calculator", label: "Calculator", icon: "⊞" },
  { id: "graph",      label: "Graph",      icon: "∿" },
  { id: "matrix",     label: "Matrix",     icon: "⊡" },
  { id: "vector",     label: "Vector",     icon: "⊿" },
  { id: "complex2",   label: "الأياري",    icon: "∿",  labelAr: "الأياري" },
  { id: "graph2",     label: "Graph",      icon: "∿" },
  { id: "vector2",    label: "Vector",     icon: "⊿" },
  { id: "complex",    label: "Complex",    icon: "ℂ" },
  { id: "custom",     label: "عيصى",       icon: "⚙",  labelAr: "عيصى" },
  { id: "table",      label: "Table",      icon: "⊞" },
  { id: "tabline",    label: "Tabline",    icon: "⊟" },
  { id: "other",      label: "الجبر",      icon: "⊕",  labelAr: "الجبر" },
];

// ─── Right panel tab type ────────────────────────────────────────────────────
type RightTab = "CATALOG" | "CONSTANTS" | "DEG";

// ─── Sidebar apps grid ───────────────────────────────────────────────────────
function AppsGrid() {
  const [currentMode, setCurrentMode] = useState<AppModeId>("calculator");

  return (
    <aside className="flex flex-col h-full bg-[#0d1017] border-r border-slate-800/60" style={{ width: 120 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/60">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Apps</span>
        <button className="text-slate-500 hover:text-slate-300 transition text-xs">≡</button>
      </div>

      {/* Grid 2-col */}
      <div className="flex-1 overflow-y-auto panel-scroll p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {APPS.map((app) => {
            const active = currentMode === app.id;
            return (
              <button
                key={app.id + app.label}
                type="button"
                onClick={() => setCurrentMode(app.id)}
                className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-all calc-btn
                  ${active
                    ? "bg-sky-500/20 border border-sky-500/50 text-sky-300"
                    : "bg-slate-900/60 border border-slate-700/40 text-slate-300 hover:bg-slate-800/70 hover:text-white"
                  }`}
              >
                <span className="text-lg leading-none">{app.icon}</span>
                <span className="text-[9px] font-medium leading-tight text-center">{app.labelAr ?? app.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ─── Right panel with tabs ───────────────────────────────────────────────────
function RightPanel() {
  const [activeTab, setActiveTab] = useState<RightTab>("CATALOG");
  const calcState = useCalculatorState();
  const calcDispatch = useCalculatorDispatch();

  const angleMode = calcState.angleMode || "DEG";

  return (
    <aside
      className="flex flex-col h-full bg-[#0b0e15] border-l border-slate-800/60"
      style={{ width: 310 }}
    >
      {/* Top status bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800/60 bg-[#0d1017] text-[10px] text-slate-400 shrink-0">
        <span className="font-mono font-semibold text-slate-200">{angleMode}</span>
        <span className="flex-1 text-center text-[9px] tracking-widest text-slate-500">Natural Display D</span>
        {/* battery */}
        <span className="text-slate-400">🔋 98%</span>
        <span className="bg-slate-700 text-slate-200 px-1 rounded text-[9px] font-bold">SHIFT</span>
        <span className="bg-slate-700 text-slate-200 px-1 rounded text-[9px] font-bold">S</span>
        <span className="bg-slate-700 text-slate-200 px-1 rounded text-[9px] font-bold">A</span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-slate-800/60 shrink-0">
        {(["CATALOG", "CONSTANTS", "DEG"] as RightTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              if (tab === "DEG") {
                const nextMode = angleMode === "DEG" ? "RAD" : angleMode === "RAD" ? "GRD" : "DEG";
                calcDispatch({ type: "SET_ANGLE_MODE", payload: nextMode });
              }
            }}
            className={`flex-1 py-2 text-[11px] font-semibold tracking-wider transition-all
              ${activeTab === tab
                ? "text-white border-b-2 border-sky-400 bg-slate-800/40"
                : "text-slate-500 hover:text-slate-300"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto panel-scroll p-2 space-y-2">
        {activeTab === "CATALOG" && (
          <div className="space-y-2">
            {/* Quick function grid */}
            <div className="grid grid-cols-3 gap-1 mb-2">
              {[
                { label: "∫dx", sub: "الحسبين" },
                { label: "asin", sub: "المتجلة" },
                { label: "C", sub: "الأساسيات" },
              ].map(item => (
                <button key={item.label}
                  className="flex flex-col items-center py-2 px-1 rounded-lg bg-slate-800/70 border border-slate-700/50 hover:bg-slate-700/70 transition"
                >
                  <span className="text-sm font-mono text-white">{item.label}</span>
                  <span className="text-[8px] text-slate-400 mt-0.5">{item.sub}</span>
                </button>
              ))}
            </div>
            <FunctionCatalogPanel />
          </div>
        )}

        {activeTab === "CONSTANTS" && <ConstantsLibraryPanel />}

        {activeTab === "DEG" && (
          <div className="space-y-2">
            <div className="text-center py-4 text-slate-400 text-sm">
              Angle Mode: <span className="text-white font-bold">{angleMode}</span>
            </div>
            {(["DEG", "RAD", "GRD"] as const).map(m => (
              <button
                key={m}
                onClick={() => calcDispatch({ type: "SET_ANGLE_MODE", payload: m })}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition
                  ${angleMode === m ? "bg-sky-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Variables & Memory section */}
      <div className="border-t border-slate-800/60">
        <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Variables &amp; Memory
        </div>
        <div className="px-2 pb-2">
          <div className="grid grid-cols-4 gap-1">
            {["lπ", "ln", "Σ", "log"].map(v => (
              <button key={v} className="py-1.5 text-[11px] font-mono text-slate-200 rounded-md bg-slate-800/60 border border-slate-700/40 hover:bg-slate-700/60 transition">
                {v}
              </button>
            ))}
            {["ℓn", "sin", "cos", "tan"].map(v => (
              <button key={v} className="py-1.5 text-[11px] font-mono text-slate-200 rounded-md bg-slate-800/60 border border-slate-700/40 hover:bg-slate-700/60 transition">
                {v}
              </button>
            ))}
            {["x²", "y", "x^a", "x, z"].map(v => (
              <button key={v} className="py-1.5 text-[11px] font-mono text-slate-200 rounded-md bg-slate-800/60 border border-slate-700/40 hover:bg-slate-700/60 transition">
                {v}
              </button>
            ))}
            {["( )", "hyp", "tatr", "[z]"].map(v => (
              <button key={v} className="py-1.5 text-[11px] font-mono text-slate-200 rounded-md bg-slate-800/60 border border-slate-700/40 hover:bg-slate-700/60 transition">
                {v}
              </button>
            ))}
            {["[θ]", "[π²]", "[π*]", "Ans"].map(v => (
              <button key={v} className="py-1.5 text-[11px] font-mono text-slate-200 rounded-md bg-slate-800/60 border border-slate-700/40 hover:bg-slate-700/60 transition">
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History section */}
      <div className="border-t border-slate-800/60 flex-shrink-0" style={{ maxHeight: 240 }}>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">History</span>
          <button className="text-slate-500 hover:text-slate-300 transition text-xs">≡</button>
        </div>
        <div className="overflow-y-auto panel-scroll px-2 pb-2 space-y-1.5" style={{ maxHeight: 190 }}>
          {calcState.history.length === 0 ? (
            <div className="text-[11px] text-slate-500 px-2 py-3 text-center">No history yet</div>
          ) : (
            calcState.history.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2">
                <div className="text-[11px] font-mono text-sky-300">{entry.expression}</div>
                <div className="text-right text-[12px] font-semibold text-white mt-0.5">{entry.result}</div>
              </div>
            ))
          )}
          {/* Sparkle button like in the image */}
          <div className="flex justify-end mt-1 pr-1">
            <div className="text-sky-400 text-lg">✦</div>
          </div>
          <div className="text-right text-[10px] text-green-400 font-mono pr-1">+ C</div>
        </div>
      </div>
    </aside>
  );
}

// ─── Main layout ─────────────────────────────────────────────────────────────
function AppShellContent() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 420, height: 760 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origWidth: number; origHeight: number } | null>(null);

  const handleDragStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, origX: position.x, origY: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [position]);

  const handleResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    resizeRef.current = { startX: event.clientX, startY: event.clientY, origWidth: size.width, origHeight: size.height };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
  }, [size]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (dragRef.current) {
        const dx = event.clientX - dragRef.current.startX;
        const dy = event.clientY - dragRef.current.startY;
        setPosition({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
      }
      if (resizeRef.current) {
        const dx = event.clientX - resizeRef.current.startX;
        const dy = event.clientY - resizeRef.current.startY;
        setSize({
          width: Math.max(320, resizeRef.current.origWidth + dx),
          height: Math.max(520, resizeRef.current.origHeight + dy),
        });
      }
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0d14]">
      {/* Left sidebar */}
      <AppsGrid />

      {/* Center: Calculator */}
      <main className="relative flex-1 flex items-center justify-center overflow-hidden bg-[#0a0d14] p-10">
        <div
          className="absolute rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl"
          style={{
            left: position.x,
            top: position.y,
            width: size.width + 24,
            height: size.height + 24,
            padding: 12,
            minWidth: 360,
            minHeight: 560,
          }}
        >
          <div
            className="mb-3 flex cursor-grab items-center justify-between rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-300"
            onPointerDown={handleDragStart}
          >
            <span className="font-semibold">Move / Resize Calculator</span>
            <span className="text-xs text-slate-400">Drag here</span>
          </div>

          <div className="relative h-full w-full">
            <CalculatorShell width={size.width} height={size.height} />
            <div
              className="absolute bottom-2 right-2 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-full bg-slate-800/90 text-[10px] text-slate-200"
              onPointerDown={handleResizeStart}
            >
              ↘
            </div>
          </div>
        </div>
      </main>

      {/* Right panel */}
      <RightPanel />
    </div>
  );
}

export default function AppShell() {
  return (
    <AppProvider>
      <CalculatorProvider>
        <AppShellContent />
      </CalculatorProvider>
    </AppProvider>
  );
}
