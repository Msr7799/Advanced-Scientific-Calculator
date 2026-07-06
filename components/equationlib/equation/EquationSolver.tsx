"use client";

import { useMemo, useState } from "react";

type EquationType = "linear" | "quadratic" | "system2" | "system3";

const initialEquations: Record<EquationType, string> = {
  linear: "2x+3=7",
  quadratic: "x^2-5x+6=0",
  system2: "2x+3y=8; x-2y=1",
  system3: "x+y+z=6; 2x-y+z=3; x-2y+3z=4",
};

function solveLinear(expression: string) {
  return `Solve linear equation ${expression} using algebraic substitution`;
}

function solveQuadratic(expression: string) {
  return `Solve quadratic equation ${expression} using discriminant formula`;
}

function solveSystem2(expression: string) {
  return `Solve 2x2 system ${expression} using elimination`;
}

function solveSystem3(expression: string) {
  return `Solve 3x3 system ${expression} using Gaussian elimination`;
}

export default function EquationSolver() {
  const [selected, setSelected] = useState<EquationType>("linear");
  const [input, setInput] = useState(initialEquations[selected]);
  const [solution, setSolution] = useState("Ready to solve.");

  const steps = useMemo(() => {
    switch (selected) {
      case "linear":
        return ["Isolate x.", "Compute the value."];
      case "quadratic":
        return ["Compute a, b, c.", "Use the quadratic formula."];
      case "system2":
        return ["Convert to standard form.", "Eliminate one variable.", "Back substitute."];
      case "system3":
        return ["Set up augmented matrix.", "Perform row reduction.", "Extract variables."];
    }
  }, [selected]);

  const handleSolve = () => {
    let result = "";
    switch (selected) {
      case "linear":
        result = solveLinear(input);
        break;
      case "quadratic":
        result = solveQuadratic(input);
        break;
      case "system2":
        result = solveSystem2(input);
        break;
      case "system3":
        result = solveSystem3(input);
        break;
    }
    setSolution(result);
  };

  return (
    <section className="rounded-3xl border border-slate-700/70 bg-slate-900/90 p-5 shadow-inner shadow-slate-950/30">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {Object.keys(initialEquations).map((key) => (
            <button
              key={key}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selected === key ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-200 hover:bg-slate-700"}`}
              onClick={() => {
                setSelected(key as EquationType);
                setInput(initialEquations[key as EquationType]);
              }}
            >
              {key}
            </button>
          ))}
        </div>
        <label className="text-sm text-slate-400">Equation input</label>
        <textarea
          className="min-h-[120px] rounded-3xl border border-slate-700/70 bg-slate-950/90 p-4 text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-label="Equation input"
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/80"
            onClick={handleSolve}
          >
            Solve
          </button>
          <span className="text-sm text-slate-400">Selected: {selected}</span>
        </div>
        <div className="rounded-3xl border border-slate-700/70 bg-slate-950/90 p-4 text-slate-200">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Solution</p>
          <p className="mt-3 text-sm leading-6">{solution}</p>
        </div>
        <div className="rounded-3xl border border-slate-700/70 bg-slate-950/90 p-4 text-slate-200">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Steps</p>
          <ol className="mt-3 space-y-2 list-decimal list-inside text-sm text-slate-300">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
