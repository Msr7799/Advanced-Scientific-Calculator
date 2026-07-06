export type TokenType =
  | "number"
  | "operator"
  | "function"
  | "constant"
  | "paren"
  | "comma";

export interface Token {
  type: TokenType;
  value: string;
}

const functionNames = [
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
  "abs",
  "exp",
  "pow",
  "square",
  "cube",
  "factorial",
];

const constants = ["pi", "e", "Infinity"];

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const cleaned = input.replace(/\s+/g, "");
  let index = 0;

  while (index < cleaned.length) {
    const char = cleaned[index];

    if (/[0-9.]/.test(char)) {
      let number = char;
      index += 1;
      while (index < cleaned.length && /[0-9.]/.test(cleaned[index])) {
        number += cleaned[index];
        index += 1;
      }
      tokens.push({ type: "number", value: number });
      continue;
    }

    if (/[+\-*/%^]/.test(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "paren", value: "(" });
      index += 1;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "paren", value: ")" });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: "," });
      index += 1;
      continue;
    }

    const segment = cleaned.slice(index);
    const matchFunction = functionNames.find((name) => segment.startsWith(name));
    if (matchFunction) {
      tokens.push({ type: "function", value: matchFunction });
      index += matchFunction.length;
      continue;
    }

    const matchConstant = constants.find((name) => segment.startsWith(name));
    if (matchConstant) {
      tokens.push({ type: "constant", value: matchConstant });
      index += matchConstant.length;
      continue;
    }

    index += 1;
  }

  return tokens;
}
