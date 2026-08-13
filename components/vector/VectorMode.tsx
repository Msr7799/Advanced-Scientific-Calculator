"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, RotateCcw } from "lucide-react";
import {
  angleBetweenDegrees,
  crossProduct,
  dotProduct,
  magnitude,
  normalize,
  type Vector,
} from "@/lib/vector/vector";
import { useCasioFKeys } from "@/lib/keyboard/useCasioFKeys";

type VectorName = "A" | "B";
type Operation = "dot" | "cross" | "norm" | "unit" | "angle" | "add";

const OPERATIONS: Array<{ id: Operation; label: string; casio: string }> = [
  { id: "dot", label: "Dot product", casio: "DotP" },
  { id: "cross", label: "Cross product", casio: "CrossP" },
  { id: "norm", label: "Magnitude", casio: "Norm" },
  { id: "unit", label: "Unit vector", casio: "UnitV" },
  { id: "angle", label: "Angle", casio: "Angle" },
  { id: "add", label: "A + B", casio: "A+B" },
];

function formatNumber(value: number): string {
  return Number(value.toPrecision(8)).toString();
}

export default function VectorMode() {
  const [vectors, setVectors] = useState<Record<VectorName, Vector>>({ A: [1, 2, 3], B: [4, 5, 6] });
  const [selected, setSelected] = useState<VectorName>("A");
  const [operation, setOperation] = useState<Operation>("dot");

  const result = useMemo(() => {
    const { A, B } = vectors;
    try {
      switch (operation) {
        case "dot": return { value: formatNumber(dotProduct(A, B)), expression: "DotP(Vct A,Vct B)" };
        case "cross": return { value: `[ ${crossProduct(A, B).map(formatNumber).join("  ")} ]`, expression: "CrossP(Vct A,Vct B)" };
        case "norm": return { value: formatNumber(magnitude(A)), expression: "Norm(Vct A)" };
        case "unit": return { value: `[ ${normalize(A).map(formatNumber).join("  ")} ]`, expression: "UnitV(Vct A)" };
        case "angle": return { value: `${formatNumber(angleBetweenDegrees(A, B))}°`, expression: "Angle(Vct A,Vct B)" };
        case "add":
          if (A.length !== B.length) throw new Error("Vct A and Vct B must have the same dimension");
          return { value: `[ ${A.map((value, index) => formatNumber(value + B[index])).join("  ")} ]`, expression: "Vct A+Vct B" };
      }
    } catch (error) {
      return { value: error instanceof Error ? error.message : "Dimension ERROR", expression: "ERROR", error: true };
    }
  }, [operation, vectors]);

  const updateElement = (name: VectorName, index: number, value: string) => {
    if (value.trim() === "") return;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    setVectors((current) => ({
      ...current,
      [name]: current[name].map((entry, entryIndex) => entryIndex === index ? numericValue : entry),
    }));
  };

  const setDimension = (dimension: 2 | 3) => {
    setVectors((current) => {
      const active = current[selected];
      return { ...current, [selected]: Array.from({ length: dimension }, (_, index) => active[index] ?? 0) };
    });
  };

  useCasioFKeys(OPERATIONS.map((item) => () => setOperation(item.id)));

  return (
    <div className="flex h-full min-w-0 flex-col bg-[var(--surface-1)] text-[#c8d8e8]">
      <div className="flex h-11 shrink-0 items-center border-b border-[var(--border)] bg-[var(--surface-2)] px-3">
        <div className="text-[11px] font-bold tracking-[0.2em] text-[#e2b743]">VECTOR MEMORY</div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setSelected(selected === "A" ? "B" : "A")} className="mode-icon-button" title="Switch vector">
            <ArrowLeftRight size={15} />
          </button>
          <button type="button" onClick={() => setVectors({ A: [0, 0, 0], B: [0, 0, 0] })} className="mode-icon-button" title="Clear vectors">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="mode-responsive-grid grid min-h-0 flex-1 grid-cols-[minmax(300px,0.9fr)_minmax(360px,1.1fr)]">
        <div className="min-h-0 overflow-y-auto border-r border-[var(--border)] p-4">
          <div className="mb-3 flex items-center gap-2">
            {(["A", "B"] as VectorName[]).map((name) => (
              <button key={name} type="button" onClick={() => setSelected(name)} className={`mode-tab ${selected === name ? "mode-tab-active" : ""}`}>
                Vct {name}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1" aria-label="Vector dimension">
              {[2, 3].map((dimension) => (
                <button key={dimension} type="button" onClick={() => setDimension(dimension as 2 | 3)} className={`mode-segment ${vectors[selected].length === dimension ? "mode-segment-active" : ""}`}>
                  {dimension}D
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-[#2a405e] bg-[var(--surface-2)]">
            <div className="grid grid-cols-[56px_1fr] border-b border-[#2a405e] bg-[var(--surface-3)] text-[10px] font-bold text-[#6f8eaf]">
              <div className="px-3 py-2">CELL</div><div className="px-3 py-2">VALUE</div>
            </div>
            {vectors[selected].map((value, index) => (
              <label key={index} className="grid grid-cols-[56px_1fr] border-b border-[var(--border)] last:border-b-0">
                <span className="flex items-center justify-center border-r border-[var(--border)] font-mono text-[12px] text-[#e2b743]">{index + 1}</span>
                <input type="number" value={value} onChange={(event) => updateElement(selected, index, event.target.value)} className="h-11 bg-transparent px-3 font-mono text-[14px] text-white outline-none focus:bg-[var(--surface-hover)]" aria-label={`Vct ${selected} element ${index + 1}`} />
              </label>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {OPERATIONS.map((item) => (
              <button key={item.id} type="button" onClick={() => setOperation(item.id)} className={`mode-command ${operation === item.id ? "mode-command-active" : ""}`}>
                <span className="font-mono text-[12px] font-bold">{item.casio}</span>
                <span className="text-[9px] text-[#68809a]">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col p-4">
          <div className="mb-2 text-[10px] font-bold tracking-[0.2em] text-[#557392]">RUN-MATRIX</div>
          <div className="min-h-32 rounded-md border border-[var(--border-strong)] bg-[var(--input-bg)] p-4 font-mono">
            <div className="text-[13px] text-[#7fb8e8]">{result.expression}</div>
            <div className={`mt-6 break-words text-right text-[22px] font-bold ${result.error ? "text-[#ee6b6b]" : "text-white"}`}>{result.value}</div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            {(["A", "B"] as VectorName[]).map((name) => (
              <div key={name} className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono">
                <div className="text-[9px] text-[#54708d]">Vct {name} ({vectors[name].length}×1)</div>
                <div className="mt-1 text-[#bdd5eb]">[ {vectors[name].join("  ")} ]</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setVectors(({ A, B }) => ({ A: B, B: A }))} className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#31557b] bg-[var(--accent-soft)] text-[11px] font-bold text-[#9ccfff]">
            <ArrowLeftRight size={14} /> Swap Vct A and Vct B
          </button>
        </div>
      </div>

      <div className="grid h-9 shrink-0 grid-cols-6 border-t border-[var(--border-strong)] bg-[var(--surface-2)]">
        {OPERATIONS.map((item) => (
          <button key={item.id} type="button" onClick={() => setOperation(item.id)} className={`border-r border-[#243a55] font-mono text-[10px] font-bold last:border-r-0 ${operation === item.id ? "bg-[#285d91] text-white" : "text-[#79a9d4] hover:bg-[var(--surface-hover)]"}`}>
            {item.casio}
          </button>
        ))}
      </div>
    </div>
  );
}
