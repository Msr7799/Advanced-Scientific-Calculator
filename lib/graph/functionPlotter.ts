import { parseExpressionToAst } from "@/lib/parser/evaluator";
import { AstNode } from "@/lib/parser/ast";

export interface PlotPoint {
  x: number;
  y: number | null; // null marks a discontinuity (NaN/Infinity/out of range)
}

export interface PlotSeries {
  id: string;
  expression: string;
  color: string;
  points: PlotPoint[];
  error?: string;
}

const constants: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  Infinity: Infinity,
};

function evalNode(node: AstNode, x: number): number {
  switch (node.type) {
    case "NumberLiteral":
      return node.value;
    case "Constant":
      return constants[node.name] ?? NaN;
    case "Variable":
      return node.name === "x" ? x : NaN;
    case "UnaryExpression": {
      const v = evalNode(node.argument, x);
      return node.operator === "-" ? -v : v;
    }
    case "BinaryExpression": {
      const l = evalNode(node.left, x);
      const r = evalNode(node.right, x);
      switch (node.operator) {
        case "+": return l + r;
        case "-": return l - r;
        case "*": return l * r;
        case "/": return l / r;
        case "%": return l % r;
        case "^": return Math.pow(l, r);
        default: return NaN;
      }
    }
    case "FunctionCall": {
      const args = node.args.map((a) => evalNode(a, x));
      switch (node.name) {
        case "sin": return Math.sin(args[0]);
        case "cos": return Math.cos(args[0]);
        case "tan": return Math.tan(args[0]);
        case "asin": return Math.asin(args[0]);
        case "acos": return Math.acos(args[0]);
        case "atan": return Math.atan(args[0]);
        case "sinh": return Math.sinh(args[0]);
        case "cosh": return Math.cosh(args[0]);
        case "tanh": return Math.tanh(args[0]);
        case "ln": return Math.log(args[0]);
        case "log": return Math.log10(args[0]);
        case "sqrt": return Math.sqrt(args[0]);
        case "abs": return Math.abs(args[0]);
        case "exp": return Math.exp(args[0]);
        case "root": return Math.pow(args[0], 1 / (args[1] ?? 2));
        default: return NaN;
      }
    }
    default:
      return NaN;
  }
}

/**
 * Samples a single-variable expression f(x) across [xMin, xMax] at the given
 * pixel resolution. Discontinuities (NaN/Infinite results, or large jumps that
 * indicate an asymptote) are represented as null so the renderer can break the
 * line instead of drawing a vertical spike.
 */
export function sampleFunction(
  expression: string,
  xMin: number,
  xMax: number,
  samples: number
): PlotSeries["points"] {
  const ast = parseExpressionToAst(expression.replace(/×/g, "*").replace(/÷/g, "/"));
  const points: PlotPoint[] = [];
  const step = (xMax - xMin) / samples;

  let prevY: number | null = null;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + i * step;
    let y: number;
    try {
      y = evalNode(ast, x);
    } catch {
      y = NaN;
    }
    if (!Number.isFinite(y)) {
      points.push({ x, y: null });
      prevY = null;
      continue;
    }
    // Detect asymptote-like jumps (e.g. tan(x)) by comparing slope magnitude
    if (prevY !== null && Math.abs(y - prevY) > (xMax - xMin) * 5) {
      points.push({ x, y: null });
      prevY = y;
      continue;
    }
    points.push({ x, y });
    prevY = y;
  }
  return points;
}

export function buildSeries(
  expressions: { id: string; expression: string; color: string }[],
  xMin: number,
  xMax: number,
  samples: number
): PlotSeries[] {
  return expressions.map(({ id, expression, color }) => {
    if (!expression.trim()) {
      return { id, expression, color, points: [] };
    }
    try {
      const points = sampleFunction(expression, xMin, xMax, samples);
      return { id, expression, color, points };
    } catch (err) {
      return {
        id,
        expression,
        color,
        points: [],
        error: err instanceof Error ? err.message : "Invalid expression",
      };
    }
  });
}
