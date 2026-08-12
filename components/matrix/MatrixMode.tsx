"use client";

import { useState, useMemo } from "react";
import { addMatrices, subtractMatrices, multiplyMatrices, transposeMatrix, determinant, inverseMatrix, rankMatrix } from "@/lib/matrix/matrix";

function parseMatrix(value: string) {
  const rows = value
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/[,\s]+/).map((cell) => Number(cell)));
  if (rows.length === 0) throw new Error("Enter at least one row");
  if (new Set(rows.map((row) => row.length)).size !== 1) throw new Error("All rows must have the same length");
  if (rows.some((row) => row.some((cell) => !Number.isFinite(cell)))) throw new Error("Every matrix cell must be a valid number");
  return rows;
}

function renderMatrix(matrix: number[][]) {
  return matrix.map((row, ri) => (
    <div key={ri} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
      {row.map((value, ci) => (
        <div key={ci} className="rounded-2xl bg-slate-950/80 px-3 py-2 text-center text-sm text-emerald-100">{Number.isFinite(value) ? value : "NaN"}</div>
      ))}
    </div>
  ));
}

export default function MatrixMode() {
  const [matrixA, setMatrixA] = useState("1 2 3\n4 5 6\n7 8 9");
  const [matrixB, setMatrixB] = useState("1 0 2\n0 1 3\n4 5 6");
  const [operation, setOperation] = useState("add");
  const [result, setResult] = useState<number[][] | number | null>(null);
  const [error, setError] = useState("");

  const resultLabel = useMemo(() => {
    switch (operation) {
      case "add": return "A + B";
      case "subtract": return "A - B";
      case "multiply": return "A × B";
      case "transpose": return "Transpose A";
      case "determinant": return "Determinant A";
      case "inverse": return "Inverse A";
      case "rank": return "Rank A";
      default: return "Result";
    }
  }, [operation]);

  const compute = () => {
    try {
      setError("");
      const a = parseMatrix(matrixA);
      const b = parseMatrix(matrixB);
      let output: number[][] | number;
      switch (operation) {
        case "add": output = addMatrices(a, b); break;
        case "subtract": output = subtractMatrices(a, b); break;
        case "multiply": output = multiplyMatrices(a, b); break;
        case "transpose": output = transposeMatrix(a); break;
        case "determinant": output = determinant(a); break;
        case "inverse": output = inverseMatrix(a); break;
        case "rank": output = rankMatrix(a); break;
        default: output = [];
      }
      setResult(output);
    } catch (err: unknown) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Invalid matrix input");
    }
  };

  return (
    <div className="grid h-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-slate-800/80 bg-[#09110d] p-6 shadow-[inset_0_0_30px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Matrix Mode</h2>
            <p className="mt-1 text-sm text-slate-400">Matrix tools for linear algebra.</p>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-3 py-2 text-xs uppercase tracking-[0.3em] text-emerald-200">Phase 4</span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-200">Matrix A</label>
            <textarea
              value={matrixA}
              onChange={(e) => setMatrixA(e.target.value)}
              className="mt-2 h-40 w-full rounded-3xl border border-slate-700/60 bg-slate-950/90 px-4 py-3 font-mono text-sm text-slate-100 outline-none focus:border-emerald-400/70"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-200">Matrix B</label>
            <textarea
              value={matrixB}
              onChange={(e) => setMatrixB(e.target.value)}
              className="mt-2 h-40 w-full rounded-3xl border border-slate-700/60 bg-slate-950/90 px-4 py-3 font-mono text-sm text-slate-100 outline-none focus:border-sky-400/70"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { id: "add", label: "Add" },
            { id: "subtract", label: "Subtract" },
            { id: "multiply", label: "Multiply" },
            { id: "transpose", label: "Transpose" },
            { id: "determinant", label: "Determinant" },
            { id: "inverse", label: "Inverse" },
            { id: "rank", label: "Rank" },
          ].map((button) => (
            <button
              key={button.id}
              type="button"
              onClick={() => setOperation(button.id)}
              className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${operation === button.id ? "bg-emerald-500 text-slate-950" : "bg-slate-900/90 text-slate-200 hover:bg-slate-800"}`}
            >
              {button.label}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={compute}
            className="rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.22)] transition hover:opacity-95"
          >
            Compute
          </button>
          <span className="text-sm text-slate-400">Result: {resultLabel}</span>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-700/60 bg-slate-950/90 p-4 text-slate-200">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Output</div>
          {error ? (
            <div className="mt-4 rounded-3xl bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
          ) : result === null ? (
            <div className="mt-4 text-sm text-slate-500">No computation yet.</div>
          ) : typeof result === "number" ? (
            <div className="mt-4 rounded-3xl bg-[#07120d] p-4 text-2xl font-semibold text-emerald-200">{result}</div>
          ) : (
            <div className="mt-4 space-y-2">{renderMatrix(result)}</div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-[#081115] p-6 shadow-[inset_0_0_30px_rgba(0,0,0,0.35)]">
        <div className="text-sm uppercase tracking-[0.3em] text-slate-500">Matrix Help</div>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <p>Use spaces or commas to separate values, and separate rows with line breaks.</p>
          <p>Matrix B is only required for add, subtract and multiply operations.</p>
          <p>A should be square for determinant, inverse and rank computations.</p>
        </div>
        <div className="mt-6 rounded-3xl border border-slate-700/50 bg-slate-900/90 p-4 text-sm text-emerald-200">
          <div className="font-semibold">Example</div>
          <pre className="mt-3 whitespace-pre-wrap font-mono text-[13px] text-slate-100">1 2 3
4 5 6
7 8 9</pre>
        </div>
      </div>
    </div>
  );
}
