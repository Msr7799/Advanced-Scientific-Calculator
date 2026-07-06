"use client";

import { useMemo, useState } from "react";
import {
  addMatrices,
  cofactorMatrix,
  determinant,
  identityMatrix,
  inverseMatrix,
  Matrix,
  multiplyMatrices,
  rankMatrix,
  scalarMultiply,
  subtractMatrices,
  transposeMatrix,
} from "@/lib/matrix/matrix";

type Operation = "add" | "subtract" | "multiply" | "detA" | "inverseA" | "transposeA" | "rankA" | "cofactorA" | "scalarA" | "identity";

function makeGrid(rows: number, cols: number, fill = 0): Matrix {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

function MatrixGrid({
  label,
  matrix,
  onChange,
  onResize,
  editable = true,
}: {
  label: string;
  matrix: Matrix;
  onChange?: (row: number, col: number, value: number) => void;
  onResize?: (rows: number, cols: number) => void;
  editable?: boolean;
}) {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</span>
        {onResize && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <input
              type="number"
              min={1}
              max={6}
              value={rows}
              onChange={(e) => onResize(Number(e.target.value) || 1, cols)}
              className="w-10 rounded bg-slate-800 px-1 py-0.5 text-center text-slate-200"
            />
            ×
            <input
              type="number"
              min={1}
              max={6}
              value={cols}
              onChange={(e) => onResize(rows, Number(e.target.value) || 1)}
              className="w-10 rounded bg-slate-800 px-1 py-0.5 text-center text-slate-200"
            />
          </div>
        )}
      </div>
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {matrix.map((row, r) =>
          row.map((value, c) => (
            <input
              key={`${r}-${c}`}
              type="number"
              value={value}
              readOnly={!editable}
              onChange={(e) => onChange?.(r, c, Number(e.target.value) || 0)}
              className="h-9 w-14 rounded-lg border border-slate-700 bg-slate-900/80 text-center font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function MatrixMode() {
  const [a, setA] = useState<Matrix>([[1, 2], [3, 4]]);
  const [b, setB] = useState<Matrix>([[5, 6], [7, 8]]);
  const [scalar, setScalar] = useState(2);
  const [operation, setOperation] = useState<Operation>("multiply");

  const setCell = (target: "a" | "b") => (row: number, col: number, value: number) => {
    const setter = target === "a" ? setA : setB;
    setter((prev) => prev.map((r, ri) => (ri === row ? r.map((v, ci) => (ci === col ? value : v)) : r)));
  };

  const resize = (target: "a" | "b") => (rows: number, cols: number) => {
    const setter = target === "a" ? setA : setB;
    setter((prev) => {
      const next = makeGrid(rows, cols);
      for (let r = 0; r < Math.min(rows, prev.length); r++) {
        for (let c = 0; c < Math.min(cols, prev[0]?.length ?? 0); c++) {
          next[r][c] = prev[r][c];
        }
      }
      return next;
    });
  };

  type MatrixResult =
    | { kind: "matrix"; matrix: Matrix }
    | { kind: "scalar"; scalar: number }
    | { kind: "error"; message: string }
    | { kind: "empty" };

  const result: MatrixResult = useMemo(() => {
    try {
      switch (operation) {
        case "add":
          return { kind: "matrix", matrix: addMatrices(a, b) };
        case "subtract":
          return { kind: "matrix", matrix: subtractMatrices(a, b) };
        case "multiply":
          return { kind: "matrix", matrix: multiplyMatrices(a, b) };
        case "detA":
          return { kind: "scalar", scalar: determinant(a) };
        case "inverseA":
          return { kind: "matrix", matrix: inverseMatrix(a) };
        case "transposeA":
          return { kind: "matrix", matrix: transposeMatrix(a) };
        case "rankA":
          return { kind: "scalar", scalar: rankMatrix(a) };
        case "cofactorA":
          return { kind: "matrix", matrix: cofactorMatrix(a) };
        case "scalarA":
          return { kind: "matrix", matrix: scalarMultiply(a, scalar) };
        case "identity":
          return { kind: "matrix", matrix: identityMatrix(a.length) };
        default:
          return { kind: "empty" };
      }
    } catch (err) {
      return { kind: "error", message: err instanceof Error ? err.message : "Invalid operation" };
    }
  }, [a, b, scalar, operation]);

  const operations: { id: Operation; label: string; needsB: boolean }[] = [
    { id: "add", label: "A + B", needsB: true },
    { id: "subtract", label: "A − B", needsB: true },
    { id: "multiply", label: "A × B", needsB: true },
    { id: "scalarA", label: "k · A", needsB: false },
    { id: "detA", label: "det(A)", needsB: false },
    { id: "inverseA", label: "A⁻¹", needsB: false },
    { id: "transposeA", label: "Aᵀ", needsB: false },
    { id: "cofactorA", label: "Cofactor(A)", needsB: false },
    { id: "rankA", label: "rank(A)", needsB: false },
    { id: "identity", label: "I (size of A)", needsB: false },
  ];

  const activeNeedsB = operations.find((o) => o.id === operation)?.needsB ?? false;

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto panel-scroll p-4">
      <div className="flex flex-wrap gap-2">
        {operations.map((op) => (
          <button
            key={op.id}
            onClick={() => setOperation(op.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              operation === op.id ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {op.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <MatrixGrid label="Matrix A" matrix={a} onChange={setCell("a")} onResize={resize("a")} />
        {activeNeedsB && <MatrixGrid label="Matrix B" matrix={b} onChange={setCell("b")} onResize={resize("b")} />}
        {operation === "scalarA" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Scalar k</span>
            <input
              type="number"
              value={scalar}
              onChange={(e) => setScalar(Number(e.target.value) || 0)}
              className="h-9 w-20 rounded-lg border border-slate-700 bg-slate-900/80 text-center font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-sky-800/50 bg-sky-950/20 p-4">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Result</span>
        {result.kind === "error" ? (
          <div className="text-sm text-red-300">{result.message}</div>
        ) : result.kind === "scalar" ? (
          <div className="font-mono text-2xl text-white">{Number(result.scalar.toFixed(6))}</div>
        ) : result.kind === "matrix" ? (
          <MatrixGrid label="" matrix={result.matrix} editable={false} />
        ) : (
          <div className="text-sm text-slate-500">—</div>
        )}
      </div>
    </div>
  );
}
