export type AppMode =
  | "calculator" | "graph" | "matrix" | "vector" | "equation"
  | "statistics" | "probability" | "table" | "converter" | "constants" | "programming" | "calculus";

export interface VariableEntry {
  id: string;
  name: string;
  value: string;
  createdAt: string;
}

export interface ConstantEntry {
  id: string;
  name: string;
  symbol: string;
  value: string;
  category: "Mathematical" | "Physical" | "User";
  description: string;
}

export interface AppState {
  currentMode: AppMode;
  expression: string;
  result: string;
  cursorIndex: number;
  selectionStart: number | null;
  selectionEnd: number | null;
  undoStack: string[];
  redoStack: string[];
  variables: VariableEntry[];
  memoryValue: number;
  memoryHistory: string[];
  favoriteFunctions: string[];
  recentFunctions: string[];
  functionSearch: string;
  constantSearch: string;
  userConstants: ConstantEntry[];
}

export type AppAction =
  | { type: "SET_MODE"; payload: AppMode }
  | { type: "SET_EXPRESSION"; payload: string }
  | { type: "SET_RESULT"; payload: string }
  | { type: "SET_CURSOR"; payload: number }
  | { type: "SET_SELECTION"; payload: { start: number | null; end: number | null } }
  | { type: "INSERT_TEXT"; payload: string }
  | { type: "DELETE_BACKWARD" }
  | { type: "DELETE_FORWARD" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "ADD_VARIABLE"; payload: { name: string; value: string } }
  | { type: "UPDATE_VARIABLE"; payload: { id: string; name: string; value: string } }
  | { type: "REMOVE_VARIABLE"; payload: string }
  | { type: "SET_MEMORY_VALUE"; payload: number }
  | { type: "MEMORY_STORE" }
  | { type: "MEMORY_CLEAR" }
  | { type: "MEMORY_ADD" }
  | { type: "MEMORY_SUBTRACT" }
  | { type: "SET_FUNCTION_SEARCH"; payload: string }
  | { type: "TOGGLE_FAVORITE_FUNCTION"; payload: string }
  | { type: "SET_CONSTANT_SEARCH"; payload: string }
  | { type: "ADD_USER_CONSTANT"; payload: { name: string; symbol: string; value: string } }
  | { type: "REMOVE_USER_CONSTANT"; payload: string };
