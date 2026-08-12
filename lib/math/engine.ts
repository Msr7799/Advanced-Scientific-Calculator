import { create, all } from "mathjs";
import { EvaluationContext, evaluateAstExpression } from "@/lib/parser/evaluator";

export interface EvaluateResult {
  expression: string;
  result: string;
}

const math = create(all, {});

// ─── Trig wrappers that respect angle mode ─────────────────────────────────
function makeScope(angleMode: string, extra: Record<string, unknown> = {}) {
  const toRad = angleMode === "DEG"
    ? (x: number) => (x * Math.PI) / 180
    : angleMode === "GRD"
    ? (x: number) => (x * Math.PI) / 200
    : (x: number) => x;

  const fromRad = angleMode === "DEG"
    ? (x: number) => (x * 180) / Math.PI
    : angleMode === "GRD"
    ? (x: number) => (x * 200) / Math.PI
    : (x: number) => x;

  return {
    // ── constants ──────────────────────────────────────────────────────────
    pi: Math.PI,
    e:  Math.E,

    // ── forward trig (input in current angle unit) ─────────────────────────
    sin:  (x: number) => Math.sin(toRad(x)),
    cos:  (x: number) => Math.cos(toRad(x)),
    tan:  (x: number) => Math.tan(toRad(x)),
    sinh: (x: number) => Math.sinh(x),
    cosh: (x: number) => Math.cosh(x),
    tanh: (x: number) => Math.tanh(x),

    // ── inverse trig (output in current angle unit) ────────────────────────
    asin: (x: number) => fromRad(Math.asin(x)),
    acos: (x: number) => fromRad(Math.acos(x)),
    atan: (x: number) => fromRad(Math.atan(x)),

    // ── roots ─────────────────────────────────────────────────────────────
    sqrt: (x: number) => Math.sqrt(x),
    cbrt: (x: number) => Math.cbrt(x),
    nthRoot: (x: number, n: number) => Math.pow(x, 1 / n),

    // ── logarithms ────────────────────────────────────────────────────────
    log:  (x: number, base?: number) => base !== undefined ? Math.log(x) / Math.log(base) : Math.log10(x),
    ln:   (x: number) => Math.log(x),
    exp:  (x: number) => Math.exp(x),

    // ── misc ──────────────────────────────────────────────────────────────
    abs:  (x: number) => Math.abs(x),
    frac: (numerator: number, denominator: number) => numerator / denominator,
    ceil: (x: number) => Math.ceil(x),
    floor:(x: number) => Math.floor(x),
    round:(x: number) => Math.round(x),
    gcd:  (a: number, b: number): number => b === 0 ? a : math.gcd(a, b) as number,
    lcm:  (a: number, b: number): number => Math.abs(a * b) / (b === 0 ? a : math.gcd(a, b) as number),
    mod:  (a: number, b: number) => a % b,
    sum:  (...args: number[]) => args.reduce((s, v) => s + v, 0),
    min:  (...args: number[]) => Math.min(...args),
    max:  (...args: number[]) => Math.max(...args),
    mean: (...args: number[]) => args.reduce((s, v) => s + v, 0) / args.length,

    // ── placeholder for calculus (mathjs handles these internally) ────────
    integrate: (f: unknown, a: number, b: number) => {
      // Numeric integration via midpoint rule (50 steps)
      if (typeof f !== "function") return NaN;
      const n = 500;
      const h = (b - a) / n;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += (f as (x:number)=>number)(a + (i + 0.5) * h);
      return sum * h;
    },
    derivative: (f: unknown, x: number) => {
      if (typeof f !== "function") return NaN;
      const h = 1e-7;
      return ((f as (x:number)=>number)(x + h) - (f as (x:number)=>number)(x - h)) / (2 * h);
    },

    // ── caller extra vars (ans, x, etc.) ──────────────────────────────────
    ...extra,
  };
}

function normalizeExpression(expression: string): string {
  return expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi")
    .replace(/√\(/g, "sqrt(")
    .replace(/√([0-9a-zA-Z])/g, "sqrt($1)")
    .replace(/∛\(/g, "cbrt(")
    .replace(/\^2\b/g, "^2")
    .replace(/\^3\b/g, "^3")
    .trim();
}

export function calculate(expression: string, context?: EvaluationContext): EvaluateResult {
  const cleaned = normalizeExpression(expression);
  const angleMode = String(context?.angleMode || "DEG");
  const extra: Record<string, unknown> = {};
  if (context?.ans !== undefined) extra.ans = context.ans;
  if (context?.x   !== undefined) extra.x   = context.x;
  if (context?.memory !== undefined) extra.M = context.memory;

  const scope = makeScope(angleMode, extra);

  try {
    const value = math.evaluate(cleaned, scope);
    // Format result
    let result: string;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new Error("Math overflow");
      // Strip floating-point noise: up to 10 significant digits
      const fixed = parseFloat(value.toPrecision(10));
      result = fixed.toString();
    } else if (value?.toString) {
      result = value.toString();
    } else {
      result = String(value);
    }
    return { expression, result };
  } catch {
    try {
      const fallback = evaluateAstExpression(cleaned, context);
      return { expression, result: parseFloat(fallback.toPrecision(10)).toString() };
    } catch (e2: unknown) {
      throw new Error(e2 instanceof Error ? e2.message : "Math ERROR");
    }
  }
}

export function formatMemory(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}
