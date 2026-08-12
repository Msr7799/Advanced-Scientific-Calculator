"use client";

import Image from "next/image";
import { useCasioStore } from "@/store/calculatorStore";
import type { CasioMode } from "@/types/calculator";

type WorkspaceMode = Exclude<CasioMode, "RUN_MAT" | "MENU">;

const MODE_DETAILS: Record<WorkspaceMode, { label: string; color: string; lines: string[]; softkeys: string[] }> = {
  GRAPH: { label: "GRAPH", color: "#ff9944", lines: ["Y= function editor", "Trace / Zoom / V-Window"], softkeys: ["TRACE", "ZOOM", "V-WIN", "SKETCH", "G-SOLV", "G-T"] },
  TABLE: { label: "TABLE", color: "#55ccff", lines: ["Function value table", "Set Start / End / Step"], softkeys: ["FORM", "RANG", "EDIT", "ROW", "G-CON", "G-PLOT"] },
  EQUATION: { label: "EQUATION", color: "#ff66aa", lines: ["Solver / Polynomial", "2x2 and 3x3 systems"], softkeys: ["SIMUL", "POLY", "SOLVER", "CLEAR", "-", "SOLVE"] },
  MATRIX: { label: "MATRIX", color: "#cc88ff", lines: ["Matrix A / Matrix B", "Arithmetic and transforms"], softkeys: ["ADD", "SUB", "MULT", "TRANS", "DET", "INV"] },
  VECTOR: { label: "VECTOR", color: "#ffcc44", lines: ["Vct A / Vct B", "DotP / CrossP / Norm"], softkeys: ["DOT", "CROSS", "NORM", "UNIT", "ANGLE", "ADD"] },
  STATISTICS: { label: "STAT", color: "#44cc88", lines: ["1-variable statistics", "Regression and plots"], softkeys: ["1-VAR", "REGR", "CALC", "GRAPH", "SET", "DRAW"] },
  PYTHON: { label: "PYTHON", color: "#44ddaa", lines: ["CPython / Pyodide", "Editor and output shell"], softkeys: ["NEW", "SAVE", "SHELL", "CHAR", "STOP", "RUN"] },
};

export default function CasioModeScreen({ mode }: { mode: WorkspaceMode }) {
  const { graphEquations, angleMode } = useCasioStore();
  const details = MODE_DETAILS[mode];
  const graphLines = mode === "GRAPH"
    ? graphEquations.filter((equation) => equation.expression.trim()).slice(0, 3).map((equation) => `${equation.id}=${equation.expression}`)
    : [];
  const lines = graphLines.length > 0 ? graphLines : details.lines;

  return (
    <div className="casio-lcd casio-lcd-glare lcd-flicker power-on flex h-full flex-col overflow-hidden rounded-[6px]">
      <div className="status-bar flex shrink-0 items-center justify-between px-2 py-[3px]">
        <span className="text-[8px] font-bold tracking-[0.18em]" style={{ color: details.color }}>{details.label}</span>
        <span className="text-[8px] font-mono text-[#82aada]">{angleMode}</span>
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col px-3 py-3">
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          {mode === "PYTHON" ? (
            <Image src="/Python-Logo.svg" alt="" aria-hidden="true" width={28} height={28} unoptimized className="h-7 w-7 object-contain" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded border text-[13px] font-black" style={{ borderColor: `${details.color}66`, color: details.color }}>
              {details.label.slice(0, 1)}
            </div>
          )}
          <div>
            <div className="text-[11px] font-black tracking-[0.18em] text-white">{details.label}</div>
            <div className="text-[7px] text-[#6482a3]">EXPANDED WORKSPACE ACTIVE</div>
          </div>
        </div>
        <div className="mt-3 space-y-2 font-mono">
          {lines.map((line, index) => (
            <div key={`${line}-${index}`} className="truncate border-b border-white/5 pb-1.5 text-[10px]" style={{ color: index === 0 ? "#d7f0ff" : "#7fa5cb" }}>
              {line}
            </div>
          ))}
        </div>
        <div className="mt-auto text-[8px] text-[#557392]">Use F1-F6 or the expanded display</div>
      </div>
      <div className="grid shrink-0 grid-cols-6 border-t border-white/5 bg-[#081224]/40">
        {details.softkeys.map((label, index) => (
          <div key={index} className="truncate border-r border-white/5 px-0.5 py-1 text-center text-[7px] font-bold last:border-r-0" style={{ color: details.color }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
