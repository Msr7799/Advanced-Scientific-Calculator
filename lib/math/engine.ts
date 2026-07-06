import { EvaluationContext, evaluateAstExpression } from "@/lib/parser/evaluator";

export interface EvaluateResult {
  expression: string;
  result: string;
}

export function calculate(expression: string, context?: EvaluationContext): EvaluateResult {
  const value = evaluateAstExpression(expression, context);
  return { expression, result: value.toString() };
}

export function formatMemory(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}
