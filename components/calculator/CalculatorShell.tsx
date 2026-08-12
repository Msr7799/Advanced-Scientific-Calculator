"use client";

import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCalculatorDispatch, useCalculatorState } from "@/lib/state/calculatorState";
import { useCasioStore } from "@/store/calculatorStore";
import { calculate } from "@/lib/math/engine";
import { useAppState } from "@/lib/state/appState";
import CasioScreen from "@/components/display/CasioScreen";
import CasioMenuScreen from "@/components/display/CasioMenuScreen";
import type { CasioMode, CasioKeyDef } from "@/types/calculator";
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

      {/* Center */}
      <div className="dpad-center absolute w-7 h-7 rounded-full" />
    </div>
  );
}

// ─── F-key bar ────────────────────────────────────────────
function FKeyBar({ onFKey, shiftActive }: { onFKey: (key: string) => void; shiftActive: boolean }) {
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
  const appState = useAppState();
  const [isError, setIsError] = useState(false);
  const [fKeyMenu, setFKeyMenu] = useState<"main" | "calc" | "algb" | "optn" | "vars">("main");

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
          { key: "F4", label: "X" },
          { key: "F5", label: "Y" },
          { key: "F6", label: "BACK" },
        ];
      case "optn":
        return [
          { key: "F1", label: "abs" },
          { key: "F2", label: "gcd" },
          { key: "F3", label: "lcm" },
          { key: "F4", label: "mod" },
          { key: "F5", label: "logb" },
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
      ans: calcState.lastAnswer,
      angleMode: angleMode,
    };
    if (appState?.variables) {
      for (const v of appState.variables) {
        const num = parseFloat(v.value);
        if (Number.isFinite(num)) ctx[v.name] = num;
      }
    }
    return ctx;
  }, [calcState.lastAnswer, angleMode, appState]);

  const handleEvaluate = useCallback(() => {
    if (!calcState.expression.trim()) return;
    try {
      const res = calculate(calcState.expression, evalContext as Record<string, string | number>).result;
      const num = parseFloat(res);
      const formatted = Number.isFinite(num) ? parseFloat(num.toPrecision(10)).toString() : res;
      setIsError(false);
      dispatch({ type: "EVALUATE", payload: formatted });
      setLastAnswer(num);
      addHistory({ expression: calcState.expression, result: formatted });
    } catch (err: unknown) {
      setIsError(true);
      dispatch({
        type: "SET_RESULT",
        payload: err instanceof Error ? err.message.replace("Error: ", "") : "Math ERROR",
      });
    }
  }, [dispatch, calcState.expression, evalContext, setLastAnswer, addHistory]);

  // ── Button click handler ────────────────────────────────────────────────────
  const handleClick = useCallback((action: string) => {
    setIsError(false);

    // ── Modifier keys ─────────────────────────────────────────────────────────
    if (action === "shift") { toggleShift(); return; }
    if (action === "alpha") { toggleAlpha(); return; }

    const wasShift = shiftActive;
    const wasAlpha = alphaActive;
    clearModifiers();

    // ── Control ───────────────────────────────────────────────────────────────
    switch (action) {
      case "clear":     dispatch({ type: "CLEAR" }); return;
      case "backspace": dispatch({ type: "BACKSPACE" }); return;
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
        store.addMemory(Number(calcState.result) || 0); return;
      case "m-":
        store.subtractMemory(Number(calcState.result) || 0); return;
    }

    // ── Append token helpers ──────────────────────────────────────────────────
    const append = (token: string) => {
      dispatch({ type: "APPEND_TOKEN", payload: token });
    };

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
        append(wasShift ? "nthRoot(" : "^");
        break;
      case "sqrt":
        append(wasShift ? "cbrt(" : "sqrt(");
        break;
      case "nthroot":
        append("nthRoot(");
        break;

      // ── Logarithms ─────────────────────────────────────────────────────────
      case "log":
        append(wasShift ? "10^" : "log(");
        break;
      case "ln":
        append(wasShift ? "e^" : "ln(");
        break;

      // ── Trigonometry (SHIFT = inverse) ────────────────────────────────────
      case "sin":
        append(wasShift ? "asin(" : "sin(");
        break;
      case "cos":
        append(wasShift ? "acos(" : "cos(");
        break;
      case "tan":
        append(wasShift ? "atan(" : "tan(");
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
        // Inserts fraction template — show "a/b"
        append("(");
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
        append(wasShift ? "derivative(" : "integrate(");
        break;
      case "sigma":
        append("sum(");
        break;

      // ── Arrow / comma ─────────────────────────────────────────────────────
      case "arrow":
      case ",":
        append(action === "arrow" ? "→" : ",");
        break;

      // ── Memory / store / ENG ──────────────────────────────────────────────
      case "sto":
        // Stores result to memory (simplified)
        if (calcState.result) {
          store.addMemory(0); // reset then add
          store.addMemory(parseFloat(calcState.result) || 0);
        }
        break;
      case "eng":
        break;

      // ── F-keys (dynamic sub-menu navigation and token insertion) ─────────
      case "f1":
        if (fKeyMenu === "main") setFKeyMenu("calc");
        else if (fKeyMenu === "calc") append("integrate(");
        else if (fKeyMenu === "algb") append("simplify(");
        else if (fKeyMenu === "optn") append("abs(");
        else if (fKeyMenu === "vars") append("ans");
        break;
      case "f2":
        if (fKeyMenu === "main") setFKeyMenu("algb");
        else if (fKeyMenu === "calc") append("derivative(");
        else if (fKeyMenu === "algb") append("factor(");
        else if (fKeyMenu === "optn") append("gcd(");
        else if (fKeyMenu === "vars") append("memory");
        break;
      case "f3":
        if (fKeyMenu === "main") setFKeyMenu("optn");
        else if (fKeyMenu === "calc") append("derivative(derivative(");
        else if (fKeyMenu === "algb") append("expand(");
        else if (fKeyMenu === "optn") append("lcm(");
        else if (fKeyMenu === "vars") append("x");
        break;
      case "f4":
        if (fKeyMenu === "main") setMode("MENU");
        else if (fKeyMenu === "calc") append("solve(");
        else if (fKeyMenu === "algb") append("x");
        else if (fKeyMenu === "optn") append("mod(");
        else if (fKeyMenu === "vars") append("y");
        break;
      case "f5":
        if (fKeyMenu === "main") setFKeyMenu("vars");
        else if (fKeyMenu === "calc") append("sum(");
        else if (fKeyMenu === "algb") append("y");
        else if (fKeyMenu === "optn") append("log(");
        else if (fKeyMenu === "vars") append("z");
        break;
      case "f6":
        if (fKeyMenu === "main") {
          // main ▶ button: cycles or loops
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
      toggleShift, toggleAlpha, clearModifiers, shiftActive, alphaActive, currentMode,
      fKeyMenu, setFKeyMenu]);

  // ── Keyboard handler ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (currentMode === "MENU") return; // Let menu handle its own keys
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
          dispatch({ type: "APPEND_TOKEN", payload: action.value });
          setIsError(false);
          break;
        case "FUNCTION":
          dispatch({ type: "APPEND_TOKEN", payload: action.value });
          setIsError(false);
          break;
        case "FKEY":
          handleClick(action.value.toLowerCase());
          break;
        case "DPAD":
          // Could be used for cursor navigation in the future
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, handleEvaluate, currentMode, setMode, handleClick]);

  // ── Simple fraction converter ───────────────────────────────────────────────
  function toSimpleFraction(decimal: number): string | null {
    if (Number.isInteger(decimal)) return null; // already whole
    for (let denom = 2; denom <= 1000; denom++) {
      const numer = Math.round(decimal * denom);
      if (Math.abs(numer / denom - decimal) < 1e-9) {
        const g = gcd(Math.abs(numer), denom);
        return `${numer / g}/${denom / g}`;
      }
    }
    return null;
  }
  function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

  const handleNav = useCallback((dir: string) => {
    // Dispatch real keyboard events so CasioMenuScreen + other handlers receive them
    const keyMap: Record<string, string> = {
      UP: "ArrowUp",
      DOWN: "ArrowDown",
      LEFT: "ArrowLeft",
      RIGHT: "ArrowRight",
      CENTER: "Enter",
    };
    const key = keyMap[dir];
    if (key) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    }
  }, []);

  // ── Display ──────────────────────────────────────────────────────────────────
  const displayExpr = calcState.expression.replace(/\*/g, "×").replace(/\//g, "÷");
  const showResult = calcState.result !== "0" && calcState.result !== "";
  const isMenuMode = currentMode === "MENU";

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
              {isMenuMode ? (
                <CasioMenuScreen onSelect={(mode) => setMode(mode)} />
              ) : (
                <CasioScreen
                  expression={displayExpr}
                  result={showResult ? calcState.result : ""}
                  isError={isError}
                  modeTitle="RUN-MAT"
                  fKeyLabels={currentFKeyLabels}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── F-Key Row ─────────────────────────────────── */}
      <div className="px-1 shrink-0" style={{ marginBottom: 16 }}>
        <FKeyBar onFKey={(k) => handleClick(k)} shiftActive={shiftActive} />
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
