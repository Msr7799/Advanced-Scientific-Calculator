import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CasioMode, GraphEquation, HistoryEntry } from "@/types/calculator";

// ─── State shape ────────────────────────────────────────────────────────────
interface CasioStore {
  // Mode navigation
  currentMode: CasioMode;
  previousMode: CasioMode;
  setMode: (mode: CasioMode) => void;
  goBack: () => void;
  runMatFKeyMenu: "main" | "more" | "calc" | "algb" | "optn" | "optn2" | "vars";
  setRunMatFKeyMenu: (menu: CasioStore["runMatFKeyMenu"]) => void;

  // Modifier keys
  shiftActive: boolean;
  alphaActive: boolean;
  toggleShift: () => void;
  toggleAlpha: () => void;
  clearModifiers: () => void;

  // Angle mode
  angleMode: "DEG" | "RAD" | "GRD";
  setAngleMode: (mode: "DEG" | "RAD" | "GRD") => void;
  cycleAngleMode: () => void;

  // Memory
  memory: number;
  storeMemory: (val: number) => void;
  addMemory: (val: number) => void;
  subtractMemory: (val: number) => void;
  clearMemory: () => void;
  recallMemory: () => number;

  variables: Record<string, number>;
  setVariable: (name: string, value: number) => void;

  // History
  history: HistoryEntry[];
  addHistory: (entry: Omit<HistoryEntry, "id" | "createdAt" | "pinned">) => void;
  clearHistory: () => void;
  pinHistory: (id: string) => void;
  removeHistory: (id: string) => void;

  // Graph equations
  graphEquations: GraphEquation[];
  setGraphEquation: (id: string, expr: string) => void;
  addGraphEquation: () => void;
  removeGraphEquation: (id: string) => void;
  toggleGraphEquation: (id: string) => void;

  // Last answer
  lastAnswer: number;
  setLastAnswer: (val: number) => void;
}

const GRAPH_COLORS = [
  "#e05c5c", // Y1 – red
  "#4a9de0", // Y2 – blue
  "#5cba5a", // Y3 – green
  "#e0a040", // Y4 – orange
  "#b05ce0", // Y5 – purple
  "#40c8c0", // Y6 – teal
];

function makeEquation(index: number): GraphEquation {
  return {
    id: `Y${index + 1}`,
    expression: "",
    color: GRAPH_COLORS[index % GRAPH_COLORS.length],
    visible: true,
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────
export const useCasioStore = create<CasioStore>()(
  persist(
    (set, get) => ({
      // Mode
      currentMode: "MENU",
      previousMode: "MENU",
      setMode: (mode) =>
        set((s) => ({ currentMode: mode, previousMode: s.currentMode })),
      goBack: () =>
        set((s) => ({ currentMode: s.previousMode, previousMode: "MENU" })),
      runMatFKeyMenu: "main",
      setRunMatFKeyMenu: (menu) => set({ runMatFKeyMenu: menu }),

      // Modifiers
      shiftActive: false,
      alphaActive: false,
      toggleShift: () =>
        set((s) => ({
          shiftActive: !s.shiftActive,
          alphaActive: false,
        })),
      toggleAlpha: () =>
        set((s) => ({
          alphaActive: !s.alphaActive,
          shiftActive: false,
        })),
      clearModifiers: () => set({ shiftActive: false, alphaActive: false }),

      // Angle
      angleMode: "DEG",
      setAngleMode: (mode) => set({ angleMode: mode }),
      cycleAngleMode: () =>
        set((s) => ({
          angleMode:
            s.angleMode === "DEG"
              ? "RAD"
              : s.angleMode === "RAD"
              ? "GRD"
              : "DEG",
        })),

      // Memory
      memory: 0,
      storeMemory: (val) => set({ memory: val }),
      addMemory: (val) => set((s) => ({ memory: s.memory + val })),
      subtractMemory: (val) => set((s) => ({ memory: s.memory - val })),
      clearMemory: () => set({ memory: 0 }),
      recallMemory: () => get().memory,

      variables: { x: 0, y: 0, z: 0 },
      setVariable: (name, value) => set((state) => ({
        variables: { ...state.variables, [name.toLowerCase()]: value },
      })),

      // History
      history: [],
      addHistory: (entry) =>
        set((s) => ({
          history: [
            {
              ...entry,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              pinned: false,
            },
            ...s.history,
          ].slice(0, 50),
        })),
      clearHistory: () => set({ history: [] }),
      pinHistory: (id) =>
        set((s) => ({
          history: s.history.map((h) =>
            h.id === id ? { ...h, pinned: !h.pinned } : h
          ),
        })),
      removeHistory: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),

      // Graph equations
      graphEquations: [0, 1, 2].map(makeEquation),
      setGraphEquation: (id, expr) =>
        set((s) => ({
          graphEquations: s.graphEquations.map((eq) =>
            eq.id === id ? { ...eq, expression: expr } : eq
          ),
        })),
      addGraphEquation: () =>
        set((s) => {
          if (s.graphEquations.length >= 6) return s;
          return {
            graphEquations: [
              ...s.graphEquations,
              makeEquation(s.graphEquations.length),
            ],
          };
        }),
      removeGraphEquation: (id) =>
        set((s) => ({
          graphEquations: s.graphEquations.filter((eq) => eq.id !== id),
        })),
      toggleGraphEquation: (id) =>
        set((s) => ({
          graphEquations: s.graphEquations.map((eq) =>
            eq.id === id ? { ...eq, visible: !eq.visible } : eq
          ),
        })),

      // Last answer
      lastAnswer: 0,
      setLastAnswer: (val) => set({ lastAnswer: val }),
    }),
    {
      name: "casio-fg50-store",
      partialize: (s) => ({
        angleMode: s.angleMode,
        memory: s.memory,
        history: s.history,
        graphEquations: s.graphEquations,
        lastAnswer: s.lastAnswer,
        variables: s.variables,
      }),
    }
  )
);
