"use client";

import { useCallback } from "react";
import { useCalculatorDispatch, useCalculatorState } from "@/lib/state/calculatorState";

const buttons = [
  [
    { label: "MC", action: "mc" },
    { label: "MR", action: "mr" },
    { label: "MS", action: "ms" },
    { label: "M+", action: "m+" },
    { label: "M-", action: "m-" },
  ],
  [
    { label: "sin", action: "sin" },
    { label: "cos", action: "cos" },
    { label: "tan", action: "tan" },
    { label: "ln", action: "ln" },
    { label: "log", action: "log" },
  ],
  [
    { label: "7", action: "7" },
    { label: "8", action: "8" },
    { label: "9", action: "9" },
    { label: "(", action: "(" },
    { label: ")", action: ")" },
  ],
  [
    { label: "4", action: "4" },
    { label: "5", action: "5" },
    { label: "6", action: "6" },
    { label: "×", action: "*" },
    { label: "÷", action: "/" },
  ],
  [
    { label: "1", action: "1" },
    { label: "2", action: "2" },
    { label: "3", action: "3" },
    { label: "+", action: "+" },
    { label: "-", action: "-" },
  ],
  [
    { label: "0", action: "0" },
    { label: ".", action: "." },
    { label: "pi", action: "pi" },
    { label: "e", action: "e" },
    { label: "Ans", action: "ans" },
  ],
  [
    { label: "sqrt", action: "sqrt" },
    { label: "x²", action: "square" },
    { label: "x³", action: "cube" },
    { label: "^", action: "^" },
    { label: "%", action: "%" },
  ],
  [
    { label: "C", action: "clear" },
    { label: "⌫", action: "backspace" },
    { label: "xⁿ", action: "pow" },
    { label: "!", action: "factorial" },
    { label: "=", action: "enter" },
  ],
];

export default function CalculatorKeyboard({ onEvaluate }: { onEvaluate: () => void }) {
  const dispatch = useCalculatorDispatch();
  const state = useCalculatorState();

  const handleClick = useCallback(
    (action: string) => {
      const numericValue = Number(state.result);
      const currentValue = Number.isFinite(numericValue) ? numericValue : state.lastAnswer;

      switch (action) {
        case "clear":
          dispatch({ type: "CLEAR" });
          break;
        case "backspace":
          dispatch({ type: "BACKSPACE" });
          break;
        case "enter":
          onEvaluate();
          break;
        case "mc":
          dispatch({ type: "MEMORY_CLEAR" });
          break;
        case "mr":
          dispatch({ type: "SET_EXPRESSION", payload: String(state.memory) });
          break;
        case "ms":
          dispatch({ type: "MEMORY_STORE", payload: currentValue });
          break;
        case "m+":
          dispatch({ type: "MEMORY_ADD", payload: currentValue });
          break;
        case "m-":
          dispatch({ type: "MEMORY_SUBTRACT", payload: currentValue });
          break;
        case "ans":
          dispatch({ type: "APPEND_TOKEN", payload: "ans" });
          break;
        default:
          dispatch({ type: "APPEND_TOKEN", payload: action });
      }
    },
    [dispatch, onEvaluate, state.lastAnswer, state.memory, state.result]
  );

  return (
    <div className="grid gap-3 rounded-3xl bg-slate-950/90 p-2 sm:p-3">
      {buttons.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid grid-cols-5 gap-3">
          {row.map((button) => (
            <button
              key={button.label}
              type="button"
              className="rounded-2xl border border-white/10 bg-slate-800 px-3 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500/80 active:bg-slate-600"
              onClick={() => handleClick(button.action)}
              aria-label={button.label}
            >
              {button.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
