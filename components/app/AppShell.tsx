"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { GripVertical, Maximize2, Minimize2, MoveHorizontal, X } from "lucide-react";
import { CalculatorProvider, useCalculatorState } from "@/lib/state/calculatorState";
import { useCasioStore } from "@/store/calculatorStore";
import CalculatorShell from "@/components/calculator/CalculatorShell";
import CasioScreen from "@/components/display/CasioScreen";
import GraphMode from "@/components/graph/GraphMode";
import MatrixMode from "@/components/matrix/MatrixMode";
import VectorMode from "@/components/vector/VectorMode";
import StatisticsMode from "@/components/statistics/StatisticsMode";
import EquationSolver from "@/components/equationlib/equation/EquationSolver";
import TableMode from "@/components/modes/TableMode";
import PythonMode from "@/components/modes/PythonMode";
import type { CasioMode } from "@/types/calculator";

// ─── Mode meta ────────────────────────────────────────────────────────────────
const MODE_META: Record<CasioMode, { label: string; color: string }> = {
  MENU:       { label: "MENU",    color: "#5588ff" },
  RUN_MAT:    { label: "RUN-MAT",color: "#5588ff" },
  GRAPH:      { label: "GRAPH",  color: "#ff9944" },
  TABLE:      { label: "TABLE",  color: "#55ccff" },
  EQUATION:   { label: "EQN",    color: "#ff66aa" },
  MATRIX:     { label: "MATRIX", color: "#cc88ff" },
  VECTOR:     { label: "VECTOR", color: "#ffcc44" },
  STATISTICS: { label: "STAT",   color: "#44cc88" },
  PYTHON:     { label: "PYTHON", color: "#44ddaa" },
};

// ─── Panel header (non-calc modes) ───────────────────────────────────────────
function ModeHeader({ mode, onBack }: { mode: CasioMode; onBack: () => void }) {
  const meta = MODE_META[mode] ?? MODE_META.RUN_MAT;
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 border-b shrink-0"
      style={{ borderColor: meta.color + "22", background: `${meta.color}08` }}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold tracking-wider transition-all cursor-pointer"
        style={{
          fontSize: 13,
          background: `${meta.color}18`,
          color: meta.color,
          border: `1px solid ${meta.color}35`,
        }}
      >
        ← MENU
      </button>
      {mode === "PYTHON" ? (
        <div className="flex h-7 items-center" aria-label="Python">
          <Image
            src="/Python-Logo-3.svg"
            alt=""
            aria-hidden="true"
            width={94}
            height={28}
            unoptimized
            className="h-7 w-[94px] object-contain object-left"
          />
        </div>
      ) : (
        <div className="font-bold tracking-[0.2em]" style={{ color: meta.color, fontSize: 14 }}>
          {meta.label}
        </div>
      )}
    </div>
  );
}

// ─── History sidebar (non-calc modes) ────────────────────────────────────────
function HistorySidebar() {
  const { history, removeHistory, pinHistory } = useCasioStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex flex-col items-center justify-center gap-1 w-10 h-full py-3 font-bold tracking-wider text-[#4a6080] hover:text-[#7aa0c0] transition-colors cursor-pointer"
        style={{ borderLeft: "1px solid #1a2030", fontSize: 11 }}
        title="History"
      >
        <span style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)", letterSpacing: "0.2em" }}>
          HISTORY
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 240, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute right-10 top-0 bottom-0 overflow-hidden"
            style={{ background: "#0d1520", borderLeft: "1px solid #1a2a40", zIndex: 50 }}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a2a40]">
                <span className="font-bold tracking-[0.25em]" style={{ color: "#5a7aaa", fontSize: 12 }}>HISTORY</span>
                <button onClick={() => setOpen(false)} className="text-[#304050] hover:text-[#608090] cursor-pointer" style={{ fontSize: 14 }}>✕</button>
              </div>
              <div className="flex-1 overflow-y-auto panel-scroll p-4 space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-6" style={{ color: "#304050", fontSize: 12 }}>No history yet</div>
                ) : (
                  history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border px-4 py-3 group"
                      style={{ borderColor: "#1a2a40", background: "#0a1220" }}
                    >
                      <div className="font-mono truncate" style={{ color: "#5a9ac0", fontSize: 12 }}>{entry.expression}</div>
                      <div className="font-mono font-bold text-right mt-1" style={{ color: "#fff", fontSize: 15 }}>{entry.result}</div>
                      <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => pinHistory(entry.id)} className="cursor-pointer hover:text-[#70b0b0] transition-colors" style={{ color: "#508080", fontSize: 11 }}>
                          {entry.pinned ? "★" : "☆"}
                        </button>
                        <button onClick={() => removeHistory(entry.id)} className="cursor-pointer hover:text-[#c07070] transition-colors" style={{ color: "#805050", fontSize: 11 }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mode content panel ───────────────────────────────────────────────────────
function ModePanel({ mode }: { mode: CasioMode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        className="flex-1 overflow-hidden"
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.18 }}
      >
        {mode === "GRAPH"      && <GraphMode />}
        {mode === "MATRIX"     && <MatrixMode />}
        {mode === "VECTOR"     && <VectorMode />}
        {mode === "STATISTICS" && <StatisticsMode />}
        {mode === "TABLE"      && <TableMode />}
        {mode === "PYTHON"     && <PythonMode />}
        {mode === "EQUATION"   && <EquationSolver />}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Left Zoom Panel ──────────────────────────────────────────────────────────
function ZoomPanel({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  showExpanded,
  onToggleExpanded,
}: {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  showExpanded: boolean;
  onToggleExpanded: () => void;
}) {
  const atMinimum = scale <= 0.6;
  const atMaximum = scale >= 1.5;

  const controlStyle = {
    background: "#0d1828",
    color: "#70a8dc",
    border: "1px solid #243b5a",
  };

  return (
    <div
      className="flex flex-col items-center gap-2 py-4 px-2 shrink-0"
      style={{
        width: 52,
        background: "rgba(8,14,24,0.75)",
        borderRight: "1px solid #1a2840",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Expand display toggle */}
      <button
        onClick={onToggleExpanded}
        className="w-9 h-9 flex items-center justify-center rounded-md transition-all cursor-pointer hover:brightness-125 active:scale-95"
        style={{
          background: showExpanded ? "#1a3a60" : "#0d1828",
          color: showExpanded ? "#80c8ff" : "#3a6090",
          border: `1px solid ${showExpanded ? "#2a5898" : "#1e3050"}`,
          fontSize: 14,
          boxShadow: showExpanded ? "0 0 8px rgba(80,160,255,0.2)" : undefined,
        }}
        title={showExpanded ? "Hide expanded display" : "Show expanded display"}
      >
        ⛶
      </button>

      {/* Divider */}
      <div className="w-7 h-px my-1" style={{ background: "#1a2840" }} />

      {/* Zoom In */}
      <button
        onClick={onZoomIn}
        disabled={atMaximum}
        className="w-9 h-9 flex items-center justify-center rounded-md font-black transition-all cursor-pointer hover:brightness-125 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
        style={{ ...controlStyle, fontSize: 20 }}
        title="Zoom In"
      >
        +
      </button>

      {/* Percent indicator */}
      <button
        onClick={onReset}
        className="w-9 h-9 flex items-center justify-center rounded-md font-mono font-bold cursor-pointer transition-all hover:brightness-125 active:scale-95"
        style={{
          background: "#0a1420",
          color: "#3a6090",
          border: "1px solid #1a2840",
          fontSize: 9,
          lineHeight: 1,
        }}
        title="Reset zoom & position"
      >
        {Math.round(scale * 100)}%
      </button>

      {/* Zoom Out */}
      <button
        onClick={onZoomOut}
        disabled={atMinimum}
        className="w-9 h-9 flex items-center justify-center rounded-md font-black transition-all cursor-pointer hover:brightness-125 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
        style={{ ...controlStyle, fontSize: 20 }}
        title="Zoom Out"
      >
        −
      </button>

    </div>
  );
}

// ─── Draggable + Zoomable Calculator ─────────────────────────────────────────
function DraggableCalculator({
  showExpandedDisplay,
  onToggleExpandedDisplay,
}: {
  showExpandedDisplay: boolean;
  onToggleExpandedDisplay: () => void;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Drag ──────────────────────────────────────────────────────────────────
  const onDragBarPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    setIsDragging(true);
  }, [pos]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const viewportWidth = containerRef.current?.parentElement?.clientWidth ?? window.innerWidth;
      const viewportHeight = containerRef.current?.parentElement?.clientHeight ?? window.innerHeight;
      const maxX = Math.max(0, viewportWidth / 2 - 90);
      const maxY = Math.max(0, viewportHeight / 2 - 90);
      const nextX = dragRef.current.origX + (e.clientX - dragRef.current.startX);
      const nextY = dragRef.current.origY + (e.clientY - dragRef.current.startY);
      setPos({
        x: Math.max(-maxX, Math.min(maxX, nextX)),
        y: Math.max(-maxY, Math.min(maxY, nextY)),
      });
    };
    const onUp = () => { dragRef.current = null; setIsDragging(false); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // ── Scroll to zoom ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => Math.min(1.5, Math.max(0.6, s - e.deltaY * 0.001)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomIn  = () => setScale((s) => Math.min(1.5, parseFloat((s + 0.1).toFixed(2))));
  const zoomOut = () => setScale((s) => Math.max(0.6, parseFloat((s - 0.1).toFixed(2))));
  const zoomReset = () => { setScale(1); setPos({ x: 0, y: 0 }); };

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden h-full">
      {/* ── Left zoom panel ── */}
      <ZoomPanel
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={zoomReset}
        showExpanded={showExpandedDisplay}
        onToggleExpanded={onToggleExpandedDisplay}
      />

      {/* ── Canvas area ── */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Positioned calculator */}
        <div
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.05s ease-out",
          }}
        >
          {/* Drag handle — sits on top of calculator body */}
          <div
            onPointerDown={onDragBarPointerDown}
            className="flex items-center justify-center gap-3 select-none rounded-t-[18px] px-5 py-2"
            style={{
              background: "linear-gradient(90deg, #0a1420 0%, #0f1c2e 50%, #0a1420 100%)",
              border: "2px solid #3a4050",
              borderBottom: "none",
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
            }}
            title="Drag to move"
          >
            {/* Left dots */}
            <div className="flex gap-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-[5px] h-[5px] rounded-full" style={{ background: "#2a3a50" }} />
              ))}
            </div>
            <span style={{ color: "#1e3050", fontSize: 9, fontFamily: "monospace", letterSpacing: "0.25em" }}>
              MOVE
            </span>
            {/* Right dots */}
            <div className="flex gap-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-[5px] h-[5px] rounded-full" style={{ background: "#2a3a50" }} />
              ))}
            </div>
          </div>

          {/* Glow behind calculator */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "0 0 22px 22px",
              boxShadow: "0 0 80px rgba(30,60,120,0.22), 0 0 160px rgba(20,40,80,0.14)",
              zIndex: -1,
              pointerEvents: "none",
            }}
          />

          <CalculatorShell />
        </div>
      </div>
    </div>
  );
}

// ─── Info card ────────────────────────────────────────────────────────────────
function InfoCard() {
  const { angleMode, memory, lastAnswer, cycleAngleMode } = useCasioStore();

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#0d1520", border: "1px solid #1e2e44" }}
    >
      {/* Header */}
      <div
        className="border-b"
        style={{ borderColor: "#1e2e44", background: "#0a1228", padding: "10px 20px" }}
      >
        <span
          className="font-black tracking-[0.32em]"
          style={{ color: "#4a6888", fontSize: 11 }}
        >
          STATUS
        </span>
      </div>

      {/* Rows */}
      <div style={{ padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="flex items-center justify-between">
          <span style={{ color: "#6888a8", fontSize: 14, fontWeight: 600 }}>Angle</span>
          <button
            onClick={cycleAngleMode}
            className="font-black rounded-lg transition-all cursor-pointer hover:brightness-110 active:scale-95"
            style={{
              background: "#1a3258",
              color: "#7ab8f0",
              border: "1px solid #2a4a78",
              fontSize: 13,
              letterSpacing: "0.1em",
              padding: "4px 14px",
            }}
            title="Click to cycle DEG → RAD → GRD"
          >
            {angleMode}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span style={{ color: "#6888a8", fontSize: 14, fontWeight: 600 }}>Memory</span>
          <span style={{ color: "#60c090", fontSize: 15, fontWeight: 700, fontFamily: "monospace" }}>
            {memory !== 0 ? memory : "—"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span style={{ color: "#6888a8", fontSize: 14, fontWeight: 600 }}>Ans</span>
          <span style={{ color: "#80a8d0", fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>
            {lastAnswer !== 0 ? lastAnswer.toPrecision(8) : "0"}
          </span>
        </div>
      </div>

      {/* Hints */}
      <div style={{ borderTop: "1px solid #1e2e44", padding: "10px 20px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          { key: "F1–F6", desc: "function keys" },
          { key: "ESC",   desc: "back / EXIT" },
          { key: "Shift+S/C/T", desc: "trig" },
          { key: "Scroll",desc: "zoom in/out" },
        ].map(({ key, desc }) => (
          <div key={key} style={{ fontSize: 12, color: "#3a5070" }}>
            <span style={{ color: "#4e6e92", fontWeight: 700 }}>{key}</span>
            {" "}— {desc}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mini history ─────────────────────────────────────────────────────────────
function MiniHistory() {
  const { history } = useCasioStore();
  const recent = history.slice(0, 6);

  return (
    <div
      className="rounded-2xl flex-1 overflow-hidden flex flex-col"
      style={{ background: "#0d1520", border: "1px solid #1e2e44" }}
    >
      {/* Header */}
      <div
        className="border-b shrink-0"
        style={{ borderColor: "#1e2e44", background: "#0a1228", padding: "10px 20px" }}
      >
        <span
          className="font-black tracking-[0.32em]"
          style={{ color: "#4a6888", fontSize: 11 }}
        >
          HISTORY
        </span>
      </div>

      <div className="flex-1 overflow-y-auto panel-scroll" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {recent.length === 0 ? (
          <div
            className="text-center font-mono"
            style={{ color: "#2a3a50", fontSize: 12, paddingTop: 16 }}
          >
            No calculations yet
          </div>
        ) : (
          recent.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl transition-colors hover:brightness-110"
              style={{ background: "#0a1220", border: "1px solid #1a2a3a", padding: "10px 14px" }}
            >
              <div
                className="font-mono truncate"
                style={{ color: "#4a7aaa", fontSize: 12 }}
              >
                {entry.expression}
              </div>
              <div
                className="font-mono font-black text-right"
                style={{ color: "#90d0ff", fontSize: 17, marginTop: 4 }}
              >
                {entry.result}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Expanded display (large mirrored LCD panel) ───────────────────────────
function ExpandedDisplay({ mode, onClose, onFullscreen }: {
  mode: CasioMode;
  onClose: () => void;
  onFullscreen: () => void;
}) {
  const calcState = useCalculatorState();
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === "undefined") return 520;
    const stored = Number(window.localStorage.getItem("expanded-display-width"));
    return Number.isFinite(stored) && stored >= 420 ? stored : 520;
  });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number; currentWidth: number } | null>(null);

  const showResult = calcState.result !== "";
  const isCalculatorDisplay = mode === "RUN_MAT" || mode === "MENU";
  const meta = MODE_META[mode];
  const clampWidth = useCallback((width: number) => {
    if (typeof window === "undefined") return width;
    const minimum = window.innerWidth < 900 ? 360 : 420;
    const maximum = Math.max(minimum, Math.min(1100, window.innerWidth - 400));
    return Math.round(Math.max(minimum, Math.min(maximum, width)));
  }, []);
  const persistWidth = useCallback((width: number) => {
    window.localStorage.setItem("expanded-display-width", String(width));
  }, []);
  const toggleWidePanel = () => {
    const next = clampWidth(panelWidth >= 680 ? 520 : 900);
    setPanelWidth(next);
    persistWidth(next);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -40, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`expanded-display relative flex shrink-0 flex-col overflow-hidden rounded-2xl ${panelWidth >= 680 ? "expanded-display-wide" : ""} ${isResizing ? "expanded-display-resizing" : ""}`}
      style={{
        width: panelWidth,
        background: "#080e18",
        border: "2px solid #1e3050",
        boxShadow: "0 0 40px rgba(20,60,120,0.25), 0 8px 32px rgba(0,0,0,0.5)",
        margin: "20px 0 20px 12px",
      }}
    >
      <div
        role="separator"
        aria-label="Resize expanded display"
        aria-orientation="vertical"
        aria-valuemin={420}
        aria-valuemax={1100}
        aria-valuenow={panelWidth}
        tabIndex={0}
        className="expanded-display-resizer group absolute right-0 top-0 z-50 flex h-full w-3 cursor-ew-resize items-center justify-center touch-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          resizeRef.current = { startX: event.clientX, startWidth: panelWidth, currentWidth: panelWidth };
          setIsResizing(true);
        }}
        onPointerMove={(event) => {
          if (!resizeRef.current) return;
          const next = clampWidth(resizeRef.current.startWidth + event.clientX - resizeRef.current.startX);
          resizeRef.current.currentWidth = next;
          setPanelWidth(next);
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          const finalWidth = resizeRef.current?.currentWidth ?? panelWidth;
          resizeRef.current = null;
          setIsResizing(false);
          persistWidth(finalWidth);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = clampWidth(panelWidth + (event.key === "ArrowRight" ? 40 : -40));
          setPanelWidth(next);
          persistWidth(next);
        }}
      >
        <span className="flex h-12 w-2 items-center justify-center rounded-l bg-[#19314a] text-[#6f9fc8] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100">
          <GripVertical size={12} />
        </span>
      </div>
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0 border-b"
        style={{ borderColor: "#1a2a40", background: "#0a1420" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "#4488e0", boxShadow: "0 0 6px #4488e0" }}
          />
          <span
            className="truncate font-mono font-bold tracking-[0.3em]"
            style={{ color: "#3a6090", fontSize: 11 }}
          >
            {meta.label} DISPLAY
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={toggleWidePanel} className="mode-icon-button expanded-width-toggle" title={panelWidth >= 680 ? "Use standard panel width" : "Use wide panel"} aria-label={panelWidth >= 680 ? "Use standard panel width" : "Use wide panel"}>
            <MoveHorizontal size={15} />
          </button>
          {!isCalculatorDisplay && (
            <button type="button" onClick={onFullscreen} className="mode-icon-button" title={`Open ${meta.label} full screen`} aria-label={`Open ${meta.label} full screen`}>
              <Maximize2 size={14} />
            </button>
          )}
          <button type="button" onClick={onClose} className="mode-icon-button" title="Close expanded display" aria-label="Close expanded display">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Large LCD */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isCalculatorDisplay ? (
          <CasioScreen
            expression={calcState.expression}
            result={showResult ? calcState.result : ""}
            isError={calcState.isError}
            cursorPosition={calcState.cursorPosition}
            displaySize="expanded"
            modeTitle="RUN-MAT / EXPANDED"
          />
        ) : (
          <ModePanel mode={mode} />
        )}
      </div>

      {/* Footer hint */}
      <div
        className="px-5 py-2.5 shrink-0 border-t flex items-center gap-2"
        style={{ borderColor: "#1a2a40", background: "#060c14" }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#44cc88", boxShadow: "0 0 4px #44cc88" }}
        />
        <span style={{ color: "#2a4060", fontSize: 11, fontFamily: "monospace" }}>
          {isCalculatorDisplay ? "Live mirror of calculator display" : `${meta.label} workspace / maximize for full screen`}
        </span>
      </div>
    </motion.div>
  );
}

// ─── App shell content ────────────────────────────────────────────────────────
function AppShellContent() {
  const { currentMode, setMode } = useCasioStore();
  const [expandedDisplayRequested, setExpandedDisplayRequested] = useState(false);
  const [dismissedExpandedMode, setDismissedExpandedMode] = useState<CasioMode | null>(null);
  const [fullscreenMode, setFullscreenMode] = useState<CasioMode | null>(null);
  const isWorkspaceMode = currentMode !== "RUN_MAT" && currentMode !== "MENU";
  const showExpandedDisplay = expandedDisplayRequested || (isWorkspaceMode && dismissedExpandedMode !== currentMode);
  const closeExpandedDisplay = () => {
    setExpandedDisplayRequested(false);
    setDismissedExpandedMode(currentMode);
  };
  const toggleExpandedDisplay = () => {
    if (showExpandedDisplay) closeExpandedDisplay();
    else {
      setDismissedExpandedMode(null);
      setExpandedDisplayRequested(true);
    }
  };

  useEffect(() => {
    const openFullscreen = (event: Event) => {
      const requestedMode = (event as CustomEvent<CasioMode>).detail;
      setFullscreenMode(requestedMode || currentMode);
    };
    window.addEventListener("casio-fullscreen", openFullscreen);
    return () => window.removeEventListener("casio-fullscreen", openFullscreen);
  }, [currentMode]);

  return (
    <div
      className="app-shell flex h-screen w-screen overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 40%, #141c2a 0%, #0c0e14 60%, #080a10 100%)" }}
    >
      <div className="flex flex-1 overflow-hidden h-full">
        <AnimatePresence>
          {showExpandedDisplay && (
            <ExpandedDisplay
              mode={currentMode}
              onClose={closeExpandedDisplay}
              onFullscreen={() => setFullscreenMode(currentMode)}
            />
          )}
        </AnimatePresence>

        <DraggableCalculator
          showExpandedDisplay={showExpandedDisplay}
          onToggleExpandedDisplay={toggleExpandedDisplay}
        />

        <div className="desktop-info-panel flex flex-col gap-4 shrink-0 overflow-hidden" style={{ width: 320, padding: "20px 16px 20px 8px" }}>
          <InfoCard />
          <MiniHistory />
        </div>
      </div>

      <AnimatePresence>
        {fullscreenMode && fullscreenMode !== "RUN_MAT" && fullscreenMode !== "MENU" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#0d1520]"
          >
            <div className="flex items-center border-b border-[#1a2a40] bg-[#09131f] pr-3">
              <div className="flex-1">
                <ModeHeader mode={fullscreenMode} onBack={() => { setFullscreenMode(null); setMode("MENU"); }} />
              </div>
              <button type="button" onClick={() => setFullscreenMode(null)} className="mode-icon-button" title="Return to calculator display" aria-label="Return to calculator display">
                <Minimize2 size={15} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <ModePanel mode={fullscreenMode} />
              <HistorySidebar />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AppShell() {
  return (
    <CalculatorProvider>
      <AppShellContent />
    </CalculatorProvider>
  );
}
