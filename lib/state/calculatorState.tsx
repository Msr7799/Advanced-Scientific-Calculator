"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch } from "react";
import { CalculatorState, HistoryEntry } from "@/types/calculator";

interface CalculatorAction {
  type: string;
  payload?: unknown;
}

interface StoredCalculatorState extends Partial<CalculatorState> {
  angleMode?: "DEG" | "RAD" | "GRD";
  mode?: "light" | "dark";
}

type CalculatorDispatch = Dispatch<CalculatorAction>;

const STORAGE_KEY = "advanced-calculator-state";

const initialState: CalculatorState = {
  expression: "",
  result: "",
  memory: 0,
  history: [],
  mode: "dark",
  lastAnswer: 0,
  angleMode: "DEG",
};

const CalculatorStateContext = createContext<CalculatorState | undefined>(undefined);
const CalculatorDispatchContext = createContext<CalculatorDispatch | undefined>(undefined);

function readStoredState(): CalculatorState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw ?? "{}") as StoredCalculatorState;
    const modeVal = parsed.angleMode === "RAD" ? "RAD" : parsed.angleMode === "GRD" ? "GRD" : "DEG";
    const memoryValue = typeof parsed.memory === "number" && Number.isFinite(parsed.memory)
      ? parsed.memory : Number(parsed.memory ?? 0) || 0;
    const lastAnswerValue = typeof parsed.lastAnswer === "number" && Number.isFinite(parsed.lastAnswer)
      ? parsed.lastAnswer : Number(parsed.lastAnswer ?? 0) || 0;

    return {
      ...initialState,
      expression: String(parsed.expression ?? ""),
      result: String(parsed.result ?? ""),
      memory: memoryValue,
      mode: parsed.mode === "light" ? "light" : "dark",
      lastAnswer: lastAnswerValue,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      angleMode: modeVal,
    };
  } catch {
    return undefined;
  }
}

function addHistoryEntry(state: CalculatorState, expression: string, result: string): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(), expression, result, pinned: false, createdAt: new Date().toISOString(),
  };
  return [entry, ...state.history].slice(0, 10);
}

function calculatorReducer(state: CalculatorState, action: CalculatorAction): CalculatorState {
  switch (action.type) {
    case "HYDRATE": {
      const payload = action.payload as StoredCalculatorState | undefined;
      if (!payload) return state;
      const modeVal = payload.angleMode === "RAD" ? "RAD" : payload.angleMode === "GRD" ? "GRD" : "DEG";
      const memoryValue = typeof payload.memory === "number" && Number.isFinite(payload.memory)
        ? payload.memory : Number(payload.memory ?? state.memory) || state.memory;
      const lastAnswerValue = typeof payload.lastAnswer === "number" && Number.isFinite(payload.lastAnswer)
        ? payload.lastAnswer : Number(payload.lastAnswer ?? state.lastAnswer) || state.lastAnswer;

      return {
        ...state,
        expression: String(payload.expression ?? state.expression),
        result: String(payload.result ?? state.result),
        memory: memoryValue,
        mode: payload.mode === "light" ? "light" : state.mode,
        lastAnswer: lastAnswerValue,
        history: Array.isArray(payload.history) ? payload.history : state.history,
        angleMode: modeVal,
      };
    }
    case "SET_EXPRESSION":
      return { ...state, expression: String(action.payload ?? "") };
    case "SET_RESULT":
      return { ...state, result: String(action.payload ?? "") };
    case "APPEND_TOKEN":
      return { ...state, expression: `${state.expression}${String(action.payload ?? "")}` };
    case "CLEAR":
      return { ...state, expression: "", result: "" };
    case "BACKSPACE":
      return { ...state, expression: state.expression.slice(0, -1) };
    case "EVALUATE": {
      const expression = state.expression.trim();
      const result = String(action.payload ?? state.result);
      if (!expression) return state;
      return { ...state, result, lastAnswer: Number(result) || state.lastAnswer, history: addHistoryEntry(state, expression, result) };
    }
    case "PIN_HISTORY":
      return {
        ...state,
        history: state.history.map((entry) => entry.id === String(action.payload) ? { ...entry, pinned: !entry.pinned } : entry),
      };
    case "REMOVE_HISTORY":
      return { ...state, history: state.history.filter((entry) => entry.id !== String(action.payload)) };
    case "SET_HISTORY_SEARCH":
      return state;
    case "SET_MODE":
      return { ...state, mode: action.payload === "light" ? "light" : "dark" };
    case "SET_ANGLE_MODE": {
      const modeVal = action.payload === "RAD" ? "RAD" : action.payload === "GRD" ? "GRD" : "DEG";
      return { ...state, angleMode: modeVal };
    }
    case "MEMORY_STORE":
      return { ...state, memory: Number(action.payload ?? state.memory) };
    case "MEMORY_ADD":
      return { ...state, memory: state.memory + Number(action.payload ?? 0) };
    case "MEMORY_SUBTRACT":
      return { ...state, memory: state.memory - Number(action.payload ?? 0) };
    case "MEMORY_CLEAR":
      return { ...state, memory: 0 };
    default:
      return state;
  }
}

export function CalculatorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(calculatorReducer, initialState);

  useEffect(() => {
    const stored = readStoredState();
    if (stored) dispatch({ type: "HYDRATE", payload: stored });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  const value = useMemo(() => state, [state]);

  return (
    <CalculatorStateContext.Provider value={value}>
      <CalculatorDispatchContext.Provider value={dispatch}>{children}</CalculatorDispatchContext.Provider>
    </CalculatorStateContext.Provider>
  );
}

export function useCalculatorState(): CalculatorState {
  const context = useContext(CalculatorStateContext);
  if (!context) throw new Error("useCalculatorState must be used within CalculatorProvider");
  return context;
}

export function useCalculatorDispatch(): React.Dispatch<CalculatorAction> {
  const context = useContext(CalculatorDispatchContext);
  if (!context) throw new Error("useCalculatorDispatch must be used within CalculatorProvider");
  return context;
}
