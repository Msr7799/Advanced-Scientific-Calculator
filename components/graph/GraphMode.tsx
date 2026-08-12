"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCasioStore } from "@/store/calculatorStore";
import { calculate } from "@/lib/math/engine";
import { Trash2 } from "lucide-react";

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator(el: HTMLElement, options?: Record<string, unknown>): DesmosInstance;
    };
  }
}

interface DesmosInstance {
  setExpression(opts: { id: string; latex?: string; color?: string; hidden?: boolean }): void;
  removeExpression(opts: { id: string }): void;
  getState(): unknown;
  setState(state: unknown): void;
  destroy(): void;
  updateSettings(s: Record<string, unknown>): void;
  screenshot(opts?: Record<string, unknown>): string;
  setMathBounds(bounds: { left: number; right: number; bottom: number; top: number }): void;
}

// F-key labels for graph mode (matching real fx-CG50)
const GRAPH_FKEYS = [
  { key: "F1", label: "Trace",   color: "#55aaff" },
  { key: "F2", label: "Zoom",    color: "#55aaff" },
  { key: "F3", label: "V-Win",   color: "#55aaff" },
  { key: "F4", label: "Sketch",  color: "#55aaff" },
  { key: "F5", label: "G-Solv",  color: "#55aaff" },
  { key: "F6", label: "G↔T",    color: "#55aaff" },
];

// Graph line colors matching Casio color scheme
export default function GraphMode() {
  const calcRef = useRef<HTMLDivElement>(null);
  const desmosRef = useRef<DesmosInstance | null>(null);
  const { graphEquations, setGraphEquation, addGraphEquation, removeGraphEquation, toggleGraphEquation, setMode } = useCasioStore();
  const [desmosReady, setDesmosReady] = useState(false);
  const [traceMode, setTraceMode] = useState(false);
  const [activeEq, setActiveEq] = useState<string | null>(null);
  const [traceX, setTraceX] = useState(0);
  const [bounds, setBounds] = useState({ left: -10, right: 10, bottom: -10, top: 10 });
  const [showWindow, setShowWindow] = useState(false);
  const [graphMessage, setGraphMessage] = useState("");

  // ── Initialize Desmos ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!calcRef.current) return;

    // Wait for Desmos script to load
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.Desmos) {
        clearInterval(interval);
        try {
          desmosRef.current = window.Desmos.GraphingCalculator(calcRef.current!, {
            expressionsCollapsed: true,
            settingsMenu: false,
            expressions: false,
            zoomButtons: true,
            border: false,
            backgroundColor: "#0a1828",
            textColor: "#80b8e8",
            pasteGraphLink: false,
            links: false,
            qwertyKeyboard: false,
          });
          setDesmosReady(true);
        } catch (e) {
          console.warn("Desmos init failed:", e);
        }
      }
      if (attempts > 30) {
        clearInterval(interval);
        console.warn("Desmos CDN failed to load after 3s");
      }
    }, 100);

    return () => {
      clearInterval(interval);
      desmosRef.current?.destroy();
    };
  }, []);

  // ── Sync equations to Desmos ──────────────────────────────────────────────
  useEffect(() => {
    if (!desmosRef.current || !desmosReady) return;
    for (const eq of graphEquations) {
      if (!eq.expression.trim()) {
        desmosRef.current.removeExpression({ id: eq.id });
        continue;
      }
      // Convert common math.js/Casio notation to Desmos LaTeX
      const latex = convertToDesmosLatex(eq.expression);
      desmosRef.current.setExpression({
        id: eq.id,
        latex: `y=${latex}`,
        color: eq.color,
        hidden: !eq.visible,
      });
    }
  }, [graphEquations, desmosReady]);

  // ── Equation change handler ───────────────────────────────────────────────
  const handleExprChange = useCallback((id: string, value: string) => {
    setGraphEquation(id, value);
  }, [setGraphEquation]);

  const applyBounds = useCallback((next: typeof bounds) => {
    if (!(next.left < next.right && next.bottom < next.top)) {
      setGraphMessage("V-Window limits are invalid");
      return;
    }
    setBounds(next);
    desmosRef.current?.setMathBounds(next);
    setGraphMessage("");
  }, []);

  const handleFKey = useCallback((index: number) => {
    const active = graphEquations.find((equation) => equation.id === activeEq) ?? graphEquations.find((equation) => equation.visible && equation.expression.trim());
    if (index === 0) { setTraceMode((value) => !value); setGraphMessage(""); return; }
    if (index === 1) {
      const next = bounds.right - bounds.left > 10
        ? { left: -5, right: 5, bottom: -5, top: 5 }
        : { left: -10, right: 10, bottom: -10, top: 10 };
      applyBounds(next); return;
    }
    if (index === 2) { setShowWindow((value) => !value); return; }
    if (index === 3) {
      if (!active) { setGraphMessage("Select an equation first"); return; }
      try {
        const y = Number(calculate(active.expression, { x: traceX }).result);
        desmosRef.current?.setExpression({ id: "sketch-marker", latex: `(${traceX},${y})`, color: "#ffffff" });
        setGraphMessage(`Point (${traceX}, ${Number(y.toPrecision(7))})`);
      } catch { setGraphMessage("Cannot sketch this equation"); }
      return;
    }
    if (index === 4) {
      if (!active) { setGraphMessage("Select an equation first"); return; }
      try {
        let previousX = bounds.left;
        let previousY = Number(calculate(active.expression, { x: previousX }).result);
        let root: number | null = previousY === 0 ? previousX : null;
        for (let step = 1; step <= 500 && root === null; step++) {
          const x = bounds.left + ((bounds.right - bounds.left) * step) / 500;
          const y = Number(calculate(active.expression, { x }).result);
          if (Number.isFinite(y) && Number.isFinite(previousY) && y * previousY <= 0) {
            let low = previousX, high = x;
            for (let iteration = 0; iteration < 40; iteration++) {
              const middle = (low + high) / 2;
              const middleY = Number(calculate(active.expression, { x: middle }).result);
              if (middleY * previousY <= 0) high = middle; else low = middle;
            }
            root = (low + high) / 2;
          }
          previousX = x; previousY = y;
        }
        setGraphMessage(root === null ? "No root in the visible window" : `Root x = ${Number(root.toPrecision(9))}`);
      } catch { setGraphMessage("G-Solv could not evaluate the equation"); }
      return;
    }
    if (index === 5) setMode("TABLE");
  }, [activeEq, applyBounds, bounds, graphEquations, setMode, traceX]);

  useEffect(() => {
    const onFKey = (event: Event) => handleFKey(Number((event as CustomEvent<string>).detail.slice(1)) - 1);
    const onNav = (event: Event) => {
      if (!traceMode) return;
      const direction = (event as CustomEvent<string>).detail;
      if (direction === "LEFT") setTraceX((value) => Number((value - 0.1).toFixed(8)));
      if (direction === "RIGHT") setTraceX((value) => Number((value + 0.1).toFixed(8)));
    };
    window.addEventListener("casio-fkey", onFKey);
    window.addEventListener("casio-nav", onNav);
    return () => { window.removeEventListener("casio-fkey", onFKey); window.removeEventListener("casio-nav", onNav); };
  }, [handleFKey, traceMode]);

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#080e18" }}>

      {/* ── Equation list (left panel) ─────────────────────────── */}
      <div
        className="w-52 shrink-0 flex flex-col border-r overflow-hidden"
        style={{ borderColor: "#1a2840", background: "#0a1220" }}
      >
        {/* F-key bar */}
        <div
          className="grid grid-cols-6 border-b shrink-0"
          style={{ borderColor: "#1a2840", background: "#06101c" }}
        >
          {GRAPH_FKEYS.map((fk) => (
            <button
              key={fk.key}
              type="button"
              onClick={() => handleFKey(Number(fk.key.slice(1)) - 1)}
              className="py-1.5 text-center text-[8px] font-bold truncate border-r last:border-r-0"
              style={{ color: fk.color, borderColor: "#1a2840" }}
            >
              {fk.label}
            </button>
          ))}
        </div>

        <div className="text-[9px] font-bold tracking-[0.25em] px-3 py-2 border-b shrink-0" style={{ color: "#2a4060", borderColor: "#1a2840" }}>
          EQUATIONS
        </div>

        {/* Equation inputs */}
        <div className="flex-1 overflow-y-auto panel-scroll p-2 space-y-2">
          {graphEquations.map((eq, idx) => (
            <div key={eq.id} className="space-y-1">
              <div className="flex items-center gap-1.5">
                {/* Color dot / visibility toggle */}
                <button
                  onClick={() => toggleGraphEquation(eq.id)}
                  className="w-3 h-3 rounded-full shrink-0 border transition-all"
                  style={{
                    background: eq.visible ? eq.color : "transparent",
                    borderColor: eq.color,
                    boxShadow: eq.visible ? `0 0 5px ${eq.color}66` : "none",
                  }}
                  title="Toggle visibility"
                />
                <span className="text-[9px] font-mono text-[#3a5878]">Y{idx + 1}</span>
                <span className="text-[9px] text-[#2a3a50]">=</span>
              </div>
              <input
                value={eq.expression}
                onChange={(e) => handleExprChange(eq.id, e.target.value)}
                onFocus={() => setActiveEq(eq.id)}
                onBlur={() => setActiveEq(null)}
                className="w-full rounded px-2 py-1.5 text-[11px] font-mono transition-all"
                style={{
                  background: "#080e18",
                  border: `1px solid ${activeEq === eq.id ? eq.color + "88" : "#1a2840"}`,
                  color: eq.color,
                  outline: "none",
                  boxShadow: activeEq === eq.id ? `0 0 6px ${eq.color}22` : "none",
                }}
                placeholder={`f(x) for Y${idx + 1}`}
              />
              {graphEquations.length > 1 && <button type="button" onClick={() => removeGraphEquation(eq.id)} className="mode-icon-button ml-auto" title={`Remove Y${idx + 1}`}><Trash2 size={12} /></button>}
            </div>
          ))}

          {graphEquations.length < 6 && (
            <button
              onClick={addGraphEquation}
              className="w-full rounded py-1.5 text-[10px] font-bold transition-all mt-1"
              style={{
                background: "#0a1828",
                color: "#2a4060",
                border: "1px dashed #1a2840",
              }}
            >
              + Add Y{graphEquations.length + 1}
            </button>
          )}
        </div>

        {/* Graph controls */}
        <div className="border-t p-2 space-y-1.5 shrink-0" style={{ borderColor: "#1a2840" }}>
          <button
            onClick={() => setTraceMode((v) => !v)}
            className="w-full rounded py-1.5 text-[10px] font-bold transition-all"
            style={{
              background: traceMode ? "#1a3a60" : "#0a1828",
              color: traceMode ? "#70b8ff" : "#2a4060",
              border: `1px solid ${traceMode ? "#2a5080" : "#1a2840"}`,
            }}
          >
            {traceMode ? "✓ TRACE ON" : "TRACE"}
          </button>
        </div>
      </div>

      {/* ── Desmos graph area ──────────────────────────────────── */}
        <div className="flex-1 relative overflow-hidden">
        {showWindow && <div className="absolute left-3 top-3 z-30 grid grid-cols-2 gap-2 rounded border border-[#294766] bg-[#071322] p-3">
          {(["left", "right", "bottom", "top"] as const).map((key) => <label key={key} className="text-[9px] uppercase text-[#6f8eaf]">{key}<input type="number" value={bounds[key]} onChange={(event) => applyBounds({ ...bounds, [key]: Number(event.target.value) })} className="mt-1 block w-20 rounded border border-[#294766] bg-[#020817] px-2 py-1 text-white" /></label>)}
        </div>}
        {/* Desmos container */}
        <div
          ref={calcRef}
          className="absolute inset-0"
          style={{ background: "#0a1828" }}
        />

        {/* Overlay: loading / fallback */}
        {!desmosReady && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
            style={{ background: "#080e18" }}
          >
            {/* SVG fallback graph */}
            <FallbackGraph equations={graphEquations} />
            <div className="text-[10px] text-[#2a4060] font-mono text-center px-6">
              {typeof window !== "undefined" && !(window as Window & { Desmos?: unknown }).Desmos
                ? "Desmos API not loaded — showing preview graph\n(requires internet connection)"
                : "Loading Desmos graph engine..."}
            </div>
          </div>
        )}

        {/* Mode indicator overlay */}
        <div
          className="absolute top-2 right-2 text-[9px] font-mono font-bold px-2 py-0.5 rounded z-20"
          style={{ background: "rgba(10,24,40,0.85)", color: "#4488aa", border: "1px solid #1a3050" }}
        >
          GRAPH Y=
        </div>
        {(graphMessage || traceMode) && <div className="absolute bottom-3 left-3 z-20 rounded border border-[#294766] bg-[#071322dd] px-3 py-2 font-mono text-[10px] text-[#80c8ff]">{graphMessage || `TRACE x=${traceX}`}</div>}
      </div>
    </div>
  );
}

// ─── Convert basic Casio syntax to Desmos LaTeX ───────────────────────────────
function convertToDesmosLatex(expr: string): string {
  return expr
    .replace(/\*\*/g, "^")
    .replace(/sqrt\(([^)]+)\)/g, "\\sqrt{$1}")
    .replace(/\|([^|]+)\|/g, "\\left|$1\\right|")
    .trim();
}

// ─── SVG fallback graph when Desmos not available ────────────────────────────
function FallbackGraph({ equations }: { equations: { id: string; expression: string; color: string; visible: boolean }[] }) {
  const W = 500, H = 300;

  function buildPath(expr: string, color: string, idx: number) {
    const from = -10, to = 10;
    const steps = 200;
    const pts: string[] = [];
    let cmd = "M";

    for (let i = 0; i <= steps; i++) {
      const x = from + (i / steps) * (to - from);
      let y: number;
      try {
        y = Number(calculate(expr, { x }).result);
      } catch { continue; }
      if (!Number.isFinite(y) || Math.abs(y) > 20) { cmd = "M"; continue; }
      const px = ((x - from) / (to - from)) * W;
      const py = H / 2 - (y / 20) * (H / 2);
      pts.push(`${cmd} ${px.toFixed(1)} ${py.toFixed(1)}`);
      cmd = "L";
    }
    return (
      <path
        key={idx}
        d={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxWidth: 500, maxHeight: 300 }}
    >
      <rect width={W} height={H} fill="#080e18" />
      {/* Grid */}
      <g stroke="#1a2840" strokeWidth="0.5">
        {Array.from({ length: 21 }).map((_, i) => (
          <line key={`v${i}`} x1={(i / 20) * W} y1="0" x2={(i / 20) * W} y2={H} />
        ))}
        {Array.from({ length: 13 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={(i / 12) * H} x2={W} y2={(i / 12) * H} />
        ))}
      </g>
      {/* Axes */}
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#2a4060" strokeWidth="1" />
      <line x1={W / 2} y1="0" x2={W / 2} y2={H} stroke="#2a4060" strokeWidth="1" />

      {/* Equations */}
      {equations
        .filter((eq) => eq.visible && eq.expression.trim())
        .map((eq, i) => buildPath(eq.expression, eq.color, i))}
    </svg>
  );
}
