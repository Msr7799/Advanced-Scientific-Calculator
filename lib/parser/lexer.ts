export type TokenType =
  | "number"
  | "operator"
  | "identifier"
  | "function"
  | "constant"
  | "paren"
  | "comma"
  | "matrix"
  | "unknown";

export interface Token {
  type: TokenType;
  value: string;
}

const operatorChars = "+-*/%^=";
const identifiers = [
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "tanh",
  "ln",
  "log",
  "sqrt",
  "cbrt",
  "nthRoot",
  "frac",
  "abs",
  "exp",
  "pow",
  "root",
  "factorial",
  "pi",
  "e",
  "Infinity",
  "mod",
  "pct",
  "integral",
  "integrate",
  "sum",
  "sigma",
  "derivative",
];

function isDigit(char: string) {
  return /[0-9]/.test(char);
}

function isAlpha(char: string) {
  return /[a-zA-Z]/.test(char);
}

function isWhitespace(char: string) {
  return /\s/.test(char);
}

export function lex(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  const sanitized = input.replace(/×/g, "*").replace(/÷/g, "/");

  while (index < sanitized.length) {
    const char = sanitized[index];

    if (isWhitespace(char)) {
      index += 1;
      continue;
    }

    if (isDigit(char) || (char === "." && isDigit(sanitized[index + 1] ?? ""))) {
      let value = char;
      index += 1;
      while (index < sanitized.length && /[0-9.]/.test(sanitized[index])) {
        value += sanitized[index];
        index += 1;
      }
      tokens.push({ type: "number", value });
      continue;
    }

    if (char === "∫" || char === "Σ") {
      tokens.push({ type: "function", value: char });
      index += 1;
      continue;
    }

    if (operatorChars.includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: char });
      index += 1;
      continue;
    }

    if (char === "[") {
      let matrixValue = char;
      index += 1;
      while (index < sanitized.length && sanitized[index] !== "]") {
        matrixValue += sanitized[index];
        index += 1;
      }
      matrixValue += sanitized[index] ?? "";
      tokens.push({ type: "matrix", value: matrixValue });
      index += 1;
      continue;
    }

    if (isAlpha(char)) {
      let value = char;
      index += 1;
      while (index < sanitized.length && (isAlpha(sanitized[index]) || isDigit(sanitized[index]))) {
        value += sanitized[index];
        index += 1;
      }
      const normalized = value;
      if (identifiers.includes(normalized)) {
        const type = ["pi", "e", "Infinity"].includes(normalized) ? "constant" : normalized === "mod" ? "operator" : "function";
        tokens.push({ type, value: normalized });
      } else {
        tokens.push({ type: "identifier", value: normalized });
      }
      continue;
    }

    tokens.push({ type: "unknown", value: char });
    index += 1;
  }

  return tokens;
}
