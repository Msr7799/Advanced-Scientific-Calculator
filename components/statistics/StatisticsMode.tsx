"use client";

import { useMemo, useState } from "react";
import jStat from "jstat";
import { useCasioFKeys } from "@/lib/keyboard/useCasioFKeys";
import { useCasioStore } from "@/store/calculatorStore";

// ─── Parsing helpers ─────────────────────────────────────────────────────────
function parseSeries(value: string): number[] {
  const values = value.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
  if (values.some((entry) => !Number.isFinite(entry))) throw new Error("All entries must be valid numbers");
  return values;
}

// ─── Descriptive statistics using jStat ──────────────────────────────────────
function describe(data: number[]) {
  if (data.length < 2) throw new Error("Need at least 2 values");
  const sorted = [...data].sort((a, b) => a - b);
  const q = jStat.quartiles(sorted);
  return {
    n: data.length,
    mean:    jStat.mean(data),
    median:  jStat.median(data),
    variance:jStat.variance(data, true),
    stdDev:  jStat.stdev(data, true),
    min:     jStat.min(data),
    max:     jStat.max(data),
    range:   jStat.range(data),
    q1: q[0], q2: q[1], q3: q[2],
    iqr: q[2] - q[0],
    sum: jStat.sum(data),
  };
}

function linearRegression(xs: number[], ys: number[]) {
  if (xs.length !== ys.length || xs.length < 2) throw new Error("X and Y must have equal length ≥ 2");
  const xMean = jStat.mean(xs);
  const yMean = jStat.mean(ys);
  const cov = jStat.covariance(xs, ys);
  const varX = jStat.variance(xs, true);
  if (!Number.isFinite(varX) || Math.abs(varX) < Number.EPSILON) throw new Error("Regression requires distinct X values");
  const slope = cov / varX;
  const intercept = yMean - slope * xMean;
  const r = jStat.corrcoeff(xs, ys);
  return {
    slope, intercept, r, r2: r * r,
    equation: `y = ${slope.toFixed(4)}x ${intercept >= 0 ? "+" : "−"} ${Math.abs(intercept).toFixed(4)}`,
    predicted: xs.map((x) => slope * x + intercept),
  };
}

// ─── Histogram SVG ────────────────────────────────────────────────────────────
function Histogram({ data, color = "#4488e0" }: { data: number[]; color?: string }) {
  const W = 300, H = 120;
  if (data.length < 2) return null;
  const bins = 8;
  const min = Math.min(...data), max = Math.max(...data);
  const binWidth = (max - min) / bins || 1;
  const counts = Array(bins).fill(0);
  for (const v of data) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    counts[idx]++;
  }
  const maxCount = Math.max(...counts);
  const bw = W / bins;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      <rect width={W} height={H} fill="#080e18" />
      {counts.map((count, i) => {
        const barH = maxCount > 0 ? (count / maxCount) * (H - 16) : 0;
        return (
          <rect
            key={i}
            x={i * bw + 1}
            y={H - barH - 1}
            width={bw - 2}
            height={barH}
            fill={color}
            opacity="0.75"
            rx="1"
          />
        );
      })}
      {/* Axis */}
      <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="#2a4060" strokeWidth="1" />
    </svg>
  );
}

// ─── Scatter plot SVG ─────────────────────────────────────────────────────────
function ScatterPlot({ xs, ys, regression }: {
  xs: number[]; ys: number[];
  regression: { slope: number; intercept: number; predicted: number[] } | null;
}) {
  const W = 300, H = 140;
  if (xs.length < 2) return null;
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const pad = 16;
  const scaleX = (x: number) => pad + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * pad);
  const scaleY = (y: number) => H - pad - ((y - yMin) / (yMax - yMin || 1)) * (H - 2 * pad);

  const regPath = regression
    ? `M ${scaleX(xMin).toFixed(1)} ${scaleY(regression.slope * xMin + regression.intercept).toFixed(1)} L ${scaleX(xMax).toFixed(1)} ${scaleY(regression.slope * xMax + regression.intercept).toFixed(1)}`
    : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
      <rect width={W} height={H} fill="#080e18" />
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#2a4060" strokeWidth="0.5" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="#2a4060" strokeWidth="0.5" />

      {regPath && (
        <path d={regPath} stroke="#ff9944" strokeWidth="1.5" fill="none" opacity="0.8" strokeDasharray="4 2" />
      )}

      {xs.map((x, i) => (
        <circle key={i} cx={scaleX(x)} cy={scaleY(ys[i])} r="3" fill="#4488e0" opacity="0.85" />
      ))}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StatisticsMode() {
  const setMode = useCasioStore((state) => state.setMode);
  const [dataset, setDataset] = useState("12 7 9 15 6 10 8 11 14 5");
  const [xs, setXs] = useState("1 2 3 4 5 6");
  const [ys, setYs] = useState("2.1 3.9 6.2 8.0 9.8 11.9");
  const [tab, setTab] = useState<"1var" | "regression">("1var");

  const parsed = useMemo(() => { try { return parseSeries(dataset); } catch { return []; } }, [dataset]);
  const parsedXs = useMemo(() => { try { return parseSeries(xs); } catch { return []; } }, [xs]);
  const parsedYs = useMemo(() => { try { return parseSeries(ys); } catch { return []; } }, [ys]);

  const summary = useMemo(() => {
    try { return describe(parsed); } catch { return null; }
  }, [parsed]);

  const reg = useMemo(() => {
    try { return linearRegression(parsedXs, parsedYs); } catch { return null; }
  }, [parsedXs, parsedYs]);

  const STAT_FIELDS = summary
    ? [
        ["n",    summary.n],
        ["x̄",   summary.mean.toFixed(4)],
        ["med",  summary.median.toFixed(4)],
        ["σn",   summary.stdDev.toFixed(4)],
        ["σn-1", Math.sqrt(jStat.variance(parsed, false)).toFixed(4)],
        ["Σx",   summary.sum.toFixed(4)],
        ["min",  summary.min],
        ["max",  summary.max],
        ["Q1",   summary.q1.toFixed(4)],
        ["Q3",   summary.q3.toFixed(4)],
        ["IQR",  summary.iqr.toFixed(4)],
        ["range",summary.range],
      ]
    : [];

  const bg = "#0a1220", border = "#1a2840", card = "#080e18";

  useCasioFKeys([
    () => setTab("1var"),
    () => setTab("regression"),
    () => setTab("1var"),
    () => setMode("GRAPH"),
    () => setTab("1var"),
    () => setMode("GRAPH"),
  ]);

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ background: bg }}>
     <div className="mode-responsive-split flex min-h-0 flex-1 overflow-hidden">
      {/* ── Left: inputs + tabs ─────────────────────── */}
      <div className="w-56 shrink-0 flex flex-col border-r overflow-hidden" style={{ borderColor: border, background: card }}>
        {/* Tabs */}
        <div className="grid grid-cols-2 border-b shrink-0" style={{ borderColor: border }}>
          {(["1var", "regression"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="py-2 text-[10px] font-bold tracking-wider transition-all"
              style={{
                color: tab === t ? "#70a8e0" : "#2a4060",
                borderBottom: tab === t ? "2px solid #4488c0" : "2px solid transparent",
                background: tab === t ? "#0a1828" : "transparent",
              }}
            >
              {t === "1var" ? "1-VAR" : "REGR"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto panel-scroll p-3 space-y-3">
          {tab === "1var" ? (
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] text-[#406080]">Data (space/comma separated)</span>
              <textarea
                value={dataset}
                onChange={(e) => setDataset(e.target.value)}
                rows={5}
                className="rounded px-2 py-2 text-[11px] font-mono resize-none"
                style={{ background: "#060c14", border: `1px solid ${border}`, color: "#80b8e8", outline: "none" }}
              />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-[#406080]">X values</span>
                <input
                  value={xs}
                  onChange={(e) => setXs(e.target.value)}
                  className="rounded px-2 py-1.5 text-[11px] font-mono"
                  style={{ background: "#060c14", border: `1px solid ${border}`, color: "#80b8e8", outline: "none" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-[#406080]">Y values</span>
                <input
                  value={ys}
                  onChange={(e) => setYs(e.target.value)}
                  className="rounded px-2 py-1.5 text-[11px] font-mono"
                  style={{ background: "#060c14", border: `1px solid ${border}`, color: "#80b8e8", outline: "none" }}
                />
              </label>
            </>
          )}
        </div>
      </div>

      {/* ── Right: results + charts ─────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {tab === "1var" ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Stats table */}
            <div className="flex-1 overflow-y-auto panel-scroll p-3">
              <div className="text-[9px] font-bold tracking-[0.25em] mb-2" style={{ color: "#2a4060" }}>
                DESCRIPTIVE STATISTICS
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {STAT_FIELDS.map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-lg px-2 py-2"
                    style={{ background: "#080e18", border: `1px solid ${border}` }}
                  >
                    <div className="text-[9px] font-mono" style={{ color: "#3a5878" }}>{label}</div>
                    <div className="text-[12px] font-mono font-bold mt-0.5" style={{ color: "#80c8ff" }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Histogram */}
            <div className="w-52 shrink-0 border-l p-3 flex flex-col gap-3" style={{ borderColor: border }}>
              <div className="text-[9px] font-bold tracking-[0.25em]" style={{ color: "#2a4060" }}>HISTOGRAM</div>
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: border }}>
                <Histogram data={parsed} color="#4488e0" />
              </div>
              <div className="text-[8px] space-y-0.5" style={{ color: "#2a3a50" }}>
                <div>n = {parsed.length}</div>
                {summary && (
                  <>
                    <div>σ = {summary.stdDev.toFixed(3)}</div>
                    <div>IQR = {summary.iqr.toFixed(3)}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Regression results */}
            <div className="flex-1 overflow-y-auto panel-scroll p-3 space-y-3">
              <div className="text-[9px] font-bold tracking-[0.25em]" style={{ color: "#2a4060" }}>
                LINEAR REGRESSION
              </div>

              {reg ? (
                <>
                  {/* Equation */}
                  <div className="rounded-lg px-3 py-2.5" style={{ background: "#080e18", border: `1px solid ${border}` }}>
                    <div className="text-[9px]" style={{ color: "#3a5878" }}>EQUATION</div>
                    <div className="text-[13px] font-mono font-bold mt-1" style={{ color: "#44cc88" }}>
                      {reg.equation}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      ["Slope (a)",     reg.slope.toFixed(5)],
                      ["Intercept (b)", reg.intercept.toFixed(5)],
                      ["r",             reg.r.toFixed(5)],
                      ["r²",            reg.r2.toFixed(5)],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-lg px-2 py-2" style={{ background: "#080e18", border: `1px solid ${border}` }}>
                        <div className="text-[9px] font-mono" style={{ color: "#3a5878" }}>{label}</div>
                        <div className="text-[12px] font-mono font-bold mt-0.5" style={{ color: "#80c8ff" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-[11px]" style={{ color: "#2a3a50" }}>
                  Enter equal-length X and Y series to compute regression.
                </div>
              )}
            </div>

            {/* Scatter plot */}
            <div className="w-56 shrink-0 border-l p-3 flex flex-col gap-3" style={{ borderColor: border }}>
              <div className="text-[9px] font-bold tracking-[0.25em]" style={{ color: "#2a4060" }}>SCATTER PLOT</div>
              <div className="rounded-lg overflow-hidden border" style={{ borderColor: border }}>
                <ScatterPlot xs={parsedXs} ys={parsedYs} regression={reg} />
              </div>
              {reg && (
                <div className="text-[8px] space-y-0.5" style={{ color: "#2a3a50" }}>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-[#ff9944]" style={{ borderTop: "1px dashed #ff9944" }} />
                    <span>Regression line</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
     </div>
      <div className="grid h-9 shrink-0 grid-cols-6 border-t border-[#29425f] bg-[#0b1727]">
        <button type="button" onClick={() => setTab("1var")} className={`mode-softkey ${tab === "1var" ? "mode-softkey-active" : ""}`}>1-VAR</button>
        <button type="button" onClick={() => setTab("regression")} className={`mode-softkey ${tab === "regression" ? "mode-softkey-active" : ""}`}>REGR</button>
        <button type="button" onClick={() => setTab("1var")} className="mode-softkey">CALC</button>
        <button type="button" onClick={() => setMode("GRAPH")} className="mode-softkey">GRAPH</button>
        <button type="button" onClick={() => setTab("1var")} className="mode-softkey">SET</button>
        <button type="button" onClick={() => setMode("GRAPH")} className="mode-softkey">DRAW</button>
      </div>
    </div>
  );
}
