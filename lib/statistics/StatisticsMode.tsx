"use client";

import { useMemo, useState } from "react";
import { describe, histogramBins, linearRegression, quadraticRegression } from "@/lib/statistics/statistics";

function parseList(input: string): number[] {
  return input
    .split(/[,\s\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-900/70 px-3 py-1.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="font-mono text-sm text-white">{value}</span>
    </div>
  );
}

function Histogram({ data }: { data: number[] }) {
  const bins = useMemo(() => histogramBins(data, Math.min(12, Math.max(4, Math.round(Math.sqrt(data.length))))), [data]);
  const maxCount = Math.max(...bins.map((b) => b.count), 1);

  return (
    <div className="flex h-40 items-end gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      {bins.map((bin, i) => (
        <div key={i} className="group relative flex-1">
          <div
            className="w-full rounded-t bg-sky-500/70 transition-all group-hover:bg-sky-400"
            style={{ height: `${(bin.count / maxCount) * 100}%`, minHeight: bin.count > 0 ? 2 : 0 }}
          />
          <div className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
            {bin.count}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StatisticsMode() {
  const [tab, setTab] = useState<"one" | "two">("one");
  const [rawX, setRawX] = useState("2, 4, 4, 4, 5, 5, 7, 9");
  const [rawY, setRawY] = useState("1, 2.1, 2.9, 4.2, 5.1, 6.3, 6.8, 8.9");
  const [regressionType, setRegressionType] = useState<"linear" | "quadratic">("linear");

  const xs = useMemo(() => parseList(rawX), [rawX]);
  const ys = useMemo(() => parseList(rawY), [rawY]);

  const stats = useMemo(() => {
    try {
      return xs.length > 0 ? describe(xs) : null;
    } catch {
      return null;
    }
  }, [xs]);

  const regression = useMemo(() => {
    if (xs.length < 2 || xs.length !== ys.length) return null;
    try {
      return regressionType === "linear" ? linearRegression(xs, ys) : quadraticRegression(xs, ys);
    } catch {
      return null;
    }
  }, [xs, ys, regressionType]);

  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      <div className="flex gap-2">
        {(["one", "two"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              tab === t ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {t === "one" ? "1-Variable" : "2-Variable Regression"}
          </button>
        ))}
      </div>

      {tab === "one" ? (
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto panel-scroll lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <label className="text-xs uppercase tracking-[0.25em] text-slate-500">Data (comma or space separated)</label>
            <textarea
              value={rawX}
              onChange={(e) => setRawX(e.target.value)}
              className="min-h-[100px] rounded-2xl border border-slate-700 bg-slate-950/80 p-3 font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
            />
            {stats && <Histogram data={xs} />}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="mb-1 text-xs uppercase tracking-[0.25em] text-slate-500">Results (n = {stats?.n ?? 0})</span>
            {stats ? (
              <>
                <StatRow label="Mean (x̄)" value={stats.mean.toFixed(4)} />
                <StatRow label="Median" value={stats.median.toFixed(4)} />
                <StatRow label="Mode" value={stats.mode.length ? stats.mode.join(", ") : "none"} />
                <StatRow label="Min / Max" value={`${stats.min} / ${stats.max}`} />
                <StatRow label="Range" value={stats.range.toFixed(4)} />
                <StatRow label="Population Variance (σ²)" value={stats.variance.toFixed(4)} />
                <StatRow label="Population Std Dev (σ)" value={stats.stdDev.toFixed(4)} />
                <StatRow label="Sample Variance (s²)" value={stats.sampleVariance.toFixed(4)} />
                <StatRow label="Sample Std Dev (s)" value={stats.sampleStdDev.toFixed(4)} />
                <StatRow label="Q1 / Q3" value={`${stats.q1.toFixed(3)} / ${stats.q3.toFixed(3)}`} />
                <StatRow label="IQR" value={stats.iqr.toFixed(4)} />
                <StatRow label="Sum" value={stats.sum.toFixed(4)} />
              </>
            ) : (
              <div className="text-sm text-slate-500">Enter at least one number.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto panel-scroll lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <label className="text-xs uppercase tracking-[0.25em] text-slate-500">X values</label>
            <textarea
              value={rawX}
              onChange={(e) => setRawX(e.target.value)}
              className="min-h-[80px] rounded-2xl border border-slate-700 bg-slate-950/80 p-3 font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
            />
            <label className="text-xs uppercase tracking-[0.25em] text-slate-500">Y values</label>
            <textarea
              value={rawY}
              onChange={(e) => setRawY(e.target.value)}
              className="min-h-[80px] rounded-2xl border border-slate-700 bg-slate-950/80 p-3 font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
            />
            <div className="flex gap-2">
              {(["linear", "quadratic"] as const).map((rt) => (
                <button
                  key={rt}
                  onClick={() => setRegressionType(rt)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    regressionType === rt ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {rt}
                </button>
              ))}
            </div>
            {xs.length !== ys.length && (
              <div className="rounded-lg bg-amber-950/50 p-2 text-xs text-amber-300">
                X and Y must have the same number of values (currently {xs.length} vs {ys.length}).
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="mb-1 text-xs uppercase tracking-[0.25em] text-slate-500">Fit</span>
            {regression ? (
              <>
                <div className="rounded-xl border border-sky-700/50 bg-sky-950/30 p-3 font-mono text-sm text-sky-200">
                  {regression.equation}
                </div>
                {"r2" in regression && (
                  <>
                    <StatRow label="Correlation (r)" value={regression.r.toFixed(6)} />
                    <StatRow label="R²" value={regression.r2.toFixed(6)} />
                  </>
                )}
                <RegressionPlot xs={xs} ys={ys} predict={"predict" in regression ? regression.predict : (x: number) => regression.a * x * x + regression.b * x + regression.c} />
              </>
            ) : (
              <div className="text-sm text-slate-500">Enter matching paired data (at least 2 points for linear, 3 for quadratic).</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RegressionPlot({ xs, ys, predict }: { xs: number[]; ys: number[]; predict: (x: number) => number }) {
  const width = 320;
  const height = 200;
  const pad = 24;
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;

  const toPx = (x: number, y: number) => ({
    px: pad + ((x - xMin) / xSpan) * (width - pad * 2),
    py: height - pad - ((y - yMin) / ySpan) * (height - pad * 2),
  });

  const linePoints = [xMin, xMax].map((x) => toPx(x, predict(x)));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-xl border border-slate-800 bg-slate-950/60">
      <line x1={linePoints[0].px} y1={linePoints[0].py} x2={linePoints[1].px} y2={linePoints[1].py} stroke="#38bdf8" strokeWidth={2} />
      {xs.map((x, i) => {
        const { px, py } = toPx(x, ys[i]);
        return <circle key={i} cx={px} cy={py} r={3.5} fill="#f97316" />;
      })}
    </svg>
  );
}
