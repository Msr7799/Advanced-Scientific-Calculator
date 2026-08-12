"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useCasioStore } from "@/store/calculatorStore";

// ─── Syntax tokenizer ────────────────────────────────────────────────────────
const FUNCTIONS = ["sin","cos","tan","asin","acos","atan","sinh","cosh","tanh","ln","log","sqrt","abs","exp","root","diff","integrate","solve","simplify","factor","expand"];
const CONSTANTS_K = ["pi","ans","e"];
const OPERATORS = ["+","-","*","/","^","%","×","÷","−","="];

interface SyntaxToken { text: string; kind: "number" | "func" | "const" | "op" | "paren" | "text" }

function tokenize(expr: string): SyntaxToken[] {
  const out: SyntaxToken[] = [];
  let i = 0;
  while (i < expr.length) {
    const rest = expr.slice(i);
    const fn = FUNCTIONS.find((f) => rest.startsWith(f) && (rest[f.length] === "(" || !rest[f.length]));
    if (fn) { out.push({ text: fn, kind: "func" }); i += fn.length; continue; }
    const cn = CONSTANTS_K.find((c) => rest.toLowerCase().startsWith(c) && !/[a-z]/i.test(rest[c.length] ?? ""));
    if (cn) { out.push({ text: expr.slice(i, i + cn.length), kind: "const" }); i += cn.length; continue; }
    const numMatch = rest.match(/^[0-9]+(\.[0-9]*)*/);
    if (numMatch) { out.push({ text: numMatch[0], kind: "number" }); i += numMatch[0].length; continue; }
    if (expr[i] === ".") { out.push({ text: ".", kind: "number" }); i++; continue; }
    if (expr[i] === "(" || expr[i] === ")") { out.push({ text: expr[i], kind: "paren" }); i++; continue; }
    if (OPERATORS.includes(expr[i])) { out.push({ text: expr[i], kind: "op" }); i++; continue; }
    out.push({ text: expr[i], kind: "text" }); i++;
  }
  return out;
}

function tokenColor(kind: SyntaxToken["kind"]): string {
  switch (kind) {
    case "number": return "#e8ffcc";
    case "func":   return "#58d8ff";
    case "const":  return "#ffe066";
    case "op":     return "#ff9060";
    case "paren":  return "#a8ff80";
    default:       return "#c8e8b0";
  }
}

// ─── F-key label strip ───────────────────────────────────────────────────────
interface FKeyLabel { key: string; label: string; color?: string }

interface CasioScreenProps {
  expression: string;
  result: string;
  isError: boolean;
  fKeyLabels?: FKeyLabel[];
  onFKey?: (key: string) => void;
  /** Screen content to render instead of default calc view (for graph/menu etc.) */
  children?: React.ReactNode;
  /** Custom title shown in status bar */
  modeTitle?: string;
}

const DEFAULT_FKEYS: FKeyLabel[] = [
  { key: "F1", label: "CALC" },
  { key: "F2", label: "ALGB" },
  { key: "F3", label: "OPTN" },
  { key: "F4", label: "MENU" },
  { key: "F5", label: "VARS" },
  { key: "F6", label: "▶" },
];

// ─── Main component ───────────────────────────────────────────────────────────
export default function CasioScreen({
  expression,
  result,
  isError,
  fKeyLabels = DEFAULT_FKEYS,
  onFKey,
  children,
  modeTitle = "RUN-MAT",
}: CasioScreenProps) {
  const [tick, setTick] = useState(true);
  const { angleMode, shiftActive, alphaActive, memory } = useCasioStore();

  useEffect(() => {
    const t = setInterval(() => setTick((v) => !v), 530);
    return () => clearInterval(t);
  }, []);

  const tokens = useMemo(() => tokenize(expression), [expression]);
  const showResult = result !== "" && result !== "0";
  const hasMemory = memory !== 0;

  return (
    <div className="casio-lcd casio-lcd-glare lcd-flicker power-on rounded-[6px] flex flex-col overflow-hidden h-full"
      style={{ background: "linear-gradient(180deg,#1a3c6a 0%,#0e2340 100%)" }}>

      {/* ── Status bar ────────────────────────────────── */}
      <div className="status-bar flex items-center justify-between px-2 py-[3px] shrink-0 select-none">
        <div className="flex items-center gap-1">
          <span className={`status-indicator ${shiftActive ? "shift-on" : "off"}`}>SHIFT</span>
          <span className={`status-indicator ${alphaActive ? "alpha-on" : "off"}`}>ALPHA</span>
          {hasMemory && (
            <span className="status-indicator" style={{ background: "rgba(80,160,80,0.3)", color: "#80e080" }}>M</span>
          )}
        </div>

        <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-[#70a8e0]">
          {modeTitle}
        </span>

        <div className="flex items-center gap-1">
          <span className="status-indicator" style={{ background: "rgba(80,120,200,0.25)", color: "#90b8f0" }}>
            {angleMode}
          </span>
          <span className="text-[9px] text-[#506080]">📶</span>
        </div>
      </div>

      {/* ── Main display area ─────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {children ? (
          <div className="absolute inset-0">{children}</div>
        ) : (
          <DefaultCalcView
            tokens={tokens}
            expression={expression}
            result={result}
            showResult={showResult}
            isError={isError}
            tick={tick}
          />
        )}
      </div>

      {/* ── F-key label strip ─────────────────────────── */}
      <div className="fkey-bar grid grid-cols-6 shrink-0 select-none border-t border-white/5" style={{ background: "rgba(8,18,36,0.3)" }}>
        {fKeyLabels.map((fk) => (
          <button
            type="button"
            key={fk.key}
            onClick={() => onFKey?.(fk.key.toLowerCase())}
            disabled={!onFKey}
            className="fkey-label fkey-screen-button py-[4px] border-r border-white/5 last:border-r-0 truncate px-0.5 text-center font-bold tracking-wider"
            style={{ color: fk.color ?? "#70a8e0", fontSize: 10 }}
            aria-label={`${fk.key}: ${fk.label}`}
          >
            {fk.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Default calculator display ───────────────────────────────────────────────
function DefaultCalcView({
  tokens, expression, result, showResult, isError, tick,
}: {
  tokens: SyntaxToken[];
  expression: string;
  result: string;
  showResult: boolean;
  isError: boolean;
  tick: boolean;
}) {
  const resultRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-full px-3 py-2">
      {/* Expression area — takes all available space */}
      <div className="flex-1 overflow-auto">
        <div
          className="font-mono text-[15px] leading-relaxed"
          style={{ wordBreak: "break-all", whiteSpace: "pre-wrap" }}
        >
          {expression.length === 0 ? (
            <span
              className="inline-block w-[2px] h-[14px] align-middle rounded-sm"
              style={{
                background: "#80c8ff",
                opacity: tick ? 1 : 0,
                transition: "opacity 0.08s",
              }}
            />
          ) : (
            <>
              {tokens.map((t, i) => (
                <span
                  key={i}
                  style={{
                    color: tokenColor(t.kind),
                    textShadow: `0 0 5px ${tokenColor(t.kind)}55`,
                  }}
                >
                  {t.text}
                </span>
              ))}
              <span
                className="inline-block w-[2px] h-[15px] ml-[1px] align-middle rounded-sm"
                style={{
                  background: "#80c8ff",
                  opacity: tick ? 1 : 0,
                  transition: "opacity 0.08s",
                  boxShadow: "0 0 5px rgba(128,200,255,0.7)",
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Result / Error — only shown when needed, pinned to bottom */}
      {(showResult || isError) && (
        <div
          ref={resultRef}
          className="shrink-0 text-right pt-2 border-t"
          style={{ borderColor: "rgba(80,140,220,0.15)" }}
        >
          {isError ? (
            <div className="text-[#ff6060] text-[13px] font-mono font-bold" style={{ textShadow: "0 0 8px #ff606055" }}>
              {result || "Math ERROR"}
            </div>
          ) : (
            <div
              className="font-mono font-bold leading-none"
              style={{
                fontSize: result.length > 14 ? 13 : result.length > 10 ? 16 : 22,
                color: "#ffffff",
                textShadow: "0 0 10px rgba(200,230,255,0.45)",
              }}
            >
              {result}
            </div>
          )}
        </div>
      )}

      {/* Ans hint when idle */}
      {!expression && !showResult && !isError && (
        <div className="shrink-0 text-right">
          <div className="text-[#1e3050] text-[11px] font-mono">Ans: 0</div>
        </div>
      )}
    </div>
  );
}
