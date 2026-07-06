"use client";

import { useMemo, useState } from "react";
import { useAppState, useAppDispatch } from "@/lib/state/appState";

export default function VariablesManagerPanel() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  const filteredVariables = useMemo(() => {
    return state.variables.filter((variable) => variable.name.toLowerCase().includes(name.toLowerCase()));
  }, [state.variables, name]);

  const startEditing = (variable: { id: string; name: string; value: string }) => {
    setEditingId(variable.id);
    setName(variable.name);
    setValue(variable.value);
  };

  return (
    <div className="rounded-3xl border border-slate-700/80 bg-slate-900/90 p-4 shadow-inner shadow-slate-950/30">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Variables</div>
        <button
          type="button"
          className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
          onClick={() => dispatch({ type: "ADD_VARIABLE", payload: { name: "x", value: "0" } })}
        >
          New
        </button>
      </div>
      <div className="grid gap-3">
        <input
          type="search"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Search variables"
          className="w-full rounded-3xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
        />
        {filteredVariables.map((variable) => (
          <div key={variable.id} className="rounded-3xl border border-slate-800 bg-slate-950/90 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{variable.name}</div>
                <div className="text-xs text-slate-400">{variable.value}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
                  onClick={() => dispatch({ type: "INSERT_TEXT", payload: variable.name })}
                >
                  Recall
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
                  onClick={() => startEditing(variable)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
                  onClick={() => dispatch({ type: "REMOVE_VARIABLE", payload: variable.id })}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {editingId && (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-3">
            <div className="mb-3 text-sm uppercase tracking-[0.28em] text-slate-500">Edit Variable</div>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Variable name"
              className="w-full rounded-3xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <input
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="Value"
              className="mt-3 w-full rounded-3xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                onClick={() => {
                  if (editingId) {
                    dispatch({ type: "UPDATE_VARIABLE", payload: { id: editingId, name, value } });
                  }
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-2xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
