"use client";

import { useState, useMemo } from "react";
import { calculate } from "@/lib/math/engine";

interface TableRow {
  x: number;
  y: number | string;
}

export default function TableMode() {
  const [expression, setExpression] = useState("x^2");
  const [xStart, setXStart] = useState("-5");
  const [xEnd, setXEnd] = useState("5");
  const [xStep, setXStep] = useState("1");
  const [error, setError] = useState("");

  const rows = useMemo<TableRow[]>(() => {
    const start = parseFloat(xStart);
    const end   = parseFloat(xEnd);
    const step  = parseFloat(xStep);

    if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(step) || step <= 0) {
      setError("Invalid range or step");
      return [];
    }
    if (end < start) { setError("End must be ≥ Start"); return []; }
    if ((end - start) / step > 200) { setError("Too many rows (max 200)"); return []; }

    setError("");
    const out: TableRow[] = [];
    for (let x = start; x <= end + 1e-9; x = Math.round((x + step) * 1e10) / 1e10) {
      let y: number | string;
      try {
        const res = calculate(expression, { x }).result;
        const num = Number(res);
        y = Number.isFinite(num) ? parseFloat(num.toPrecision(10)) : "ERROR";
      } catch {
        y = "ERROR";
      }
      out.push({ x: parseFloat(x.toPrecision(10)), y });
    }
    return out;
  }, [expression, xStart, xEnd, xStep]);

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#0a1220" }}>
      {/* Controls */}
      <div
        className="w-56 shrink-0 flex flex-col gap-3 p-4 border-r overflow-y-auto panel-scroll"
        style={{ borderColor: "#1a2a40" }}
      >
        <div className="text-[10px] font-bold tracking-[0.25em] text-[#3a5878]">TABLE SETTINGS</div>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-[#406080]">f(x) =</span>
          <input
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            className="rounded px-2 py-1.5 text-[12px] font-mono text-white"
            style={{ background: "#0d1828", border: "1px solid #1e3050", outline: "none" }}
            placeholder="x^2"
          />
        </label>

        {[
          { label: "X Start", value: xStart, set: setXStart },
          { label: "X End",   value: xEnd,   set: setXEnd   },
          { label: "X Step",  value: xStep,  set: setXStep  },
        ].map(({ label, value, set }) => (
          <label key={label} className="flex flex-col gap-1">
            <span className="text-[10px] text-[#406080]">{label}</span>
            <input
              value={value}
              onChange={(e) => set(e.target.value)}
              className="rounded px-2 py-1.5 text-[12px] font-mono text-white"
              style={{ background: "#0d1828", border: "1px solid #1e3050", outline: "none" }}
            />
          </label>
        ))}

        {error && (
          <div className="text-[10px] rounded px-2 py-1.5" style={{ background: "#2a0a0a", color: "#e06060", border: "1px solid #5a2020" }}>
            {error}
          </div>
        )}

        <div className="text-[9px] text-[#2a3a50] mt-2">
          Use <span className="text-[#3a5878]">x</span> in the expression.<br />
          Example: <span className="text-[#3a5878]">sin(x)</span>, <span className="text-[#3a5878]">x^2+1</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto panel-scroll p-2">
        <table className="w-full text-[12px] font-mono border-collapse">
          <thead>
            <tr style={{ borderBottom: "1px solid #1e3050" }}>
              <th className="px-4 py-2 text-left text-[10px] tracking-widest" style={{ color: "#3a5878" }}>X</th>
              <th className="px-4 py-2 text-right text-[10px] tracking-widest" style={{ color: "#3a78a8" }}>
                f(X) = {expression}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: "1px solid #0e1c2e",
                  background: i % 2 === 0 ? "#080e18" : "#0a1220",
                }}
              >
                <td className="px-4 py-1.5 text-left" style={{ color: "#60a8e0" }}>{row.x}</td>
                <td
                  className="px-4 py-1.5 text-right font-bold"
                  style={{ color: typeof row.y === "string" ? "#e06060" : "#c8e8ff" }}
                >
                  {row.y.toString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && !error && (
          <div className="text-center text-[11px] text-[#2a3a50] py-8">
            Enter a valid expression and range to generate a table.
          </div>
        )}
      </div>
    </div>
  );
}
