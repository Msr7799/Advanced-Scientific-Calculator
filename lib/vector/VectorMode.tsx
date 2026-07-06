"use client";

import { useMemo, useState } from "react";
import { crossProduct, dotProduct, magnitude, normalize, Vector } from "@/lib/vector/vector";

function VectorInput({ label, value, onChange }: { label: string; value: Vector; onChange: (v: Vector) => void }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange([...value, 0])}
            className="rounded bg-slate-800 px-1.5 text-xs text-slate-300 hover:bg-slate-700"
          >
            +dim
          </button>
          <button
            type="button"
            onClick={() => value.length > 1 && onChange(value.slice(0, -1))}
            className="rounded bg-slate-800 px-1.5 text-xs text-slate-300 hover:bg-slate-700"
          >
            −dim
          </button>
        </div>
      </div>
      <div className="flex gap-1.5">
        {value.map((v, i) => (
          <input
            key={i}
            type="number"
            value={v}
            onChange={(e) => {
              const next = [...value];
              next[i] = Number(e.target.value) || 0;
              onChange(next);
            }}
            className="h-9 w-14 rounded-lg border border-slate-700 bg-slate-900/80 text-center font-mono text-sm text-slate-100 outline-none focus:border-sky-500"
          />
        ))}
      </div>
    </div>
  );
}

type Operation = "dot" | "cross" | "magA" | "normalizeA" | "add" | "subtract";

export default function VectorMode() {
  const [a, setA] = useState<Vector>([1, 2, 3]);
  const [b, setB] = useState<Vector>([4, 5, 6]);
  const [operation, setOperation] = useState<Operation>("dot");

  type VectorResult =
    | { kind: "vector"; vector: Vector }
    | { kind: "scalar"; scalar: number }
    | { kind: "error"; message: string }
    | { kind: "empty" };

  const result: VectorResult = useMemo(() => {
    try {
      switch (operation) {
        case "dot":
          return { kind: "scalar", scalar: dotProduct(a, b) };
        case "cross":
          return { kind: "vector", vector: crossProduct(a, b) };
        case "magA":
          return { kind: "scalar", scalar: magnitude(a) };
        case "normalizeA":
          return { kind: "vector", vector: normalize(a) };
        case "add":
          if (a.length !== b.length) throw new Error("Vectors must have the same dimension");
          return { kind: "vector", vector: a.map((v, i) => v + b[i]) };
        case "subtract":
          if (a.length !== b.length) throw new Error("Vectors must have the same dimension");
          return { kind: "vector", vector: a.map((v, i) => v - b[i]) };
        default:
          return { kind: "empty" };
      }
    } catch (err) {
      return { kind: "error", message: err instanceof Error ? err.message : "Invalid operation" };
    }
  }, [a, b, operation]);

  const angleBetween = useMemo(() => {
    if (a.length !== b.length) return null;
    try {
      const cosTheta = dotProduct(a, b) / (magnitude(a) * magnitude(b));
      const clamped = Math.min(1, Math.max(-1, cosTheta));
      return (Math.acos(clamped) * 180) / Math.PI;
    } catch {
      return null;
    }
  }, [a, b]);

  const operations: { id: Operation; label: string }[] = [
    { id: "dot", label: "A · B (dot)" },
    { id: "cross", label: "A × B (cross, 3D)" },
    { id: "add", label: "A + B" },
    { id: "subtract", label: "A − B" },
    { id: "magA", label: "‖A‖ (magnitude)" },
    { id: "normalizeA", label: "Â (normalize)" },
  ];

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
        <VectorInput label="Vector A" value={a} onChange={setA} />
        <VectorInput label="Vector B" value={b} onChange={setB} />
      </div>

      {angleBetween !== null && (
        <div className="text-xs text-slate-500">Angle between A and B: <span className="font-mono text-slate-300">{angleBetween.toFixed(3)}°</span></div>
      )}

      <div className="rounded-2xl border border-sky-800/50 bg-sky-950/20 p-4">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Result</span>
        {result.kind === "error" ? (
          <div className="text-sm text-red-300">{result.message}</div>
        ) : result.kind === "scalar" ? (
          <div className="font-mono text-2xl text-white">{Number(result.scalar.toFixed(6))}</div>
        ) : result.kind === "vector" ? (
          <div className="flex gap-1.5">
            {result.vector.map((v, i) => (
              <div key={i} className="flex h-9 w-16 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 font-mono text-sm text-white">
                {Number(v.toFixed(4))}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">—</div>
        )}
      </div>
    </div>
  );
}
