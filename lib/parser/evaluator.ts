import { lex } from "@/lib/parser/lexer";
import { Parser } from "@/lib/parser/parser";
import { AstNode } from "@/lib/parser/ast";

export interface EvaluationContext {
  ans?: number;
  [key: string]: number | string | undefined;
}

const constants: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
  Infinity: Infinity,
};

function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0) throw new Error("Factorial requires a non-negative integer");
  if (value > 170) throw new Error("Math overflow");
  let result = 1;
  for (let index = 2; index <= value; index++) result *= index;
  return result;
}

function nthRoot(value: number, degree: number): number {
  if (!Number.isInteger(degree) || degree === 0) throw new Error("Root degree must be a non-zero integer");
  if (value < 0 && Math.abs(degree) % 2 === 0) throw new Error("Math ERROR");
  const result = Math.pow(Math.abs(value), 1 / Math.abs(degree));
  const signed = value < 0 ? -result : result;
  return degree < 0 ? 1 / signed : signed;
}

const functions: Record<string, (...args: number[]) => number> = {
  sin: (x) => Math.sin(x),
  cos: (x) => Math.cos(x),
  tan: (x) => Math.tan(x),
  asin: (x) => Math.asin(x),
  acos: (x) => Math.acos(x),
  atan: (x) => Math.atan(x),
  sinh: (x) => Math.sinh(x),
  cosh: (x) => Math.cosh(x),
  tanh: (x) => Math.tanh(x),
  ln: (x) => Math.log(x),
  log: (x) => Math.log10(x),
  sqrt: (x) => Math.sqrt(x),
  cbrt: (x) => Math.cbrt(x),
  abs: (x) => Math.abs(x),
  exp: (x) => Math.exp(x),
  root: nthRoot,
  nthRoot,
  frac: (numerator, denominator) => numerator / denominator,
  factorial,
  nCr: (n, r) => factorial(n) / (factorial(r) * factorial(n - r)),
  nPr: (n, r) => factorial(n) / factorial(n - r),
  convert: (value) => value,
};

function evaluateAst(node: AstNode, context?: EvaluationContext): number {
  switch (node.type) {
    case "NumberLiteral":
      return node.value;
    case "Constant":
      return constants[node.name] ?? 0;
    case "Variable":
      if (node.name === "ans") {
        return context?.ans ?? 0;
      }
      if (context && typeof context[node.name] === "number") {
        return context[node.name] as number;
      }
      return 0;
    case "UnaryExpression": {
      const argument = evaluateAst(node.argument, context);
      switch (node.operator) {
        case "+":
          return argument;
        case "-":
          return -argument;
        default:
          throw new Error(`Unsupported unary operator ${node.operator}`);
      }
    }
    case "BinaryExpression": {
      const left = evaluateAst(node.left, context);
      const right = evaluateAst(node.right, context);
      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "%":
        case "mod":
          return left % right;
        case "^":
          return Math.pow(left, right);
        case "pct":
          return (left * right) / 100;
        default:
          throw new Error(`Unsupported binary operator ${node.operator}`);
      }
    }
    case "FunctionCall": {
      if (node.name === "∫" || node.name === "integral" || node.name === "integrate") {
        if (node.args.length < 3) {
          throw new Error("Integral requires 3 arguments: expression, lower, upper");
        }
        const lower = evaluateAst(node.args[1], context);
        const upper = evaluateAst(node.args[2], context);
        // Numerical integration using Simpson's 1/3 rule (n = 1000 steps)
        const n = 1000;
        const h = (upper - lower) / n;
        let sum = 0;
        for (let i = 0; i <= n; i++) {
          const xVal = lower + i * h;
          const coeff = (i === 0 || i === n) ? 1 : (i % 2 === 0 ? 2 : 4);
          const val = evaluateAst(node.args[0], { ...context, x: xVal });
          sum += coeff * val;
        }
        return (h / 3) * sum;
      }
      if (node.name === "Σ" || node.name === "sigma" || node.name === "sum") {
        if (node.args.length < 3) {
          throw new Error("Sigma requires 3 arguments: expression, start, end");
        }
        const start = Math.round(evaluateAst(node.args[1], context));
        const end = Math.round(evaluateAst(node.args[2], context));
        let sum = 0;
        for (let xVal = start; xVal <= end; xVal++) {
          sum += evaluateAst(node.args[0], { ...context, x: xVal });
        }
        return sum;
      }
      if (node.name === "derivative") {
        if (node.args.length < 2) {
          throw new Error("Derivative requires 2 arguments: expression, x value");
        }
        const point = evaluateAst(node.args[1], context);
        const h = 1e-5 * Math.max(1, Math.abs(point));
        const upper = evaluateAst(node.args[0], { ...context, x: point + h });
        const lower = evaluateAst(node.args[0], { ...context, x: point - h });
        return (upper - lower) / (2 * h);
      }
      if (node.name === "product") {
        if (node.args.length < 3) throw new Error("Product requires 3 arguments: expression, start, end");
        const start = Math.round(evaluateAst(node.args[1], context));
        const end = Math.round(evaluateAst(node.args[2], context));
        let product = 1;
        for (let xVal = start; xVal <= end; xVal++) {
          product *= evaluateAst(node.args[0], { ...context, x: xVal });
        }
        return product;
      }
      if (["sin", "cos", "tan"].includes(node.name)) {
        if (node.args.length < 1) throw new Error(`${node.name} requires 1 argument`);
        let val = evaluateAst(node.args[0], context);
        const mode = context?.angleMode || "DEG";
        if (mode === "DEG") {
          val = (val * Math.PI) / 180;
        } else if (mode === "GRD") {
          val = (val * Math.PI) / 200;
        }
        return node.name === "sin" ? Math.sin(val) : node.name === "cos" ? Math.cos(val) : Math.tan(val);
      }
      if (["asin", "acos", "atan"].includes(node.name)) {
        if (node.args.length < 1) throw new Error(`${node.name} requires 1 argument`);
        const val = evaluateAst(node.args[0], context);
        let res = node.name === "asin" ? Math.asin(val) : node.name === "acos" ? Math.acos(val) : Math.atan(val);
        const mode = context?.angleMode || "DEG";
        if (mode === "DEG") {
          res = (res * 180) / Math.PI;
        } else if (mode === "GRD") {
          res = (res * 200) / Math.PI;
        }
        return res;
      }

      const args = node.args.map((child) => evaluateAst(child, context));
      const callback = functions[node.name];
      if (!callback) {
        throw new Error(`Unsupported function ${node.name}`);
      }
      return callback(...args);
    }
    case "MatrixLiteral":
      throw new Error("Matrix evaluation is not supported in numeric evaluator");
    default:
      throw new Error(`Unsupported AST node ${(node as { type: string }).type}`);
  }
}

export function parseExpressionToAst(input: string): AstNode {
  const tokens = lex(input);
  const parser = new Parser(tokens);
  return parser.parse();
}

export function evaluateAstExpression(input: string, context?: EvaluationContext): number {
  const ast = parseExpressionToAst(input);
  return evaluateAst(ast, context);
}
