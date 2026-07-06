export type OperationKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "."
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "(" 
  | ")"
  | "pi"
  | "e"
  | "ans"
  | "exp"
  | "sqrt"
  | "pow"
  | "root"
  | "square"
  | "cube"
  | "sin"
  | "cos"
  | "tan"
  | "asin"
  | "acos"
  | "atan"
  | "sinh"
  | "cosh"
  | "tanh"
  | "ln"
  | "log"
  | "abs"
  | "factorial"
  | "mod"
  | "pct"
  | "mc"
  | "mr"
  | "ms"
  | "m+"
  | "m-"
  | "clear"
  | "backspace"
  | "enter"
  | "history";

export interface CalculatorState {
  expression: string;
  result: string;
  memory: number;
  history: HistoryEntry[];
  mode: "light" | "dark";
  lastAnswer: number;
  angleMode?: "DEG" | "RAD" | "GRD";
}

export interface HistoryEntry {
  id: string;
  expression: string;
  result: string;
  pinned: boolean;
  createdAt: string;
}
