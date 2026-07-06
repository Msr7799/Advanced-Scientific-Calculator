"use client";

import { useAppState } from "@/lib/state/appState";

export default function PlaceholderMode() {
  const state = useAppState();

  return (
    <div className="rounded-3xl border border-dashed border-slate-600/70 bg-slate-900/80 p-8 text-center text-slate-300 shadow-inner shadow-slate-950/20">
      <div className="mx-auto max-w-xl">
        <div className="text-4xl">🚧</div>
        <h2 className="mt-4 text-2xl font-semibold text-white">{state.currentMode.charAt(0).toUpperCase() + state.currentMode.slice(1)} Mode</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          This mode is configured in the system architecture and will be built out in later phases.
        </p>
      </div>
    </div>
  );
}
