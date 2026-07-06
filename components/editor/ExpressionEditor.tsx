"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAppState, useAppDispatch } from "@/lib/state/appState";

const syntaxTokens = ["+", "-", "*", "/", "^", "(", ")", "%", "pi", "e", "ans"];

function renderToken(token: string) {
  if (/[0-9]/.test(token)) {
    return <span className="text-slate-100">{token}</span>;
  }
  if (token === "(") {
    return <span className="text-sky-300">{token}</span>;
  }
  if (token === ")") {
    return <span className="text-fuchsia-300">{token}</span>;
  }
  if (syntaxTokens.includes(token)) {
    return <span className="text-emerald-300">{token}</span>;
  }
  return <span className="text-slate-100">{token}</span>;
}

function splitExpression(expression: string) {
  const tokens: string[] = [];
  let buffer = "";
  for (const char of expression) {
    if (syntaxTokens.includes(char) && buffer.length > 0) {
      tokens.push(buffer);
      buffer = char;
      tokens.push(buffer);
      buffer = "";
    } else if (syntaxTokens.includes(char)) {
      if (buffer.length > 0) {
        tokens.push(buffer);
      }
      tokens.push(char);
      buffer = "";
    } else {
      buffer += char;
    }
  }
  if (buffer.length > 0) {
    tokens.push(buffer);
  }
  return tokens;
}

export default function ExpressionEditor() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const expressionTokens = useMemo(() => splitExpression(state.expression), [state.expression]);

  const selectionRange = useMemo(() => {
    if (state.selectionStart === null || state.selectionEnd === null) {
      return null;
    }
    const start = Math.min(state.selectionStart, state.selectionEnd);
    const end = Math.max(state.selectionStart, state.selectionEnd);
    return { start, end };
  }, [state.selectionStart, state.selectionEnd]);

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
    [dispatch, state.cursorIndex, state.expression.length]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text");
      dispatch({ type: "INSERT_TEXT", payload: text });
    },
    [dispatch]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (!target.dataset.index) {
        return;
      }
      const index = Number(target.dataset.index);
      dispatch({ type: "SET_CURSOR", payload: index });
      dispatch({ type: "SET_SELECTION", payload: { start: index, end: index } });
    },
    [dispatch]
  );

  const chars = state.expression.split("");

  return (
    <div className="rounded-3xl border border-slate-700/80 bg-slate-950/90 p-4 shadow-inner shadow-slate-950/30">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em] text-slate-500">
        <span>Expression Editor</span>
        <span>Cursor: {state.cursorIndex}</span>
      </div>
      <div
        role="textbox"
        tabIndex={0}
        aria-label="Expression editor"
        className="min-h-[6rem] cursor-text rounded-3xl border border-slate-800 bg-slate-900/90 p-4 text-lg leading-relaxed outline-none focus:border-sky-500/70 focus:ring-2 focus:ring-sky-500/10"
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onMouseDown={handleMouseDown}
      >
        <div className="flex flex-wrap gap-0">
          {chars.map((char, index) => {
            const isSelected = selectionRange ? index >= selectionRange.start && index < selectionRange.end : false;
            return (
              <span
                key={`${char}-${index}`}
                data-index={index}
                className={
                  "inline-flex items-center justify-center whitespace-pre px-[0.125rem] py-[0.15rem] text-base " +
                  (isSelected
                    ? "bg-sky-500/20 text-sky-100"
                    : index === state.cursorIndex
                    ? "border-l border-slate-500 text-white"
                    : "text-slate-100")
                }
              >
                {renderToken(char)}
              </span>
            );
          })}
          {state.cursorIndex === chars.length && (
            <span className="inline-block h-6 w-0.5 bg-slate-100 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
