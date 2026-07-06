"use client";

import { createContext, useContext, useMemo, useReducer, type Dispatch, useEffect } from "react";
import { AppState, AppAction, AppMode, VariableEntry, ConstantEntry } from "@/types/app";

const initialState: AppState = {
  currentMode: "calculator",
  expression: "",
  result: "0",
  cursorIndex: 0,
  selectionStart: null,
  selectionEnd: null,
  undoStack: [],
  redoStack: [],
  variables: [],
  memoryValue: 0,
  memoryHistory: [],
  favoriteFunctions: [],
  recentFunctions: [],
  functionSearch: "",
  constantSearch: "",
  userConstants: [],
};

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<Dispatch<AppAction> | undefined>(undefined);

function pushUndo(state: AppState, expression: string): AppState {
  const undoStack = [...state.undoStack, expression].slice(-50);
  return { ...state, undoStack, redoStack: [] };
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, currentMode: action.payload };
    case "SET_EXPRESSION":
      return { ...state, expression: action.payload, cursorIndex: action.payload.length, selectionStart: null, selectionEnd: null };
    case "SET_RESULT":
      return { ...state, result: action.payload };
    case "SET_CURSOR":
      return { ...state, cursorIndex: Math.max(0, Math.min(action.payload, state.expression.length)) };
    case "SET_SELECTION":
      return { ...state, selectionStart: action.payload.start, selectionEnd: action.payload.end };
    case "INSERT_TEXT": {
      const { expression, cursorIndex, selectionStart, selectionEnd } = state;
      let next = expression;
      let nextCursor = cursorIndex;

      if (selectionStart !== null && selectionEnd !== null) {
        const start = Math.min(selectionStart, selectionEnd);
        const end = Math.max(selectionStart, selectionEnd);
        next = `${expression.slice(0, start)}${action.payload}${expression.slice(end)}`;
        nextCursor = start + action.payload.length;
      } else {
        next = `${expression.slice(0, cursorIndex)}${action.payload}${expression.slice(cursorIndex)}`;
        nextCursor = cursorIndex + action.payload.length;
      }

      const updated = pushUndo(state, expression);
      return { ...updated, expression: next, cursorIndex: nextCursor, selectionStart: null, selectionEnd: null };
    }
    case "DELETE_BACKWARD": {
      const { expression, cursorIndex, selectionStart, selectionEnd } = state;
      if (selectionStart !== null && selectionEnd !== null) {
        const start = Math.min(selectionStart, selectionEnd);
        const end = Math.max(selectionStart, selectionEnd);
        const next = `${expression.slice(0, start)}${expression.slice(end)}`;
        const updated = pushUndo(state, expression);
        return { ...updated, expression: next, cursorIndex: start, selectionStart: null, selectionEnd: null };
      }
      if (cursorIndex === 0) {
        return state;
      }
      const next = `${expression.slice(0, cursorIndex - 1)}${expression.slice(cursorIndex)}`;
      const updated = pushUndo(state, expression);
      return { ...updated, expression: next, cursorIndex: cursorIndex - 1 };
    }
    case "DELETE_FORWARD": {
      const { expression, cursorIndex, selectionStart, selectionEnd } = state;
      if (selectionStart !== null && selectionEnd !== null) {
        const start = Math.min(selectionStart, selectionEnd);
        const end = Math.max(selectionStart, selectionEnd);
        const next = `${expression.slice(0, start)}${expression.slice(end)}`;
        const updated = pushUndo(state, expression);
        return { ...updated, expression: next, cursorIndex: start, selectionStart: null, selectionEnd: null };
      }
      if (cursorIndex >= expression.length) {
        return state;
      }
      const next = `${expression.slice(0, cursorIndex)}${expression.slice(cursorIndex + 1)}`;
      const updated = pushUndo(state, expression);
      return { ...updated, expression: next };
    }
    case "UNDO": {
      if (state.undoStack.length === 0) {
        return state;
      }
      const previous = state.undoStack[state.undoStack.length - 1];
      const undoStack = state.undoStack.slice(0, -1);
      const redoStack = [...state.redoStack, state.expression].slice(-50);
      return { ...state, expression: previous, cursorIndex: previous.length, selectionStart: null, selectionEnd: null, undoStack, redoStack };
    }
    case "REDO": {
      if (state.redoStack.length === 0) {
        return state;
      }
      const next = state.redoStack[state.redoStack.length - 1];
      const redoStack = state.redoStack.slice(0, -1);
      const undoStack = [...state.undoStack, state.expression].slice(-50);
      return { ...state, expression: next, cursorIndex: next.length, selectionStart: null, selectionEnd: null, undoStack, redoStack };
    }
    case "ADD_VARIABLE": {
      const entry: VariableEntry = {
        id: crypto.randomUUID(),
        name: action.payload.name,
        value: action.payload.value,
        createdAt: new Date().toISOString(),
      };
      return { ...state, variables: [...state.variables, entry] };
    }
    case "UPDATE_VARIABLE":
      return {
        ...state,
        variables: state.variables.map((variable) =>
          variable.id === action.payload.id
            ? { ...variable, name: action.payload.name, value: action.payload.value }
            : variable
        ),
      };
    case "REMOVE_VARIABLE":
      return { ...state, variables: state.variables.filter((variable) => variable.id !== action.payload) };
    case "SET_MEMORY_VALUE":
      return { ...state, memoryValue: action.payload };
    case "MEMORY_STORE":
      return { ...state, memoryValue: Number(state.result) || 0, memoryHistory: [...state.memoryHistory, state.result].slice(-20) };
    case "MEMORY_CLEAR":
      return { ...state, memoryValue: 0 };
    case "MEMORY_ADD":
      return { ...state, memoryValue: state.memoryValue + (Number(state.result) || 0), memoryHistory: [...state.memoryHistory, state.result].slice(-20) };
    case "MEMORY_SUBTRACT":
      return { ...state, memoryValue: state.memoryValue - (Number(state.result) || 0), memoryHistory: [...state.memoryHistory, state.result].slice(-20) };
    case "SET_FUNCTION_SEARCH":
      return { ...state, functionSearch: action.payload };
    case "TOGGLE_FAVORITE_FUNCTION": {
      const favoriteFunctions = state.favoriteFunctions.includes(action.payload)
        ? state.favoriteFunctions.filter((name) => name !== action.payload)
        : [...state.favoriteFunctions, action.payload];
      return { ...state, favoriteFunctions };
    }
    case "SET_CONSTANT_SEARCH":
      return { ...state, constantSearch: action.payload };
    case "ADD_USER_CONSTANT": {
      const entry: ConstantEntry = {
        id: crypto.randomUUID(),
        name: action.payload.name,
        symbol: action.payload.symbol,
        value: action.payload.value,
        category: "User",
        description: "User-defined constant",
      };
      return { ...state, userConstants: [...state.userConstants, entry] };
    }
    case "REMOVE_USER_CONSTANT":
      return { ...state, userConstants: state.userConstants.filter((constant) => constant.id !== action.payload) };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const value = useMemo(() => state, [state]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("app-shell-state", JSON.stringify(state));
  }, [state]);

  return (
    <AppStateContext.Provider value={value}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppProvider");
  }
  return context;
}

export function useAppDispatch(): Dispatch<AppAction> {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error("useAppDispatch must be used within AppProvider");
  }
  return context;
}
