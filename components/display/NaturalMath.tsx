"use client";

import { useMemo } from "react";
import katex from "katex";

const CURSOR = "\uE000";

function findClosingParenthesis(value: string, openingIndex: number): number {
  let depth = 0;
  for (let index = openingIndex; index < value.length; index++) {
    if (value[index] === "(") depth++;
    if (value[index] === ")") depth--;
    if (depth === 0) return index;
  }
  return value.length;
}

function splitArguments(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index++) {
    if (value[index] === "(") depth++;
    if (value[index] === ")") depth--;
    if (value[index] === "," && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function cursorLatex(visible: boolean): string {
  const cursor = "\\rule{1.6px}{1.15em}";
  return visible ? `\\color{#80c8ff}{${cursor}}` : `\\phantom{${cursor}}`;
}

function functionLatex(name: string, argumentSource: string, visibleCursor: boolean): string {
  const args = splitArguments(argumentSource).map((argument) => expressionToLatex(argument, visibleCursor));
  const placeholder = "\\color{#54708c}{\\square}";
  const arg = (index: number) => args[index] || placeholder;

  switch (name) {
    case "sqrt": return `\\sqrt{${arg(0)}}`;
    case "cbrt": return `\\sqrt[3]{${arg(0)}}`;
    case "nthRoot": return `\\sqrt[${arg(1)}]{${arg(0)}}`;
    case "frac": return `\\frac{${arg(0)}}{${arg(1)}}`;
    case "nCr": return `{}^{${arg(0)}}\\mathrm{C}_{${arg(1)}}`;
    case "nPr": return `{}^{${arg(0)}}\\mathrm{P}_{${arg(1)}}`;
    case "abs": return `\\left|${arg(0)}\\right|`;
    case "asin": return `\\sin^{-1}\\left(${arg(0)}\\right)`;
    case "acos": return `\\cos^{-1}\\left(${arg(0)}\\right)`;
    case "atan": return `\\tan^{-1}\\left(${arg(0)}\\right)`;
    case "sin":
    case "cos":
    case "tan":
    case "sinh":
    case "cosh":
    case "tanh":
    case "log":
    case "ln": return `\\${name}\\left(${arg(0)}\\right)`;
    case "integral":
    case "integrate":
      return args.length >= 3
        ? `\\int_{${arg(1)}}^{${arg(2)}} ${arg(0)}\\,dx`
        : `\\int\\left(${args.join(",") || placeholder}\\right)`;
    case "derivative":
      return args.length >= 2
        ? `\\left.\\frac{d}{dx}\\left(${arg(0)}\\right)\\right|_{x=${arg(1)}}`
        : `\\frac{d}{dx}\\left(${arg(0)}\\right)`;
    case "sum":
      return args.length >= 3
        ? `\\sum_{x=${arg(1)}}^{${arg(2)}} ${arg(0)}`
        : `\\sum\\left(${args.join(",") || placeholder}\\right)`;
    case "product":
      return args.length >= 3
        ? `\\prod_{x=${arg(1)}}^{${arg(2)}} ${arg(0)}`
        : `\\prod\\left(${args.join(",") || placeholder}\\right)`;
    default:
      return `\\operatorname{${name}}\\left(${args.join(",") || placeholder}\\right)`;
  }
}

export function expressionToLatex(value: string, visibleCursor = true): string {
  let latex = "";
  let index = 0;

  while (index < value.length) {
    const character = value[index];

    if (character === CURSOR) {
      latex += cursorLatex(visibleCursor);
      index++;
      continue;
    }

    if (/[A-Za-z]/.test(character)) {
      const match = value.slice(index).match(/^[A-Za-z][A-Za-z0-9]*/);
      const name = match?.[0] ?? character;
      const nextIndex = index + name.length;
      if (value[nextIndex] === "(") {
        const closingIndex = findClosingParenthesis(value, nextIndex);
        const inner = value.slice(nextIndex + 1, closingIndex);
        latex += functionLatex(name, inner, visibleCursor);
        index = closingIndex < value.length ? closingIndex + 1 : value.length;
        continue;
      }
      const constants: Record<string, string> = { pi: "\\pi", ans: "\\mathrm{Ans}", memory: "M" };
      latex += constants[name] ?? name;
      index = nextIndex;
      continue;
    }

    if (character === "^") {
      const nextIndex = index + 1;
      if (value[nextIndex] === "(") {
        const closingIndex = findClosingParenthesis(value, nextIndex);
        latex += `^{${expressionToLatex(value.slice(nextIndex + 1, closingIndex), visibleCursor)}}`;
        index = closingIndex < value.length ? closingIndex + 1 : value.length;
      } else {
        const exponent = value[nextIndex] ?? "";
        latex += `^{${expressionToLatex(exponent, visibleCursor) || "\\square"}}`;
        index += exponent ? 2 : 1;
      }
      continue;
    }

    const replacements: Record<string, string> = {
      "*": "\\times ", "×": "\\times ", "/": "\\div ", "÷": "\\div ",
      "+": "+", "-": "-", "−": "-", "=": "=", "%": "\\%",
      "π": "\\pi", "Σ": "\\sum", "∫": "\\int", "→": "\\to",
      "(": "\\mathopen{(}", ")": "\\mathclose{)}", "[": "\\mathopen{[}", "]": "\\mathclose{]}",
      ",": ",\\,", " ": "\\,",
    };
    latex += replacements[character] ?? character.replace(/[{}_$#&]/g, "\\$&");
    index++;
  }

  return latex;
}

export function expressionWithCursorToLatex(
  expression: string,
  cursorPosition: number,
  cursorVisible = true,
): string {
  const cursor = Math.min(expression.length, Math.max(0, cursorPosition));
  const source = `${expression.slice(0, cursor)}${CURSOR}${expression.slice(cursor)}`;
  return expressionToLatex(source, cursorVisible);
}

interface NaturalMathProps {
  expression: string;
  cursorPosition?: number;
  showCursor?: boolean;
  cursorVisible?: boolean;
  className?: string;
  ariaLabel?: string;
}

export default function NaturalMath({
  expression,
  cursorPosition = expression.length,
  showCursor = false,
  cursorVisible = true,
  className = "",
  ariaLabel,
}: NaturalMathProps) {
  const markup = useMemo(() => {
    const latex = showCursor
      ? expressionWithCursorToLatex(expression, cursorPosition, cursorVisible)
      : expressionToLatex(expression, cursorVisible);
    return katex.renderToString(latex, {
      throwOnError: false,
      strict: false,
      trust: false,
      output: "html",
    });
  }, [cursorPosition, cursorVisible, expression, showCursor]);

  return (
    <span
      className={`natural-math ${className}`}
      aria-label={ariaLabel ?? expression}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
