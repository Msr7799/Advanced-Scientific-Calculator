"use client";

import { createElement, useCallback, useEffect, useMemo, useRef } from "react";
import "mathlive";
import { useAppState, useAppDispatch } from "@/lib/state/appState";

export default function ExpressionEditor() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const mathfieldRef = useRef<any>(null);

  useEffect(() => {
    if (!mathfieldRef.current) return;

    const field = mathfieldRef.current as HTMLElement & {
      value?: string;
      setValue?: (value: string) => void;
      addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
      removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void;
    };

    const syncFromState = () => {
      if (field.value !== undefined && field.value !== state.expression) {
        field.value = state.expression;
      }
    };

    syncFromState();
  }, [state.expression]);

  const handleInput = useCallback(
    (event: Event) => {
      const target = event.target as HTMLElement & { value?: string };
      const nextValue = target.value ?? "";
      dispatch({ type: "SET_EXPRESSION", payload: nextValue });
    },
    [dispatch],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          dispatch({ type: "SET_CURSOR", payload: Math.max(0, state.cursorIndex - 1) });
          dispatch({ type: "SET_SELECTION", payload: { start: null, end: null } });
          break;
        case "ArrowRight":
          event.preventDefault();
          dispatch({ type: "SET_CURSOR", payload: Math.min(state.expression.length, state.cursorIndex + 1) });
          dispatch({ type: "SET_SELECTION", payload: { start: null, end: null } });
          break;
        case "Backspace":
          event.preventDefault();
          dispatch({ type: "DELETE_BACKWARD" });
          break;
        case "Delete":
          event.preventDefault();
          dispatch({ type: "DELETE_FORWARD" });
          break;
        case "z":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            dispatch({ type: "UNDO" });
          }
          break;
        case "y":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            dispatch({ type: "REDO" });
          }
          break;
        case "a":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            dispatch({ type: "SET_SELECTION", payload: { start: 0, end: state.expression.length } });
          }
          break;
        default:
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            dispatch({ type: "INSERT_TEXT", payload: event.key });
          }
          break;
      }
    },
    [dispatch, state.cursorIndex, state.expression.length],
  );

  const selectionRange = useMemo(() => {
    if (state.selectionStart === null || state.selectionEnd === null) return null;
    const start = Math.min(state.selectionStart, state.selectionEnd);
    const end = Math.max(state.selectionStart, state.selectionEnd);
    return { start, end };
  }, [state.selectionStart, state.selectionEnd]);

  return (
    <div className="rounded-3xl border border-slate-700/80 bg-slate-950/90 p-4 shadow-inner shadow-slate-950/30">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
        <span>Expression Editor</span>
        <span>MathLive</span>
      </div>
      <div
        className="min-h-[6rem] rounded-3xl border border-slate-800 bg-slate-900/90 p-4 text-lg leading-relaxed outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/10"
        onKeyDown={handleKeyDown}
      >
        {createElement("math-field", {
          ref: (element: any) => {
            mathfieldRef.current = element;
          },
          value: state.expression,
          onInput: handleInput,
          className: "w-full min-h-[4rem]",
          style: { fontSize: "1.1rem" },
        })}
        {selectionRange && (
          <div className="mt-3 text-xs text-slate-500">Selection: {selectionRange.start}-{selectionRange.end}</div>
        )}
      </div>
    </div>
  );
}
