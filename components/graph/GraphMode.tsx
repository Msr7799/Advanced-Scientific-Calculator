"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useCasioStore } from "@/store/calculatorStore";
import { useTheme } from "@/components/theme/ThemeProvider";
import { calculate } from "@/lib/math/engine";
import { ContextMenu, type ContextMenuEntry } from "@/components/ui/context-menu";
import { AnimatePresence, motion } from "framer-motion";
import { Crosshair, Download, Expand, Grid3X3, Plus, RotateCcw, Table2, Trash2, ZoomIn, ZoomOut } from "lucide-react";

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

function normalizeDecimalInput(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/٫/g, ".")
    .replace(/−/g, "-");
}

// Graph line colors matching Casio color scheme
export default function GraphMode() {
  const { theme } = useTheme();
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
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);

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
            backgroundColor: theme === "light" ? "#ffffff" : "#151515",
            textColor: theme === "light" ? "#334155" : "#80b8e8",
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
  }, [theme]);

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

  const zoomGraph = useCallback((factor: number) => {
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.bottom + bounds.top) / 2;
    const halfWidth = ((bounds.right - bounds.left) * factor) / 2;
    const halfHeight = ((bounds.top - bounds.bottom) * factor) / 2;
    applyBounds({ left: centerX - halfWidth, right: centerX + halfWidth, bottom: centerY - halfHeight, top: centerY + halfHeight });
  }, [applyBounds, bounds]);

  const resetGraph = useCallback(() => {
    const defaults = { left: -10, right: 10, bottom: -10, top: 10 };
    applyBounds(defaults);
    setTraceX(0);
    setTraceMode(false);
    setGraphMessage("Graph view reset");
    desmosRef.current?.removeExpression({ id: "sketch-marker" });
  }, [applyBounds]);

  const exportGraph = useCallback(() => {
    const image = desmosRef.current?.screenshot({ width: 1600, height: 900, targetPixelRatio: 2 });
    if (!image) { setGraphMessage("Graph export is available after Desmos loads"); return; }
    const link = document.createElement("a");
    link.href = image;
    link.download = `casio-graph-${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
    setGraphMessage("Graph image saved");
  }, []);

  const clearEquations = useCallback(() => {
    graphEquations.forEach((equation, index) => {
      setGraphEquation(equation.id, "");
      if (index > 2) removeGraphEquation(equation.id);
    });
    desmosRef.current?.removeExpression({ id: "sketch-marker" });
    setGraphMessage("Equations cleared");
  }, [graphEquations, removeGraphEquation, setGraphEquation]);

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

  const contextEntries = useMemo<ContextMenuEntry[]>(() => [
    { type: "label", label: "GRAPH ACTIONS" },
    { type: "item", label: "Add equation", icon: <Plus size={15} />, shortcut: "Y=", disabled: graphEquations.length >= 6, onSelect: addGraphEquation },
    { type: "item", label: traceMode ? "Stop trace" : "Start trace", icon: <Crosshair size={15} />, shortcut: "F1", checked: traceMode, onSelect: () => handleFKey(0) },
    { type: "item", label: "Find root", icon: <Crosshair size={15} />, shortcut: "F5", onSelect: () => handleFKey(4) },
    { type: "separator" },
    { type: "label", label: "VIEW" },
    { type: "item", label: "Zoom in", icon: <ZoomIn size={15} />, shortcut: "+", onSelect: () => zoomGraph(0.5) },
    { type: "item", label: "Zoom out", icon: <ZoomOut size={15} />, shortcut: "-", onSelect: () => zoomGraph(2) },
    { type: "item", label: "V-Window settings", icon: <Grid3X3 size={15} />, shortcut: "F3", onSelect: () => setShowWindow(true) },
    { type: "item", label: "Show grid", checked: showGrid, onSelect: () => {
      const next = !showGrid; setShowGrid(next); desmosRef.current?.updateSettings({ showGrid: next });
    } },
    { type: "item", label: "Show axes", checked: showAxes, onSelect: () => {
      const next = !showAxes; setShowAxes(next); desmosRef.current?.updateSettings({ xAxis: next, yAxis: next });
    } },
    { type: "item", label: "Reset graph view", icon: <RotateCcw size={15} />, shortcut: "Home", onSelect: resetGraph },
    { type: "separator" },
    { type: "item", label: "Open in Table", icon: <Table2 size={15} />, shortcut: "F6", onSelect: () => setMode("TABLE") },
    { type: "item", label: "Full screen", icon: <Expand size={15} />, onSelect: () => window.dispatchEvent(new CustomEvent("casio-fullscreen", { detail: "GRAPH" })) },
    { type: "item", label: "Save graph as PNG", icon: <Download size={15} />, onSelect: exportGraph },
    { type: "separator" },
    { type: "item", label: "Clear all equations", icon: <Trash2 size={15} />, destructive: true, disabled: graphEquations.every((equation) => !equation.expression.trim()), onSelect: clearEquations },
  ], [addGraphEquation, clearEquations, exportGraph, graphEquations, handleFKey, resetGraph, setMode, showAxes, showGrid, traceMode, zoomGraph]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="graph-workspace flex h-full overflow-hidden" style={{ background: "var(--surface-1)" }}>

      {/* ── Equation list (left panel) ─────────────────────────── */}
      <div
        className="flex w-60 shrink-0 flex-col overflow-hidden border-r"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        {/* F-key bar */}
        <div
          className="graph-function-bar grid grid-cols-3 border-b shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          {GRAPH_FKEYS.map((fk) => (
            <button
              key={fk.key}
              type="button"
              onClick={() => handleFKey(Number(fk.key.slice(1)) - 1)}
              className="graph-function-button min-h-9 border-r px-0.5 py-2 text-center font-bold transition-colors hover:bg-[var(--surface-hover)] last:border-r-0"
              style={{ borderColor: "var(--border)" }}
              title={`${fk.key}: ${fk.label}`}
            >
              {fk.label}
            </button>
          ))}
        </div>

        <div className="shrink-0 border-b px-4 py-3 text-[9px] font-bold tracking-[0.25em]" style={{ color: "#4f6c8a", borderColor: "var(--border)" }}>
          EQUATIONS
        </div>

        {/* Equation inputs */}
        <div className="panel-scroll flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {graphEquations.map((eq, idx) => (
            <motion.div layout key={eq.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
              <div className="mb-2 flex items-center gap-2">
                {/* Color dot / visibility toggle */}
                <button
                  onClick={() => toggleGraphEquation(eq.id)}
                  className="h-4 w-4 shrink-0 rounded-full border transition-all"
                  style={{
                    background: eq.visible ? eq.color : "transparent",
                    borderColor: eq.color,
                    boxShadow: eq.visible ? `0 0 5px ${eq.color}66` : "none",
                  }}
                  title="Toggle visibility"
                />
                <span className="font-mono text-[10px] font-bold text-[#6b89a8]">Y{idx + 1}</span>
                <span className="text-[10px] text-[#40546b]">=</span>
                {graphEquations.length > 1 && <button type="button" onClick={() => removeGraphEquation(eq.id)} className="mode-icon-button ml-auto" title={`Remove Y${idx + 1}`}><Trash2 size={12} /></button>}
              </div>
              <input
                value={eq.expression}
                onChange={(e) => handleExprChange(eq.id, e.target.value)}
                onFocus={() => setActiveEq(eq.id)}
                onBlur={() => setActiveEq(null)}
                className="w-full rounded px-3 py-2 text-[12px] font-mono transition-all"
                style={{
                  background: "var(--surface-1)",
                  border: `1px solid ${activeEq === eq.id ? eq.color + "88" : "var(--border)"}`,
                  color: eq.color,
                  outline: "none",
                  boxShadow: activeEq === eq.id ? `0 0 6px ${eq.color}22` : "none",
                }}
                placeholder={`f(x) for Y${idx + 1}`}
              />
            </motion.div>
          ))}

          {graphEquations.length < 6 && (
            <button
              onClick={addGraphEquation}
              className="mt-2 min-h-10 w-full rounded px-3 py-2.5 text-[10px] font-bold transition-all hover:border-[#315779] hover:text-[#79aed8]"
              style={{
                background: "var(--surface-3)",
                color: "#2a4060",
                border: "1px dashed var(--border)",
              }}
            >
              + Add Y{graphEquations.length + 1}
            </button>
          )}
        </div>

        {/* Graph controls */}
        <div className="shrink-0 space-y-1.5 border-t p-3" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setTraceMode((v) => !v)}
            className="w-full rounded py-1.5 text-[10px] font-bold transition-all"
            style={{
              background: traceMode ? "#1a3a60" : "var(--surface-3)",
              color: traceMode ? "#70b8ff" : "#2a4060",
              border: `1px solid ${traceMode ? "#2a5080" : "var(--border)"}`,
            }}
          >
            {traceMode ? "✓ TRACE ON" : "TRACE"}
          </button>
        </div>
      </div>

      {/* ── Desmos graph area ──────────────────────────────────── */}
      <ContextMenu entries={contextEntries} ariaLabel="Graph actions" className="relative min-w-0 flex-1 overflow-hidden">
       <div className="relative h-full min-w-0 overflow-hidden">
        <AnimatePresence>
        {showWindow && <motion.div initial={{ opacity: 0, scale: 0.96, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: -4 }} className="graph-window-dialog absolute left-4 top-4 z-30 grid grid-cols-2 gap-3 rounded-md border bg-[var(--surface-2)]/95 p-4 shadow-2xl backdrop-blur">
          {(["left", "right", "bottom", "top"] as const).map((key) => <label key={`${key}-${bounds[key]}`} className="text-[9px] uppercase text-[var(--text-muted)]">{key}<input type="text" inputMode="decimal" lang="en" dir="ltr" defaultValue={String(bounds[key])} onBlur={(event) => { const value = Number(normalizeDecimalInput(event.target.value)); if (Number.isFinite(value)) applyBounds({ ...bounds, [key]: value }); else event.target.value = String(bounds[key]); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className="mt-1 block w-24 rounded border bg-[var(--input-bg)] px-2 py-1.5 font-mono text-[var(--text)]" /></label>)}
          <button type="button" onClick={() => setShowWindow(false)} className="col-span-2 min-h-8 rounded border border-[#315779] text-[10px] font-bold text-[#79aed8] hover:bg-[var(--surface-hover)]">DONE</button>
        </motion.div>}
        </AnimatePresence>
        {/* Desmos container */}
        <div
          ref={calcRef}
          className="absolute inset-0"
          style={{ background: "var(--surface-3)" }}
        />

        {/* Overlay: loading / fallback */}
        {!desmosReady && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
            style={{ background: "var(--surface-1)" }}
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
          style={{ background: "color-mix(in srgb, var(--surface-2) 85%, transparent)", color: "#4488aa", border: "1px solid var(--border)" }}
        >
          GRAPH Y=
        </div>
        <AnimatePresence>
          {(graphMessage || traceMode) && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute bottom-4 left-4 z-20 rounded border border-[#294766] bg-[var(--surface-2)] px-3 py-2 font-mono text-[10px] text-[#80c8ff] shadow-lg">{graphMessage || `TRACE x=${traceX}`}</motion.div>}
        </AnimatePresence>
       </div>
      </ContextMenu>
    </motion.div>
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
      <rect width={W} height={H} fill="var(--surface-1)" />
      {/* Grid */}
      <g stroke="var(--border)" strokeWidth="0.5">
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
