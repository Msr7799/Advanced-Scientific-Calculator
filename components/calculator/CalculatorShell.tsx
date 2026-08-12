"use client";

import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalculatorDispatch, useCalculatorState } from "@/lib/state/calculatorState";
import { useCasioStore } from "@/store/calculatorStore";
import { calculate } from "@/lib/math/engine";
import { casExpand, casFactor, casSimplify, casSolve } from "@/lib/cas/casEngine";
import CasioScreen from "@/components/display/CasioScreen";
import CasioMenuScreen from "@/components/display/CasioMenuScreen";
import CasioModeScreen from "@/components/display/CasioModeScreen";
import type { CasioKeyDef } from "@/types/calculator";
import { mapKeyboardEvent, shouldPreventDefault } from "@/lib/keyboard/casioKeyboard";

// ─── Key layout data (Casio fx-CG50 authentic) ───────────────────────────────
const F_KEYS: CasioKeyDef[] = [
  { label: "F1", action: "f1", variant: "fn", shiftLabel: "Trace"    },
  { label: "F2", action: "f2", variant: "fn", shiftLabel: "Zoom"     },
  { label: "F3", action: "f3", variant: "fn", shiftLabel: "V-Win"    },
  { label: "F4", action: "f4", variant: "fn", shiftLabel: "Sketch"   },
  { label: "F5", action: "f5", variant: "fn", shiftLabel: "G-Solv"   },
  { label: "F6", action: "f6", variant: "fn", shiftLabel: "G↔T"      },
];

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function toSimpleFraction(decimal: number): string | null {
  if (Number.isInteger(decimal)) return null;
  for (let denominator = 2; denominator <= 1000; denominator++) {
    const numerator = Math.round(decimal * denominator);
    if (Math.abs(numerator / denominator - decimal) < 1e-9) {
      const divisor = greatestCommonDivisor(Math.abs(numerator), denominator);
      return `frac(${numerator / divisor},${denominator / divisor})`;
    }
  }
  return null;
}

function findClosingParenthesis(expression: string, openingIndex: number): number {
  let depth = 0;
  for (let index = openingIndex; index < expression.length; index++) {
    if (expression[index] === "(") depth++;
    if (expression[index] === ")") depth--;
    if (depth === 0) return index;
  }
  return expression.length;
}

export function getVerticalCursor(expression: string, cursor: number, direction: "UP" | "DOWN"): number {
  const openings: number[] = [];
  for (let index = 0; index < cursor; index++) {
    if (expression[index] === "(") openings.push(index);
    if (expression[index] === ")") openings.pop();
  }

  const opening = openings.at(-1);
  if (opening === undefined) return direction === "UP" ? 0 : expression.length;

  const name = expression.slice(0, opening).match(/([A-Za-z][A-Za-z0-9]*)$/)?.[1] ?? "";
  const closing = findClosingParenthesis(expression, opening);
  const commas: number[] = [];
  let depth = 0;
  for (let index = opening + 1; index < closing; index++) {
    if (expression[index] === "(") depth++;
    if (expression[index] === ")") depth--;
    if (expression[index] === "," && depth === 0) commas.push(index);
  }
  if (commas.length === 0) return direction === "UP" ? opening + 1 : closing;

  const starts = [opening + 1, ...commas.map((comma) => comma + 1)];
  const ends = [...commas, closing];
  const currentArgument = ends.findIndex((end) => cursor <= end);
  const current = currentArgument === -1 ? ends.length - 1 : currentArgument;
  let target = direction === "UP" ? current - 1 : current + 1;

  if (name === "nthRoot") {
    target = direction === "UP" ? current + 1 : current - 1;
  }
  if (target < 0 || target >= starts.length) return cursor;

  const offset = Math.max(0, cursor - starts[current]);
  return Math.min(ends[target], starts[target] + offset);
}

const keyRows: CasioKeyDef[][] = [
  // ── Row 1: Modifiers + MENU + EXIT ─────────────────────────────────────────
  [
    { label: "SHIFT",  action: "shift",   variant: "shift", shiftLabel: "A-LOCK"              },
    { label: "OPTN",   action: "optn",    variant: "fn",    shiftLabel: "FMEM"                },
    { label: "VARS",   action: "vars",    variant: "fn",    shiftLabel: "PRGM",  alphaLabel: "r"   },
    { label: "MENU",   action: "menu",    variant: "fn",    shiftLabel: "SET UP",alphaLabel: "θ"   },
    { label: "EXIT",   action: "exit",    variant: "fn",    shiftLabel: "QUIT"                },
  ],
  // ── Row 2: ALPHA + math operations ─────────────────────────────────────────
  [
    { label: "ALPHA",  action: "alpha",   variant: "alpha", shiftLabel: "LOCK"                },
    { label: "x²",     action: "sq",      variant: "fn",    shiftLabel: "x³",    alphaLabel: "A"   },
    { label: "^",      action: "^",       variant: "fn",    shiftLabel: "x√",    alphaLabel: "B"   },
    { label: "√",      action: "sqrt",    variant: "fn",    shiftLabel: "∛",     alphaLabel: "C"   },
    { label: "log",    action: "log",     variant: "fn",    shiftLabel: "10ˣ",   alphaLabel: "D"   },
  ],
  // ── Row 3: X,θ,T + trig ────────────────────────────────────────────────────
  [
    { label: "X,θ,T",  action: "xvar",    variant: "fn",    shiftLabel: "°′″",   alphaLabel: "E"   },
    { label: "ln",     action: "ln",      variant: "fn",    shiftLabel: "eˣ",    alphaLabel: "F"   },
    { label: "sin",    action: "sin",     variant: "fn",    shiftLabel: "sin⁻¹", alphaLabel: "G"   },
    { label: "cos",    action: "cos",     variant: "fn",    shiftLabel: "cos⁻¹", alphaLabel: "H"   },
    { label: "tan",    action: "tan",     variant: "fn",    shiftLabel: "tan⁻¹", alphaLabel: "I"   },
  ],
  // ── Row 4: Fraction + S↔D + parens + comma + arrow ──────────────────────────
  [
    { label: "⁻¹",     action: "frac",    variant: "fn",    shiftLabel: "d/c",   alphaLabel: "G"   },
    { label: "S↔D",    action: "s2d",     variant: "fn",    shiftLabel: "a b/c", alphaLabel: "H"   },
    { label: "(",      action: "(",       variant: "fn",    shiftLabel: "√",     alphaLabel: "I"   },
    { label: ")",      action: ")",       variant: "fn",    shiftLabel: "x²",    alphaLabel: "J"   },
    { label: ",",      action: ",",       variant: "fn",    shiftLabel: "[ ]",   alphaLabel: "K"   },
    { label: "→",      action: "arrow",   variant: "fn",    shiftLabel: "⇒",     alphaLabel: "L"   },
  ],
  // ── Row 5: Calc functions ───────────────────────────────────────────────────
  [
    { label: "∫dx",    action: "integral",variant: "fn",    shiftLabel: "d/dx",  alphaLabel: "J"   },
    { label: "Σ",      action: "sigma",   variant: "fn",    shiftLabel: "Π",     alphaLabel: "K"   },
    { label: "ˣ√",     action: "nthroot", variant: "fn",    shiftLabel: "Frac",  alphaLabel: "L"   },
    { label: "STO",    action: "sto",     variant: "fn",    shiftLabel: "RCL",   alphaLabel: "O"   },
    { label: "ENG",    action: "eng",     variant: "fn",    shiftLabel: "°′″",   alphaLabel: "M"   },
    { label: "M+",     action: "m+",      variant: "fn",    shiftLabel: "M−",    alphaLabel: "N"   },
  ],
  // ── Row 6: 7 8 9 DEL AC ────────────────────────────────────────────────────
  [
    { label: "7",      action: "7",       variant: "numeric",shiftLabel: "CAPTURE",alphaLabel: "M" },
    { label: "8",      action: "8",       variant: "numeric",shiftLabel: "CLIP",   alphaLabel: "N" },
    { label: "9",      action: "9",       variant: "numeric",shiftLabel: "PASTE",  alphaLabel: "O" },
    { label: "DEL",    action: "backspace",variant: "blue",  shiftLabel: "INS",    alphaLabel: "UNDO" },
    { label: "AC",     action: "clear",   variant: "ac",    shiftLabel: "OFF"                     },
  ],
  // ── Row 7: 4 5 6 × ÷ ───────────────────────────────────────────────────────
  [
    { label: "4",      action: "4",       variant: "numeric",shiftLabel: "CATALOG",alphaLabel: "P" },
    { label: "5",      action: "5",       variant: "numeric",shiftLabel: "FORMAT", alphaLabel: "Q" },
    { label: "6",      action: "6",       variant: "numeric",shiftLabel: "Mat",    alphaLabel: "R" },
    { label: "×",      action: "*",       variant: "fn",    alphaLabel: "{"                       },
    { label: "÷",      action: "/",       variant: "fn",    alphaLabel: "}"                       },
  ],
  // ── Row 8: 1 2 3 + − ───────────────────────────────────────────────────────
  [
    { label: "1",      action: "1",       variant: "numeric",shiftLabel: "List",   alphaLabel: "Y" },
    { label: "2",      action: "2",       variant: "numeric",shiftLabel: "Space",  alphaLabel: "Z" },
    { label: "3",      action: "3",       variant: "numeric",shiftLabel: "π",      alphaLabel: "#" },
    { label: "+",      action: "+",       variant: "fn",    alphaLabel: "["                       },
    { label: "−",      action: "-",       variant: "fn",    alphaLabel: "]"                       },
  ],
  // ── Row 9: 0 . ×10ˣ (-) EXE ────────────────────────────────────────────────
  [
    { label: "0",      action: "0",       variant: "numeric",shiftLabel: "i",     alphaLabel: " "  },
    { label: ".",      action: ".",       variant: "numeric",shiftLabel: "=",     alphaLabel: "π"  },
    { label: "×10ˣ",  action: "sci",     variant: "fn",    shiftLabel: "EXP",   alphaLabel: "\"\""  },
    { label: "(−)",    action: "neg",     variant: "fn",    alphaLabel: "Ans"                      },
    { label: "EXE",    action: "enter",   variant: "enter"                                         },
  ],
];

// ─── Button render helpers ────────────────────────────────────────────────────
function getButtonClassName(variant: CasioKeyDef["variant"]): string {
  const base = "calc-btn relative flex flex-col items-center justify-center rounded-[5px] border select-none ";
  switch (variant) {
    case "shift":   return base + "btn-shift";
    case "alpha":   return base + "btn-alpha";
    case "blue":    return base + "btn-del";
    case "ac":      return base + "btn-ac";
    case "enter":   return base + "btn-exe";
    case "numeric": return base + "btn-numeric";
    default:        return base + "btn-fn";
  }
}

// ─── Individual key ────────────────────────────────────────────────────────────
function CalcKey({
  btn,
  onClick,
  shiftActive,
  alphaActive,
  isNumericPad = false,
}: {
  btn: CasioKeyDef;
  onClick: (action: string) => void;
  shiftActive: boolean;
  alphaActive: boolean;
  isNumericPad?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePointerDown = () => {
    setPressed(true);
    onClick(btn.action);
    // Hold-repeat for digit/operator keys
    if (/^[0-9+\-*\/\.]$/.test(btn.action) || btn.action === "backspace") {
      holdRef.current = setInterval(() => onClick(btn.action), 120);
    }
  };
  const handlePointerUp = () => {
    setPressed(false);
    if (holdRef.current) { clearInterval(holdRef.current); holdRef.current = null; }
  };

  const isNum = /^[0-9]$/.test(btn.label) || btn.label === ".";
  
  // Clean standard sizes to prevent buttons from touching
  const minHeight = isNumericPad ? 44 : 34;
  const paddingTop = isNumericPad ? 5 : 4;
  const paddingBottom = isNumericPad ? 5 : 4;

  let labelSize = "text-[10px]";
  if (isNumericPad) {
    if (btn.label.length <= 2 || btn.label === "×10ˣ" || btn.label === "Ans" || btn.label === "EXE") {
      labelSize = "text-[14px]";
    } else {
      labelSize = "text-[12px]";
    }
  }

  // Determine displayed label
  let displayLabel = btn.label;
  if (shiftActive && btn.shiftLabel) displayLabel = btn.shiftLabel;
  if (alphaActive && btn.alphaLabel) displayLabel = btn.alphaLabel;

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={getButtonClassName(btn.variant)}
      style={{
        minHeight,
        paddingTop,
        paddingBottom,
        transform: pressed ? "translateY(2px)" : undefined,
        filter: pressed ? "brightness(0.82)" : undefined,
        transition: "transform 0.06s, filter 0.06s",
        cursor: "pointer",
      }}
      aria-label={btn.label}
    >
      {/* Shift label — yellow, top-left */}
      {btn.shiftLabel && (
        <span className="absolute -top-[10px] left-0 w-full text-center text-[8px] font-semibold leading-none truncate px-0.5"
          style={{ color: "#d4aa2a", letterSpacing: "0.02em" }}>
          {btn.shiftLabel}
        </span>
      )}
      {/* Alpha label — red, top-right */}
      {btn.alphaLabel && btn.alphaLabel !== " " && (
        <span className="absolute -top-[10px] right-0.5 text-[8px] font-semibold leading-none"
          style={{ color: "#e04040", letterSpacing: "0.02em" }}>
          {btn.alphaLabel}
        </span>
      )}

      <span className={`${labelSize} font-${isNum ? "bold" : "semibold"} leading-none`}>
        {displayLabel}
      </span>
    </button>
  );
}

// ─── D-pad component ────────────────────────────────────────────────────────
function DPad({ onNav }: { onNav: (dir: string) => void }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 84, height: 84 }}>
      {/* Ring */}
      <div className="dpad-ring absolute inset-0 rounded-full" />

      {/* UP */}
      <button
        type="button"
        className="dpad-btn absolute top-0 left-1/2 -translate-x-1/2 w-7 h-8 flex items-center justify-center rounded-t-full text-[12px]"
        onClick={() => onNav("UP")}
        aria-label="Up"
        style={{ cursor: "pointer" }}
      >▲</button>

      {/* DOWN */}
      <button
        type="button"
        className="dpad-btn absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-8 flex items-center justify-center rounded-b-full text-[12px]"
        onClick={() => onNav("DOWN")}
        aria-label="Down"
        style={{ cursor: "pointer" }}
      >▼</button>

      {/* LEFT */}
      <button
        type="button"
        className="dpad-btn absolute left-0 top-1/2 -translate-y-1/2 w-8 h-7 flex items-center justify-center rounded-l-full text-[12px]"
        onClick={() => onNav("LEFT")}
        aria-label="Left"
        style={{ cursor: "pointer" }}
      >◀</button>

      {/* RIGHT */}
      <button
        type="button"
        className="dpad-btn absolute right-0 top-1/2 -translate-y-1/2 w-7 h-6 flex items-center justify-center rounded-r-full text-[11px]"
        onClick={() => onNav("RIGHT")}
        aria-label="Right"
      >▶</button>

      {/* Center / EXE */}
      <button
        type="button"
        className="dpad-center absolute z-10 h-7 w-7 rounded-full"
        onClick={() => onNav("CENTER")}
        aria-label="Confirm"
        title="Confirm / EXE"
      />
    </div>
  );
}

// ─── F-key bar ────────────────────────────────────────────
function FKeyBar({ onFKey }: { onFKey: (key: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-[6px]">
      {F_KEYS.map((fk) => (
        <div key={fk.action} className="flex flex-col items-center gap-0.5">
          {/* Function name above button */}
          {fk.shiftLabel && (
            <span
              className="text-[7px] font-semibold tracking-wider truncate w-full text-center leading-none"
              style={{ color: "#d4aa2a", letterSpacing: "0.03em" }}
            >
              {fk.shiftLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => onFKey(fk.action)}
            className="calc-btn btn-fn rounded-[5px] flex items-center justify-center w-full"
            style={{ height: 28, fontSize: 10, fontWeight: 800, cursor: "pointer" }}
            aria-label={fk.label}
          >
            {fk.label}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Calculator Shell ─────────────────────────────────────────────────────────
export default function CalculatorShell() {
  const calcState = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const isError = calcState.isError;
  const setIsError = useCallback((value: boolean) => {
    if (!value && calcState.isError) dispatch({ type: "SET_RESULT", payload: "" });
  }, [calcState.isError, dispatch]);
  const [poweredOff, setPoweredOff] = useState(false);
  const [fKeyMenu, setFKeyMenu] = useState<"main" | "more" | "calc" | "algb" | "optn" | "optn2" | "vars">("main");

  const currentFKeyLabels = useMemo(() => {
    switch (fKeyMenu) {
      case "calc":
        return [
          { key: "F1", label: "∫dx" },
          { key: "F2", label: "d/dx" },
          { key: "F3", label: "d²/dx²" },
          { key: "F4", label: "Solve" },
          { key: "F5", label: "Σ" },
          { key: "F6", label: "BACK" },
        ];
      case "algb":
        return [
          { key: "F1", label: "Simp" },
          { key: "F2", label: "Fact" },
          { key: "F3", label: "Expa" },
          { key: "F4", label: "Solve" },
          { key: "F5", label: "x" },
          { key: "F6", label: "BACK" },
        ];
      case "optn":
        return [
          { key: "F1", label: "LIST" },
          { key: "F2", label: "MAT/VCT" },
          { key: "F3", label: "CPLX" },
          { key: "F4", label: "CALC" },
          { key: "F5", label: "STAT" },
          { key: "F6", label: "▶" },
        ];
      case "optn2":
        return [
          { key: "F1", label: "CONV" },
          { key: "F2", label: "HYP" },
          { key: "F3", label: "PROB" },
          { key: "F4", label: "NUM" },
          { key: "F5", label: "ANGLE" },
          { key: "F6", label: "BACK" },
        ];
      case "vars":
        return [
          { key: "F1", label: "Ans" },
          { key: "F2", label: "M" },
          { key: "F3", label: "X" },
          { key: "F4", label: "Y" },
          { key: "F5", label: "Z" },
          { key: "F6", label: "BACK" },
        ];
      case "more":
        return [
          { key: "F1", label: "ANGLE" },
          { key: "F2", label: "RCL" },
          { key: "F3", label: "STO" },
          { key: "F4", label: "M+" },
          { key: "F5", label: "M−" },
          { key: "F6", label: "◀" },
        ];
      default:
        return [
          { key: "F1", label: "CALC" },
          { key: "F2", label: "ALGB" },
          { key: "F3", label: "OPTN" },
          { key: "F4", label: "MENU" },
          { key: "F5", label: "VARS" },
          { key: "F6", label: "▶" },
        ];
    }
  }, [fKeyMenu]);

  const store = useCasioStore();
  const {
    currentMode, setMode,
    shiftActive, alphaActive, toggleShift, toggleAlpha, clearModifiers,
    angleMode, addHistory, setLastAnswer,
  } = store;

  // ── Evaluate ────────────────────────────────────────────────────────────────
  const evalContext = useMemo(() => {
    const ctx: Record<string, unknown> = {
      ans: store.lastAnswer,
      memory: store.memory,
      angleMode: angleMode,
    };
    for (const [name, value] of Object.entries(store.variables)) {
      if (Number.isFinite(value)) ctx[name] = value;
    }
    return ctx;
  }, [angleMode, store.lastAnswer, store.memory, store.variables]);

  const handleEvaluate = useCallback(() => {
    if (!calcState.expression.trim()) return;
    try {
      const assignment = calcState.expression.match(/^(.*?)(?:→|=>)\s*([A-Za-z])$/);
      const sourceExpression = assignment?.[1]?.trim() || calcState.expression;
      const res = calculate(sourceExpression, evalContext as Record<string, string | number>).result;
      const num = parseFloat(res);
      const formatted = Number.isFinite(num) ? parseFloat(num.toPrecision(10)).toString() : res;
      if (assignment && Number.isFinite(num)) store.setVariable(assignment[2], num);
      setIsError(false);
      dispatch({ type: "EVALUATE", payload: formatted });
      if (Number.isFinite(num)) setLastAnswer(num);
      addHistory({ expression: calcState.expression, result: formatted });
    } catch (err: unknown) {
      setIsError(true);
      dispatch({ type: "SET_ERROR", payload: err instanceof Error ? err.message.replace("Error: ", "") : "Math ERROR" });
    }
  }, [dispatch, calcState.expression, evalContext, setLastAnswer, addHistory, setIsError, store]);

  const handleAlgebra = useCallback(async (operation: "simplify" | "factor" | "expand" | "solve") => {
    if (!calcState.expression.trim()) return;
    const handlers = {
      simplify: casSimplify,
      factor: casFactor,
      expand: casExpand,
      solve: (expression: string) => casSolve(expression, "x"),
    };
    const response = await handlers[operation](calcState.expression);
    if (response.success) {
      setIsError(false);
      dispatch({ type: "SET_RESULT", payload: response.result });
    } else {
      setIsError(true);
      dispatch({ type: "SET_ERROR", payload: response.error ?? "CAS ERROR" });
    }
  }, [calcState.expression, dispatch, setIsError]);

  const insertToken = useCallback((text: string, cursorBack = 0) => {
    dispatch({ type: "APPEND_TOKEN", payload: { text, cursorBack } });
  }, [dispatch]);

  const moveCursor = useCallback((direction: "UP" | "DOWN" | "LEFT" | "RIGHT") => {
    const current = calcState.cursorPosition;
    const next = direction === "LEFT"
      ? current - 1
      : direction === "RIGHT"
      ? current + 1
      : getVerticalCursor(calcState.expression, current, direction);
    dispatch({ type: "SET_CURSOR", payload: next });
  }, [calcState.cursorPosition, calcState.expression, dispatch]);

  // ── Button click handler ────────────────────────────────────────────────────
  const handleClick = useCallback((action: string) => {
    if (poweredOff) {
      if (action === "clear") setPoweredOff(false);
      return;
    }
    setIsError(false);

    if (currentMode !== "RUN_MAT" && currentMode !== "MENU" && /^f[1-6]$/.test(action)) {
      window.dispatchEvent(new CustomEvent("casio-fkey", { detail: action.toUpperCase() }));
      return;
    }

    // ── Modifier keys ─────────────────────────────────────────────────────────
    if (action === "shift") { toggleShift(); return; }
    if (action === "alpha") { toggleAlpha(); return; }

    const wasShift = shiftActive;
    const wasAlpha = alphaActive;
    clearModifiers();

    if (wasAlpha) {
      const definition = keyRows.flat().find((key) => key.action === action);
      if (definition?.alphaLabel) {
        const alphaTokens: Record<string, string> = { Ans: "ans", "π": "pi", "θ": "theta", "\"\"": "\"\"" };
        insertToken(alphaTokens[definition.alphaLabel] ?? definition.alphaLabel);
        return;
      }
    }

    // ── Control ───────────────────────────────────────────────────────────────
    switch (action) {
      case "clear":
        if (wasShift) setPoweredOff(true);
        else dispatch({ type: "CLEAR" });
        return;
      case "backspace":
        if (!wasShift) dispatch({ type: "BACKSPACE" });
        return;
      case "enter":     handleEvaluate(); return;
      case "menu":      setMode("MENU"); return;
      case "exit":
        if (fKeyMenu !== "main") {
          setFKeyMenu("main");
        } else if (currentMode !== "RUN_MAT") {
          setMode("RUN_MAT");
        } else {
          setMode("MENU");
        }
        return;
      case "m+":
        if (wasShift) store.subtractMemory(Number(calcState.result) || 0);
        else store.addMemory(Number(calcState.result) || 0);
        return;
      case "m-":
        store.subtractMemory(Number(calcState.result) || 0); return;
    }

    // ── Append token helpers ──────────────────────────────────────────────────
    const append = (token: string, cursorBack = 0) => {
      insertToken(token, cursorBack);
    };

    if (wasShift) {
      switch (action) {
        case "3": append("pi"); return;
        case "0": append("i"); return;
        case ".": append("="); return;
        case "1": append("[]", 1); return;
        case "2": append(" "); return;
        case "6": setMode("MATRIX"); return;
        case "7":
        case "8":
          void navigator.clipboard?.writeText(`${calcState.expression}${calcState.result ? `\n${calcState.result}` : ""}`);
          return;
        case "9":
          void navigator.clipboard?.readText().then((text) => append(text)).catch(() => undefined);
          return;
        case "sto": append(String(store.recallMemory())); return;
        case "nthroot": append("frac(,)", 2); return;
        case "frac":
        case "s2d":
          if (calcState.result) {
            const numeric = Number(calcState.result);
            const fraction = Number.isFinite(numeric) ? toSimpleFraction(numeric) : null;
            dispatch({ type: "SET_RESULT", payload: fraction ?? calcState.result });
          }
          return;
        case "(": append("sqrt()", 1); return;
        case ")": append("^2"); return;
        case ",": append("[]", 1); return;
      }
    }

    // ── Number / simple operators ─────────────────────────────────────────────
    if (/^[0-9]$/.test(action) || ["+", "-", "*", "/", ".", "(", ")", ","].includes(action)) {
      append(action);
      return;
    }

    // ── All other keys with SHIFT awareness ───────────────────────────────────
    switch (action) {
      // ── Powers & roots ─────────────────────────────────────────────────────
      case "sq":
        append(wasShift ? "^3" : "^2");
        break;
      case "^":
        if (wasShift) append("nthRoot(,)", 2);
        else append("^()", 1);
        break;
      case "sqrt":
        append(wasShift ? "cbrt()" : "sqrt()", 1);
        break;
      case "nthroot":
        append("nthRoot(,)", 2);
        break;

      // ── Logarithms ─────────────────────────────────────────────────────────
      case "log":
        append(wasShift ? "10^()" : "log()", 1);
        break;
      case "ln":
        append(wasShift ? "e^()" : "ln()", 1);
        break;

      // ── Trigonometry (SHIFT = inverse) ────────────────────────────────────
      case "sin":
        append(wasShift ? "asin()" : "sin()", 1);
        break;
      case "cos":
        append(wasShift ? "acos()" : "cos()", 1);
        break;
      case "tan":
        append(wasShift ? "atan()" : "tan()", 1);
        break;

      // ── Variable / constants ───────────────────────────────────────────────
      case "xvar":
        append("x");
        break;
      case "ans":
        append("ans");
        break;

      // ── Fraction / S↔D ────────────────────────────────────────────────────
      case "frac":
        append("frac(,)", 2);
        break;
      case "s2d":
        // Convert last result between fraction and decimal (best-effort)
        if (calcState.result) {
          const num = parseFloat(calcState.result);
          if (Number.isFinite(num)) {
            // Try to display as simple fraction or decimal
            const frac = toSimpleFraction(num);
            dispatch({ type: "SET_RESULT", payload: frac !== null ? frac : calcState.result });
          }
        }
        break;

      // ── Negation ──────────────────────────────────────────────────────────
      case "neg": {
        const expr = calcState.expression;
        if (expr.endsWith("-")) {
          dispatch({ type: "BACKSPACE" });
        } else if (expr === "" || expr.endsWith("(")) {
          append("-");
        } else {
          append("*-1");
        }
        break;
      }

      // ── Scientific notation ────────────────────────────────────────────────
      case "sci":
        append("e");          // mathjs interprets "2e3" as 2000
        break;

      // ── Calculus ──────────────────────────────────────────────────────────
      case "integral":
        if (wasShift) append("derivative(,)", 2);
        else append("integral(,,)", 3);
        break;
      case "sigma":
        append(wasShift ? "product(,,)" : "sum(,,)", 3);
        break;

      // ── Arrow / comma ─────────────────────────────────────────────────────
      case "arrow":
      case ",":
        append(action === "arrow" ? "→" : ",");
        break;

      // ── Memory / store / ENG ──────────────────────────────────────────────
      case "sto":
        if (calcState.result) {
          store.storeMemory(parseFloat(calcState.result) || 0);
        }
        break;
      case "eng":
        if (calcState.result) {
          const value = Number(calcState.result);
          if (Number.isFinite(value) && value !== 0) {
            const exponent = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
            dispatch({ type: "SET_RESULT", payload: `${Number((value / 10 ** exponent).toPrecision(10))}e${exponent}` });
          }
        }
        break;

      // ── F-keys (dynamic sub-menu navigation and token insertion) ─────────
      case "f1":
        if (fKeyMenu === "main") setFKeyMenu("calc");
        else if (fKeyMenu === "more") store.cycleAngleMode();
        else if (fKeyMenu === "calc") append("integral(,,)", 3);
        else if (fKeyMenu === "algb") void handleAlgebra("simplify");
        else if (fKeyMenu === "optn") append("[");
        else if (fKeyMenu === "optn2") append("convert()", 1);
        else if (fKeyMenu === "vars") append("ans");
        break;
      case "f2":
        if (fKeyMenu === "main") setFKeyMenu("algb");
        else if (fKeyMenu === "more") append(String(store.recallMemory()));
        else if (fKeyMenu === "calc") append("derivative(,)", 2);
        else if (fKeyMenu === "algb") void handleAlgebra("factor");
        else if (fKeyMenu === "optn") setMode("MATRIX");
        else if (fKeyMenu === "optn2") append("sinh()", 1);
        else if (fKeyMenu === "vars") append("memory");
        break;
      case "f3":
        if (fKeyMenu === "main") setFKeyMenu("optn");
        else if (fKeyMenu === "more") store.storeMemory(Number(calcState.result) || 0);
        else if (fKeyMenu === "calc") append("derivative(derivative(,),)", 4);
        else if (fKeyMenu === "algb") void handleAlgebra("expand");
        else if (fKeyMenu === "optn") append("i");
        else if (fKeyMenu === "optn2") append("nCr(,)", 2);
        else if (fKeyMenu === "vars") append("x");
        break;
      case "f4":
        if (fKeyMenu === "main") setMode("MENU");
        else if (fKeyMenu === "more") store.addMemory(Number(calcState.result) || 0);
        else if (fKeyMenu === "calc") void handleAlgebra("solve");
        else if (fKeyMenu === "algb") void handleAlgebra("solve");
        else if (fKeyMenu === "optn") setFKeyMenu("calc");
        else if (fKeyMenu === "optn2") append("abs()", 1);
        else if (fKeyMenu === "vars") append("y");
        break;
      case "f5":
        if (fKeyMenu === "main") setFKeyMenu("vars");
        else if (fKeyMenu === "more") store.subtractMemory(Number(calcState.result) || 0);
        else if (fKeyMenu === "calc") append("sum(,,)", 3);
        else if (fKeyMenu === "algb") append("x");
        else if (fKeyMenu === "optn") setMode("STATISTICS");
        else if (fKeyMenu === "optn2") store.cycleAngleMode();
        else if (fKeyMenu === "vars") append("z");
        break;
      case "f6":
        if (fKeyMenu === "optn") {
          setFKeyMenu("optn2");
        } else if (fKeyMenu === "main") {
          setFKeyMenu("more");
        } else {
          setFKeyMenu("main");
        }
        break;

      case "optn":
        setFKeyMenu(fKeyMenu === "optn" ? "main" : "optn");
        break;
      case "vars":
        setFKeyMenu(fKeyMenu === "vars" ? "main" : "vars");
        break;

      default:
        // Catch-all: if it looks safe to append, do it
        if (/^[a-zA-Zπ°∫Σ]+[\(]?$/.test(action) || action.length === 1) {
          append(action);
        }
    }
  }, [dispatch, handleEvaluate, setMode, store, calcState.result, calcState.expression,
      toggleShift, toggleAlpha, clearModifiers, shiftActive, alphaActive, currentMode, poweredOff,
      fKeyMenu, setFKeyMenu, handleAlgebra, insertToken, setIsError]);

  // ── Keyboard handler ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;
      if (currentMode === "MENU") return; // Let menu handle its own keys

      if (currentMode !== "RUN_MAT") {
        const action = mapKeyboardEvent(e);
        if (action.type === "CONTROL" && action.value === "EXIT") {
          e.preventDefault();
          setMode("MENU");
        } else if (action.type === "FKEY") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("casio-fkey", { detail: action.value }));
        } else if (action.type === "DPAD") {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("casio-nav", { detail: action.value }));
        }
        return;
      }
      if (shouldPreventDefault(e)) e.preventDefault();

      const action = mapKeyboardEvent(e);
      switch (action.type) {
        case "CONTROL":
          if (action.value === "EXE") handleEvaluate();
          if (action.value === "DEL") { dispatch({ type: "BACKSPACE" }); setIsError(false); }
          if (action.value === "AC")  { dispatch({ type: "CLEAR" }); setIsError(false); }
          if (action.value === "EXIT") {
            if (currentMode !== "RUN_MAT") setMode("RUN_MAT");
            else setMode("MENU");
          }
          if (action.value === "MENU") setMode("MENU");
          break;
        case "DIGIT":
        case "OPERATOR":
          insertToken(action.value);
          setIsError(false);
          break;
        case "FUNCTION": {
          const template = action.value.endsWith("(") ? `${action.value})` : action.value;
          insertToken(template, action.value.endsWith("(") ? 1 : 0);
          setIsError(false);
          break;
        }
        case "FKEY":
          handleClick(action.value.toLowerCase());
          break;
        case "DPAD":
          if (action.value !== "CENTER") moveCursor(action.value);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, handleEvaluate, currentMode, setMode, handleClick, insertToken, moveCursor, setIsError]);

  const handleNav = useCallback((dir: string) => {
    if (currentMode === "RUN_MAT") {
      if (dir === "CENTER") handleEvaluate();
      else if (["UP", "DOWN", "LEFT", "RIGHT"].includes(dir)) {
        moveCursor(dir as "UP" | "DOWN" | "LEFT" | "RIGHT");
      }
      return;
    }
    if (currentMode === "MENU") {
      const keyMap: Record<string, string> = { UP: "ArrowUp", DOWN: "ArrowDown", LEFT: "ArrowLeft", RIGHT: "ArrowRight", CENTER: "Enter" };
      const key = keyMap[dir];
      if (key) window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    } else {
      window.dispatchEvent(new CustomEvent("casio-nav", { detail: dir }));
    }
  }, [currentMode, handleEvaluate, moveCursor]);

  // ── Display ──────────────────────────────────────────────────────────────────
  const showResult = calcState.result !== "";
  const isMenuMode = currentMode === "MENU";
  const isRunMode = currentMode === "RUN_MAT";

  return (
    <div
      className="casio-body select-none overflow-hidden flex flex-col"
      style={{
        width: 368,
        borderRadius: "22px",
        border: "2px solid #3a4050",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        padding: "14px 14px 18px 14px",
        gap: 0,
        cursor: "default",
      }}
    >
      {/* ── Brand strip ───────────────────────────────── */}
      <div className="flex items-center justify-between px-2 mb-2 shrink-0">
        <div>
          <div className="text-[15px] font-black tracking-[0.22em] text-white" style={{ fontFamily: "system-ui, sans-serif" }}>
            CASIO
          </div>
          <div className="text-[8px] text-[#4a6080] tracking-[0.18em] font-medium mt-[-1px]">
            GRAPHING CALCULATOR
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold tracking-[0.12em] text-[#7090c0]">fx-CG50</div>
          <div className="text-[7px] text-[#384858] tracking-[0.12em]">NATURAL DISPLAY</div>
        </div>
      </div>

      {/* ── LCD Frame ────────────────────────────────── */}
      <div
        className="shrink-0 mb-3"
        style={{
          borderRadius: 8,
          padding: "6px",
          background: "linear-gradient(175deg, #1e2838 0%, #141c28 100%)",
          border: "2px solid #0a1018",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* LCD screen — fills remaining space */}
        <div style={{ height: 250, borderRadius: 4, overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={isMenuMode ? "menu" : "calc"}
              className="h-full"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
            >
              {poweredOff ? (
                <div className="h-full bg-[#020407]" aria-label="Calculator powered off" />
              ) : isMenuMode ? (
                <CasioMenuScreen onSelect={(mode) => setMode(mode)} />
              ) : !isRunMode ? (
                <CasioModeScreen mode={currentMode} />
              ) : (
                <CasioScreen
                  expression={calcState.expression}
                  result={showResult ? calcState.result : ""}
                  isError={isError}
                  cursorPosition={calcState.cursorPosition}
                  modeTitle="RUN-MAT"
                  fKeyLabels={currentFKeyLabels}
                  onFKey={handleClick}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── F-Key Row ─────────────────────────────────── */}
      <div className="px-1 shrink-0" style={{ marginBottom: 16 }}>
        <FKeyBar onFKey={handleClick} />
      </div>

      {/* ── Main keypad + D-pad ───────────────────────── */}
      <div className="flex shrink-0 px-1" style={{ gap: 16, marginBottom: 14 }}>
        {/* Keypad columns */}
        <div className="flex-1 flex flex-col" style={{ gap: 20 }}>
          {keyRows.slice(0, 5).map((row, ri) => (
            <div key={ri} className="grid" style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)`, gap: 11 }}>
              {row.map((btn) => (
                <CalcKey
                  key={btn.action + btn.label + ri}
                  btn={btn}
                  onClick={handleClick}
                  shiftActive={shiftActive}
                  alphaActive={alphaActive}
                  isNumericPad={false}
                />
              ))}
            </div>
          ))}
        </div>

        {/* D-pad — right side */}
        <div className="flex flex-col items-center justify-center shrink-0" style={{ width: 84 }}>
          <DPad onNav={handleNav} />
        </div>
      </div>

      {/* ── Numeric rows ──────────────────────────────── */}
      <div className="px-1 flex flex-col" style={{ gap: 16 }}>
        {keyRows.slice(5).map((row, ri) => (
          <div key={ri} className="grid" style={{ gridTemplateColumns: `repeat(${row.length}, 1fr)`, gap: 11 }}>
            {row.map((btn) => (
              <CalcKey
                key={btn.action + btn.label + ri}
                btn={btn}
                onClick={handleClick}
                shiftActive={shiftActive}
                alphaActive={alphaActive}
                isNumericPad={true}
              />
            ))}
          </div>
        ))}
      </div>

      {/* ── Bottom ridge ──────────────────────────────── */}
      <div className="mt-3 mx-4 h-[3px] rounded-full opacity-20"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)" }} />
    </div>
  );
}
