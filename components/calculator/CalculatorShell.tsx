"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import { useCalculatorDispatch, useCalculatorState } from "@/lib/state/calculatorState";
import { calculate } from "@/lib/math/engine";
import { useAppState } from "@/lib/state/appState";

// ─── Types ────────────────────────────────────────────────────────────────────
type BtnVariant = "default" | "fn" | "blue" | "orange" | "shift" | "enter" | "ac";

interface CalcBtn {
  label: string;
  shiftLabel?: string;
  alphaLabel?: string;
  sub?: string;
  action: string;
  variant?: BtnVariant;
}

// ─── Keyboard Layout (Casio fx-991ARX style, 5 columns) ─────────────────────
const keyRows: CalcBtn[][] = [
  // Row 1 – SHIFT / ALPHA / nav / integral / Sigma
  [
    { label: "SHIFT",   action: "shift",    variant: "shift" },
    { label: "ALPHA",   action: "alpha",    variant: "fn",    shiftLabel: "LOCK" },
    { label: "MENU",    action: "menu",     variant: "fn" },
    { label: "SETUP",   action: "setup",    variant: "fn" },
    { label: "ON",      action: "on",       variant: "fn" },
  ],
  // Row 2 – OPTN / CALC / function keys
  [
    { label: "OPTN",    action: "optn",     variant: "fn" },
    { label: "CALC",    action: "calc",     variant: "fn",    shiftLabel: "SOLVE" },
    { label: "∫dx",     action: "integral", variant: "fn",    shiftLabel: "d/dx" },
    { label: "Σ",       action: "sigma",    variant: "fn",    shiftLabel: "Π" },
    { label: "√",       action: "sqrt(",    variant: "fn",    shiftLabel: "ˣ√" },
  ],
  // Row 3 – math functions top
  [
    { label: "x²",      action: "^2",       variant: "fn",    shiftLabel: "x³" },
    { label: "^",       action: "^",        variant: "fn",    shiftLabel: "xʸ" },
    { label: "log",     action: "log(",     variant: "fn",    shiftLabel: "10ˣ" },
    { label: "ln",      action: "ln(",      variant: "fn",    shiftLabel: "eˣ" },
    { label: "(−)",     action: "(-",       variant: "fn",    shiftLabel: "A" },
  ],
  // Row 4 – trig
  [
    { label: "sin",     action: "sin(",     variant: "fn",    shiftLabel: "sin⁻¹",  alphaLabel: "D" },
    { label: "cos",     action: "cos(",     variant: "fn",    shiftLabel: "cos⁻¹",  alphaLabel: "E" },
    { label: "tan",     action: "tan(",     variant: "fn",    shiftLabel: "tan⁻¹",  alphaLabel: "F" },
    { label: "(",       action: "(",        variant: "fn",    alphaLabel: "{" },
    { label: ")",       action: ")",        variant: "fn",    alphaLabel: "}" },
  ],
  // Row 5 – STO / RCL / ENG / ° / hyp
  [
    { label: "STO",     action: "sto",      variant: "fn",    shiftLabel: "RCL" },
    { label: "ENG",     action: "eng",      variant: "fn" },
    { label: "°'''",    action: "deg_sym",  variant: "fn" },
    { label: "hyp",     action: "hyp",      variant: "fn" },
    { label: "M+",      action: "m+",       variant: "fn",    shiftLabel: "M-" },
  ],
  // Row 6 – 7 8 9 DEL AC
  [
    { label: "7",       action: "7" },
    { label: "8",       action: "8" },
    { label: "9",       action: "9" },
    { label: "DEL",     action: "backspace", variant: "blue" },
    { label: "AC",      action: "clear",    variant: "ac" },
  ],
  // Row 7 – 4 5 6 × ÷
  [
    { label: "4",       action: "4" },
    { label: "5",       action: "5" },
    { label: "6",       action: "6" },
    { label: "×",       action: "*",        variant: "fn" },
    { label: "÷",       action: "/",        variant: "fn" },
  ],
  // Row 8 – 1 2 3 + −
  [
    { label: "1",       action: "1" },
    { label: "2",       action: "2" },
    { label: "3",       action: "3" },
    { label: "+",       action: "+",        variant: "fn" },
    { label: "−",       action: "-",        variant: "fn" },
  ],
  // Row 9 – 0 . ×10ˣ Ans =
  [
    { label: "0",       action: "0" },
    { label: ".",       action: "." },
    { label: "×10ˣ",   action: "e_sci",    variant: "fn" },
    { label: "Ans",     action: "ans",      variant: "fn" },
    { label: "=",       action: "enter",    variant: "enter" },
  ],
];

// ─── Button style lookup ─────────────────────────────────────────────────────
function getBtnClass(variant: BtnVariant = "default"): string {
  const base =
    "relative flex flex-col items-center justify-center rounded-[5px] transition-all duration-75 calc-btn cursor-pointer select-none border font-medium ";
  switch (variant) {
    case "shift":
      return base + "bg-gradient-to-b from-[#e8b820] to-[#c89a0a] border-[#9a7000] text-[#1c1000] shadow-[0_3px_0_#7a5400]";
    case "fn":
      return base + "bg-gradient-to-b from-[#2c303c] to-[#22252f] border-[#3a3e4c] text-slate-200 text-[10px] shadow-[0_3px_0_#10121a] hover:from-[#363a48] active:translate-y-[1px] active:shadow-[0_1px_0_#10121a]";
    case "blue":
      return base + "bg-gradient-to-b from-[#1c70d0] to-[#1458a8] border-[#0c3880] text-white text-[11px] shadow-[0_3px_0_#082060] hover:from-[#2080e0] active:translate-y-[1px] active:shadow-[0_1px_0_#082060]";
    case "ac":
      return base + "bg-gradient-to-b from-[#1c70d0] to-[#1458a8] border-[#0c3880] text-white text-[11px] shadow-[0_3px_0_#082060] hover:from-[#2080e0] active:translate-y-[1px] active:shadow-[0_1px_0_#082060]";
    case "orange":
      return base + "bg-gradient-to-b from-[#e07820] to-[#c06010] border-[#904008] text-white shadow-[0_3px_0_#603000] hover:from-[#f08830]";
    case "enter":
      return base + "bg-gradient-to-b from-[#1c70d0] to-[#1458a8] border-[#0c3880] text-white text-[18px] font-bold shadow-[0_3px_0_#082060] hover:from-[#2080e0] active:translate-y-[1px] active:shadow-[0_1px_0_#082060]";
    default:
      // Numeric keys — light cream/white
      return base + "bg-gradient-to-b from-[#edeae2] to-[#d8d4cc] border-[#b0a898] text-[#111008] text-[15px] font-semibold shadow-[0_3px_0_#888070] hover:from-[#f5f2ea] active:translate-y-[1px] active:shadow-[0_1px_0_#888070]";
  }
}

// ─── LCD Syntax Highlighting ──────────────────────────────────────────────────
const FUNCTIONS   = ["sin","cos","tan","asin","acos","atan","sinh","cosh","tanh","ln","log","sqrt","abs","exp","root"];
const CONSTANTS_K = ["pi","ans","e"];
const OPERATORS   = ["+","-","*","/","^","%","×","÷","−"];

interface SyntaxToken { text: string; kind: "number" | "func" | "const" | "op" | "paren" | "text" }

function tokenizeDisplay(expr: string): SyntaxToken[] {
  const out: SyntaxToken[] = [];
  let i = 0;
  while (i < expr.length) {
    const rest = expr.slice(i);
    // functions
    const fn = FUNCTIONS.find((f) => rest.startsWith(f) && (rest[f.length] === "(" || rest[f.length] === undefined));
    if (fn) { out.push({ text: fn, kind: "func" }); i += fn.length; continue; }
    // constants
    const cn = CONSTANTS_K.find((c) => rest.toLowerCase().startsWith(c) && !/[a-z]/i.test(rest[c.length] ?? ""));
    if (cn) { out.push({ text: expr.slice(i, i + cn.length), kind: "const" }); i += cn.length; continue; }
    // numbers (including decimal)
    const numMatch = rest.match(/^[0-9]+(\.[0-9]*)*/);
    if (numMatch) { out.push({ text: numMatch[0], kind: "number" }); i += numMatch[0].length; continue; }
    // dot alone
    if (expr[i] === ".") { out.push({ text: ".", kind: "number" }); i++; continue; }
    // parens
    if (expr[i] === "(" || expr[i] === ")") { out.push({ text: expr[i], kind: "paren" }); i++; continue; }
    // operators
    if (OPERATORS.includes(expr[i])) { out.push({ text: expr[i], kind: "op" }); i++; continue; }
    // everything else
    out.push({ text: expr[i], kind: "text" }); i++;
  }
  return out;
}

function syntaxColorClass(kind: SyntaxToken["kind"]): string {
  switch (kind) {
    case "number": return "text-[#e8f8d0]";         // bright green-white
    case "func":   return "text-[#60e0ff]";           // cyan
    case "const":  return "text-[#ffd060]";           // yellow
    case "op":     return "text-[#ff9060]";           // orange
    case "paren":  return "text-[#c0ff80]";           // lime
    default:       return "text-[#c8e8b0]";
  }
}

// ─── LCD Display ─────────────────────────────────────────────────────────────
function LCDDisplay({ expression, result, isError, angleMode }: { expression: string; result: string; isError: boolean; angleMode?: "DEG" | "RAD" | "GRD" }) {
  const [tick, setTick] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTick((v) => !v), 530);
    return () => clearInterval(t);
  }, []);

  const tokens = useMemo(() => tokenizeDisplay(expression), [expression]);
  const displayAngle = mounted ? angleMode : "DEG";
  const angleLabel = displayAngle === "RAD" ? "R" : displayAngle === "GRD" ? "G" : "D";

  return (
    <div
      className="relative rounded-sm overflow-hidden border-[3px]"
      style={{
        background: "linear-gradient(170deg, #5aaa44 0%, #3d9030 25%, #4aa838 60%, #52b040 100%)",
        borderColor: "#1a4a10",
        boxShadow: "inset 0 3px 10px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(255,255,255,0.08), 0 0 20px rgba(80,200,60,0.15)",
        minHeight: 120,
      }}
    >
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
      }} />

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 pt-1.5 text-[9px] font-mono" style={{ color: "#1a3a0c" }}>
        <div className="flex gap-2 font-bold">
          <span>{angleLabel}</span>
          <span className="opacity-70 font-normal">Math</span>
        </div>
        <div className="flex gap-2">
          <span>▲</span>
          <span>■</span>
        </div>
      </div>

      {/* Expression area */}
      <div className="px-3 pt-1 pb-0 min-h-[40px]" style={{ color: "#0f2a08" }}>
        {expression.length === 0 ? (
          <span className="inline-block text-[14px] font-mono" style={{ color: "transparent" }}>
            _
            <span
              className="inline-block w-[2px] h-[16px] ml-[1px] align-middle"
              style={{
                background: "#1a4a10",
                opacity: tick ? 1 : 0,
                transition: "opacity 0.1s",
              }}
            />
          </span>
        ) : (
          <span className="text-[14px] font-mono leading-snug break-all">
            {tokens.map((t, i) => (
              <span key={i} className={syntaxColorClass(t.kind)} style={{ textShadow: "0 0 6px currentColor" }}>
                {t.text}
              </span>
            ))}
            <span
              className="inline-block w-[2px] h-[16px] ml-[1px] align-middle"
              style={{
                background: "#c8e8b0",
                opacity: tick ? 1 : 0,
                transition: "opacity 0.1s",
                boxShadow: "0 0 4px #c8e8b0",
              }}
            />
          </span>
        )}
      </div>

      {/* Divider */}
      {result !== "" && (
        <div className="mx-3 border-t" style={{ borderColor: "rgba(20,60,10,0.3)" }} />
      )}

      {/* Result */}
      {result !== "" && (
        <div
          className="text-right px-3 pb-2 font-mono font-bold leading-none"
          style={{
            fontSize: result.length > 14 ? 14 : result.length > 10 ? 18 : 22,
            color: isError ? "#ff6040" : "#e8f8d0",
            textShadow: isError ? "0 0 8px #ff6040" : "0 0 8px rgba(200,240,160,0.8)",
            marginTop: 4,
          }}
        >
          {result}
        </div>
      )}
    </div>
  );
}

// ─── Single Key ───────────────────────────────────────────────────────────────
function CalcKey({ btn, onClick }: { btn: CalcBtn; onClick: (a: string) => void }) {
  const isNum = /^[0-9]$/.test(btn.label);
  return (
    <button
      type="button"
      onClick={() => onClick(btn.action)}
      className={getBtnClass(btn.variant)}
      style={{ minHeight: isNum ? 42 : 36, padding: isNum ? "4px 2px" : "3px 2px" }}
      aria-label={btn.label}
    >
      {btn.shiftLabel && (
        <span className="absolute -top-3 left-0 right-0 text-center text-[8px] text-yellow-400 font-semibold leading-none pointer-events-none">
          {btn.shiftLabel}
        </span>
      )}
      {btn.alphaLabel && (
        <span className="absolute -top-3 right-0 text-[8px] text-red-400 font-semibold leading-none pointer-events-none">
          {btn.alphaLabel}
        </span>
      )}
      <span className={isNum ? "text-[15px] font-bold" : "text-[10px]"}>{btn.label}</span>
      {btn.sub && <span className="text-[7px] text-slate-500 leading-none mt-0.5">{btn.sub}</span>}
    </button>
  );
}

// ─── Calculator Shell ─────────────────────────────────────────────────────────
interface CalculatorShellProps {
  width?: number;
  height?: number;
}

export default function CalculatorShell({ width = 420, height = 760 }: CalculatorShellProps) {
  const state = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const appState = useAppState();
  const [isError, setIsError] = useState(false);

  const evalContext = useMemo(() => {
    const ctx: Record<string, any> = {
      ans: state.lastAnswer,
      angleMode: state.angleMode || "DEG",
    };
    if (appState && appState.variables) {
      for (const v of appState.variables) {
        const num = parseFloat(v.value);
        if (Number.isFinite(num)) {
          ctx[v.name] = num;
        }
      }
    }
    return ctx;
  }, [state.lastAnswer, state.angleMode, appState]);

  const handleEvaluate = useCallback(() => {
    if (!state.expression.trim()) return;
    try {
      const res = calculate(state.expression, evalContext).result;
      const num = parseFloat(res);
      // Format nicely
      let formatted = res;
      if (Number.isFinite(num)) {
        // Up to 10 sig figs
        formatted = parseFloat(num.toPrecision(10)).toString();
      }
      setIsError(false);
      dispatch({ type: "EVALUATE", payload: formatted });
    } catch (err: unknown) {
      setIsError(true);
      dispatch({ type: "SET_RESULT", payload: err instanceof Error ? err.message.replace("Error: ", "") : "Math ERROR" });
    }
  }, [dispatch, state.expression, evalContext]);

  // Keyboard
  useEffect(() => {
    const map: Record<string, string> = {
      "0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9",
      ".":".","+":" + ","-":" - ","*":"*","/":"/",
      "%":"%","^":"^","(":"(",")":")","=":"enter","Enter":"enter",
      "Backspace":"backspace","Escape":"clear","Delete":"clear",
    };
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const a = map[e.key];
      if (!a) return;
      e.preventDefault();
      if (a === "enter")     { handleEvaluate(); return; }
      if (a === "clear")     { dispatch({ type: "CLEAR" }); setIsError(false); return; }
      if (a === "backspace") { dispatch({ type: "BACKSPACE" }); setIsError(false); return; }
      dispatch({ type: "APPEND_TOKEN", payload: a });
      setIsError(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, handleEvaluate]);

  const handleClick = useCallback((action: string) => {
    setIsError(false);
    switch (action) {
      case "clear":     dispatch({ type: "CLEAR" }); break;
      case "backspace": dispatch({ type: "BACKSPACE" }); break;
      case "enter":     handleEvaluate(); break;
      case "m+":        dispatch({ type: "MEMORY_ADD",      payload: Number(state.result) || 0 }); break;
      case "m-":        dispatch({ type: "MEMORY_SUBTRACT", payload: Number(state.result) || 0 }); break;
      case "mc":        dispatch({ type: "MEMORY_CLEAR" }); break;
      case "mr":        dispatch({ type: "SET_EXPRESSION", payload: String(state.memory) }); break;
      case "ms":        dispatch({ type: "MEMORY_STORE",   payload: Number(state.result) || 0 }); break;
      case "ans":       dispatch({ type: "APPEND_TOKEN", payload: "ans" }); break;
      case "sqrt(":     dispatch({ type: "APPEND_TOKEN", payload: "sqrt(" }); break;
      case "^2":        dispatch({ type: "APPEND_TOKEN", payload: "^2" }); break;
      case "integral":  dispatch({ type: "APPEND_TOKEN", payload: "∫(" }); break;
      case "sigma":     dispatch({ type: "APPEND_TOKEN", payload: "Σ(" }); break;
      case "log(":      dispatch({ type: "APPEND_TOKEN", payload: "log(" }); break;
      case "ln(":       dispatch({ type: "APPEND_TOKEN", payload: "ln(" }); break;
      case "sin(":      dispatch({ type: "APPEND_TOKEN", payload: "sin(" }); break;
      case "cos(":      dispatch({ type: "APPEND_TOKEN", payload: "cos(" }); break;
      case "tan(":      dispatch({ type: "APPEND_TOKEN", payload: "tan(" }); break;
      case "(-":        dispatch({ type: "APPEND_TOKEN", payload: "(-" }); break;
      case "e_sci":     dispatch({ type: "APPEND_TOKEN", payload: "e" }); break;
      case "hyp":       break; // modifier — no-op
      case "sto": case "eng": case "deg_sym": case "menu": case "setup":
      case "on": case "optn": case "calc": case "alpha": case "shift":
        break;
      default:
        dispatch({ type: "APPEND_TOKEN", payload: action });
    }
  }, [dispatch, handleEvaluate, state.memory, state.result]);

  // Display expression — replace raw operators with pretty symbols
  const displayExpr = state.expression
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/−/g, "-");

  // Show result only after evaluation
  const showResult = state.result !== "0" && state.result !== "";

  return (
    <div
      className="casio-body rounded-2xl shadow-2xl border border-slate-700/40 overflow-hidden flex flex-col"
      style={{ width, height, maxHeight: "calc(100vh - 32px)", padding: 12 }}
    >
      {/* ── Brand strip ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <div>
          <div className="text-[13px] font-black tracking-[0.3em] text-white">CASIO</div>
          <div className="text-[10px] text-slate-400 tracking-widest">fx-991ARX</div>
          <div className="text-[8px] text-red-400 font-bold tracking-[0.2em] mt-0.5">CLASSWIZ</div>
        </div>
        {/* Solar cell */}
        <div className="flex gap-[3px]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="w-[18px] h-[12px] rounded-sm border border-slate-600/60"
              style={{ background: "linear-gradient(160deg,#4a5060,#282c38)" }}
            />
          ))}
        </div>
      </div>

      {/* ── LCD Screen ──────────────────────────────────── */}
      <div className="mx-4 mb-3 shrink-0" style={{ padding: "4px", background: "#1a2210", borderRadius: 6, boxShadow: "0 0 0 3px #0d1408, 0 4px 12px rgba(0,0,0,0.6)" }}>
        <LCDDisplay expression={displayExpr} result={showResult ? state.result : ""} isError={isError} angleMode={state.angleMode} />
      </div>

      {/* ── Key status labels ─────────────────────────── */}
      <div className="flex items-center justify-between px-5 pb-1 shrink-0">
        <div className="flex gap-3 text-[9px] font-bold">
          <span className="text-yellow-400">SHIFT</span>
          <span className="text-red-400">ALPHA</span>
        </div>
        <div className="flex gap-2 text-[9px] text-slate-500 font-semibold">
          <span>MENU</span>
          <span>SETUP</span>
          <span className="text-green-400">ON</span>
        </div>
      </div>

      {/* ── Keyboard ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto panel-scroll px-3 pb-4 pt-1 space-y-[6px]">
        {keyRows.map((row, ri) => (
          <div
            key={ri}
            className="grid gap-[5px]"
            style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
          >
            {row.map((btn) => (
              <CalcKey key={btn.action + btn.label + ri} btn={btn} onClick={handleClick} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
