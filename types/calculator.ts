export type OperationKey =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "."
  | "+" | "-" | "*" | "/" | "%" | "(" | ")" | "pi" | "e" | "ans"
  | "exp" | "sqrt" | "pow" | "root" | "square" | "cube"
  | "sin" | "cos" | "tan" | "asin" | "acos" | "atan"
  | "sinh" | "cosh" | "tanh" | "ln" | "log" | "abs"
  | "factorial" | "mod" | "pct"
  | "mc" | "mr" | "ms" | "m+" | "m-"
  | "clear" | "backspace" | "enter" | "history";

export type CasioMode =
  | "RUN_MAT"
  | "GRAPH"
  | "TABLE"
  | "EQUATION"
  | "MATRIX"
  | "VECTOR"
  | "STATISTICS"
  | "PYTHON"
  | "MENU";

export interface CalculatorState {
  expression: string;
  result: string;
  isError: boolean;
  cursorPosition: number;
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

export interface GraphEquation {
  id: string;
  expression: string;
  color: string;
  visible: boolean;
}

export interface MatrixData {
  id: string;
  name: string;
  rows: number;
  cols: number;
  data: number[][];
}

export interface StatDataset {
  id: string;
  name: string;
  xValues: number[];
  yValues: number[];
}

export interface CasioKeyDef {
  label: string;
  shiftLabel?: string;
  alphaLabel?: string;
  sub?: string;
  action: string;
  variant?: BtnVariant;
  wide?: boolean;
  tall?: boolean;
}

export type BtnVariant =
  | "default"
  | "fn"
  | "blue"
  | "orange"
  | "shift"
  | "alpha"
  | "enter"
  | "ac"
  | "numeric"
  | "dpad";
