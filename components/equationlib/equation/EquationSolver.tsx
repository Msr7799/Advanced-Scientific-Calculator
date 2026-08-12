"use client";

import { useState } from "react";
import { Calculator, RotateCcw } from "lucide-react";
import nerdamer from "nerdamer";
import "nerdamer/Algebra";
import "nerdamer/Solve";

type EquationType = "solver" | "polynomial" | "system2" | "system3";

const MODES: Array<{ id: EquationType; label: string; hint: string; initial: string }> = [
  { id: "solver", label: "SOLVER", hint: "Equation in x", initial: "2*x+3=7" },
  { id: "polynomial", label: "POLY", hint: "Polynomial equation", initial: "x^2-5*x+6=0" },
  { id: "system2", label: "SIMUL 2", hint: "Two equations, one per line", initial: "2*x+3*y=8\nx-2*y=1" },
  { id: "system3", label: "SIMUL 3", hint: "Three equations, one per line", initial: "x+y+z=6\n2*x-y+z=3\nx-2*y+3*z=4" },
];

function solveEquation(mode: EquationType, input: string): string[] {
  if (mode === "solver" || mode === "polynomial") {
    const solutions = nerdamer.solve(input, "x").toString().replace(/^\[|\]$/g, "").split(",").filter(Boolean);
    if (solutions.length === 0) throw new Error("No real or symbolic solution found");
    return solutions.map((solution, index) => solutions.length === 1 ? `x = ${solution}` : `x${index + 1} = ${solution}`);
  }
  const equations = input.split(/[;\n]+/).map((line) => line.trim()).filter(Boolean);
  const expected = mode === "system2" ? 2 : 3;
  if (equations.length !== expected) throw new Error(`Enter exactly ${expected} equations`);
  return nerdamer.solveEquations(equations).map(([variable, value]) => `${variable} = ${value}`);
}

export default function EquationSolver() {
  const [selected, setSelected] = useState<EquationType>("solver");
  const [input, setInput] = useState(MODES[0].initial);
  const [solutions, setSolutions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const currentMode = MODES.find((mode) => mode.id === selected) ?? MODES[0];

  const selectMode = (mode: (typeof MODES)[number]) => {
    setSelected(mode.id);
    setInput(mode.initial);
    setSolutions([]);
    setError("");
  };

  const solve = () => {
    try {
      setSolutions(solveEquation(selected, input));
      setError("");
    } catch (reason) {
      setSolutions([]);
      setError(reason instanceof Error ? reason.message : "Equation ERROR");
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-[#07101c] text-[#c8d8e8]">
      <div className="flex h-11 shrink-0 items-center border-b border-[#20324a] bg-[#0c1727] px-3">
        <span className="text-[11px] font-black tracking-[0.22em] text-[#f06aac]">EQUATION</span>
        <span className="ml-3 text-[9px] text-[#526b82]">Simultaneous · Polynomial · Solver</span>
        <button type="button" onClick={() => selectMode(currentMode)} className="mode-icon-button ml-auto" title="Reset equation"><RotateCcw size={15} /></button>
      </div>

      <div className="flex h-10 shrink-0 items-end gap-1 border-b border-[#20324a] bg-[#09131f] px-3 pt-1">
        {MODES.map((mode) => (
          <button key={mode.id} type="button" onClick={() => selectMode(mode)} className={`mode-tab h-9 ${selected === mode.id ? "mode-tab-active" : ""}`}>{mode.label}</button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(400px,1fr)_minmax(300px,0.62fr)]">
        <div className="flex min-h-0 flex-col border-r border-[#20324a] p-4">
          <label className="mb-2 text-[10px] font-bold tracking-[0.16em] text-[#66809b]">{currentMode.hint.toUpperCase()}</label>
          <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); solve(); }
          }} className="min-h-40 flex-1 resize-none rounded-md border border-[#28415e] bg-[#020817] p-4 font-mono text-[15px] leading-7 text-white outline-none focus:border-[#4c7ca8]" aria-label="Equation input" spellCheck={false} />
          <button type="button" onClick={solve} className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#287bb2] bg-[#126c9e] text-[11px] font-bold text-white hover:bg-[#1780b9]">
            <Calculator size={16} /> SOLVE
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-4">
          <div className="text-[10px] font-bold tracking-[0.2em] text-[#66809b]">SOLUTION</div>
          <div className="mt-2 min-h-36 rounded-md border border-[#28415e] bg-[#020817] p-4 font-mono">
            {error ? <div className="text-[12px] text-[#ed7272]">{error}</div> : solutions.length > 0 ? solutions.map((solution) => <div key={solution} className="border-b border-[#16283c] py-2 text-[17px] font-bold text-white last:border-b-0">{solution}</div>) : <div className="text-[11px] text-[#3d5872]">Enter coefficients or equations, then press SOLVE.</div>}
          </div>
          <div className="mt-3 rounded-md border border-[#1b3048] bg-[#0b1625] p-3 text-[10px] leading-5 text-[#657f98]">
            Use <span className="font-mono text-[#a4c2dc]">*</span> for multiplication and <span className="font-mono text-[#a4c2dc]">^</span> for powers. Separate simultaneous equations with a new line.
          </div>
        </div>
      </div>

      <div className="grid h-9 shrink-0 grid-cols-6 border-t border-[#29425f] bg-[#0b1727]">
        <button type="button" onClick={() => selectMode(MODES[2])} className="mode-softkey">SIMUL</button>
        <button type="button" onClick={() => selectMode(MODES[1])} className="mode-softkey">POLY</button>
        <button type="button" onClick={() => selectMode(MODES[0])} className="mode-softkey">SOLVER</button>
        <button type="button" onClick={() => setInput("")} className="mode-softkey">CLEAR</button>
        <span className="mode-softkey cursor-default opacity-40">—</span>
        <button type="button" onClick={solve} className="mode-softkey mode-softkey-active">SOLVE</button>
      </div>
    </div>
  );
}
