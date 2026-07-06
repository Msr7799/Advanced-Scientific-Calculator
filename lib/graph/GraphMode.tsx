"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildSeries, PlotSeries } from "@/lib/graph/functionPlotter";

const COLORS = ["#38bdf8", "#f97316", "#a78bfa", "#34d399", "#f472b6", "#facc15"];

interface FunctionEntry {
  id: string;
  expression: string;
  color: string;
  visible: boolean;
}

interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const DEFAULT_VIEWPORT: Viewport = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };

function niceStep(range: number, targetTicks = 10): number {
  const rough = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / magnitude;
  let niceResidual: number;
  if (residual > 5) niceResidual = 10;
  else if (residual > 2) niceResidual = 5;
  else if (residual > 1) niceResidual = 2;
  else niceResidual = 1;
  return niceResidual * magnitude;
}

export default function GraphMode() {
  const [functions, setFunctions] = useState<FunctionEntry[]>([
    { id: "f1", expression: "sin(x)", color: COLORS[0], visible: true },
    { id: "f2", expression: "x^2/4 - 2", color: COLORS[1], visible: true },
  ]);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
  const [hover, setHover] = useState<{ x: number; ys: (number | null)[] } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ startX: number; startY: number; viewport: Viewport } | null>(null);

  const series: PlotSeries[] = useMemo(() => {
    const active = functions.filter((f) => f.visible);
    return buildSeries(
      active.map((f) => ({ id: f.id, expression: f.expression, color: f.color })),
      viewport.xMin,
      viewport.xMax,
      600
    );
  }, [functions, viewport]);

  const toPixel = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const px = ((x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * width;
      const py = height - ((y - viewport.yMin) / (viewport.yMax - viewport.yMin)) * height;
      return { px, py };
    },
    [viewport]
  );

  const toData = useCallback(
    (px: number, py: number, width: number, height: number) => {
      const x = viewport.xMin + (px / width) * (viewport.xMax - viewport.xMin);
      const y = viewport.yMin + ((height - py) / height) * (viewport.yMax - viewport.yMin);
      return { x, y };
    },
    [viewport]
  );

  // ─── Render ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "#0b0e15";
    ctx.fillRect(0, 0, width, height);

    // Grid
    const xStep = niceStep(viewport.xMax - viewport.xMin);
    const yStep = niceStep(viewport.yMax - viewport.yMin);
    ctx.strokeStyle = "rgba(148,163,184,0.12)";
    ctx.lineWidth = 1;
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(148,163,184,0.6)";

    const firstX = Math.ceil(viewport.xMin / xStep) * xStep;
    for (let x = firstX; x <= viewport.xMax; x += xStep) {
      const { px } = toPixel(x, 0, width, height);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
      if (Math.abs(x) > xStep / 100) {
        ctx.fillText(x.toFixed(Math.abs(x) < 1 ? 2 : 0), px + 3, height / 2 + 12);
      }
    }
    const firstY = Math.ceil(viewport.yMin / yStep) * yStep;
    for (let y = firstY; y <= viewport.yMax; y += yStep) {
      const { py } = toPixel(0, y, width, height);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
      ctx.stroke();
      if (Math.abs(y) > yStep / 100) {
        ctx.fillText(y.toFixed(Math.abs(y) < 1 ? 2 : 0), width / 2 + 4, py - 3);
      }
    }

    // Axes
    ctx.strokeStyle = "rgba(226,232,240,0.55)";
    ctx.lineWidth = 1.5;
    const origin = toPixel(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(0, origin.py);
    ctx.lineTo(width, origin.py);
    ctx.moveTo(origin.px, 0);
    ctx.lineTo(origin.px, height);
    ctx.stroke();

    // Series
    for (const s of series) {
      if (s.error) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let drawing = false;
      for (const point of s.points) {
        if (point.y === null || !Number.isFinite(point.y) || point.y < viewport.yMin - (viewport.yMax - viewport.yMin) || point.y > viewport.yMax + (viewport.yMax - viewport.yMin)) {
          drawing = false;
          continue;
        }
        const { px, py } = toPixel(point.x, point.y, width, height);
        if (!drawing) {
          ctx.moveTo(px, py);
          drawing = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    // Hover crosshair
    if (hover) {
      const { px } = toPixel(hover.x, 0, width, height);
      ctx.strokeStyle = "rgba(226,232,240,0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
      ctx.stroke();
      ctx.setLineDash([]);
      hover.ys.forEach((y, i) => {
        if (y === null) return;
        const { px: hx, py: hy } = toPixel(hover.x, y, width, height);
        ctx.fillStyle = series[i]?.color ?? "#fff";
        ctx.beginPath();
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [series, viewport, hover, toPixel]);

  // ─── Interaction: pan ───────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, viewport };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (dragState.current) {
      const dxPx = e.clientX - dragState.current.startX;
      const dyPx = e.clientY - dragState.current.startY;
      const { xMin, xMax, yMin, yMax } = dragState.current.viewport;
      const dx = (dxPx / width) * (xMax - xMin);
      const dy = (dyPx / height) * (yMax - yMin);
      setViewport({
        xMin: xMin - dx,
        xMax: xMax - dx,
        yMin: yMin + dy,
        yMax: yMax + dy,
      });
      return;
    }

    const px = e.clientX - rect.left;
    const { x } = toData(px, 0, width, height);
    const ys = series.map((s) => {
      if (s.points.length === 0) return null;
      let nearest = s.points[0];
      for (const p of s.points) {
        if (Math.abs(p.x - x) < Math.abs(nearest.x - x)) nearest = p;
      }
      return nearest.y;
    });
    setHover({ x, ys });
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const cx = (viewport.xMin + viewport.xMax) / 2;
    const cy = (viewport.yMin + viewport.yMax) / 2;
    const halfW = ((viewport.xMax - viewport.xMin) / 2) * zoomFactor;
    const halfH = ((viewport.yMax - viewport.yMin) / 2) * zoomFactor;
    setViewport({ xMin: cx - halfW, xMax: cx + halfW, yMin: cy - halfH, yMax: cy + halfH });
  };

  const updateExpression = (id: string, expression: string) => {
    setFunctions((prev) => prev.map((f) => (f.id === id ? { ...f, expression } : f)));
  };

  const toggleVisible = (id: string) => {
    setFunctions((prev) => prev.map((f) => (f.id === id ? { ...f, visible: !f.visible } : f)));
  };

  const removeFunction = (id: string) => {
    setFunctions((prev) => prev.filter((f) => f.id !== id));
  };

  const addFunction = () => {
    const usedColors = new Set(functions.map((f) => f.color));
    const color = COLORS.find((c) => !usedColors.has(c)) ?? COLORS[functions.length % COLORS.length];
    setFunctions((prev) => [...prev, { id: `f${Date.now()}`, expression: "", color, visible: true }]);
  };

  const resetView = () => setViewport(DEFAULT_VIEWPORT);

  return (
    <div className="flex h-full w-full gap-3 p-3">
      {/* Function list */}
      <div className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Functions</span>
          <button
            type="button"
            onClick={addFunction}
            className="rounded-lg bg-sky-600/80 px-2 py-1 text-xs font-semibold text-white hover:bg-sky-500"
          >
            + Add
          </button>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto panel-scroll">
          {functions.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-2 py-1.5">
              <button
                type="button"
                onClick={() => toggleVisible(f.id)}
                className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                style={{ background: f.visible ? f.color : "transparent" }}
                aria-label="toggle visibility"
              />
              <span className="text-xs text-slate-500">y=</span>
              <input
                value={f.expression}
                onChange={(e) => updateExpression(f.id, e.target.value)}
                placeholder="e.g. sin(x)"
                className="min-w-0 flex-1 bg-transparent text-sm font-mono text-slate-100 outline-none placeholder-slate-600"
              />
              <button
                type="button"
                onClick={() => removeFunction(f.id)}
                className="text-slate-600 hover:text-red-400"
                aria-label="remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {series.some((s) => s.error) && (
          <div className="rounded-lg bg-red-950/60 p-2 text-[11px] text-red-300">
            {series.find((s) => s.error)?.error}
          </div>
        )}
        <button
          type="button"
          onClick={resetView}
          className="mt-auto rounded-lg border border-slate-700 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
        >
          Reset View
        </button>
        <div className="text-[10px] leading-relaxed text-slate-600">
          Drag to pan · scroll/pinch to zoom · hover to trace
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-800">
        <canvas
          ref={canvasRef}
          className="h-full w-full cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => setHover(null)}
          onWheel={handleWheel}
        />
        {hover && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-[11px] font-mono text-slate-200">
            <div>x = {hover.x.toFixed(3)}</div>
            {hover.ys.map((y, i) => (
              <div key={i} style={{ color: series[i]?.color }}>
                y{i + 1} = {y === null ? "—" : y.toFixed(3)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
