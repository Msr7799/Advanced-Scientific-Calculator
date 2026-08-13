import { create } from "zustand";
import type { AgentMessage, WorkflowSpec } from "@/types/agent";

interface AgentStore {
  open: boolean;
  view: "chat" | "workflow";
  busy: boolean;
  messages: AgentMessage[];
  workflow: WorkflowSpec | null;
  setOpen: (open: boolean) => void;
  setView: (view: "chat" | "workflow") => void;
  setBusy: (busy: boolean) => void;
  addMessage: (message: Omit<AgentMessage, "id" | "createdAt">) => void;
  setWorkflow: (workflow: WorkflowSpec) => void;
  clear: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  open: false,
  view: "chat",
  busy: false,
  messages: [],
  workflow: null,
  setOpen: (open) => set({ open }),
  setView: (view) => set({ view }),
  setBusy: (busy) => set({ busy }),
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, { ...message, id: crypto.randomUUID(), createdAt: Date.now() }].slice(-20),
  })),
  setWorkflow: (workflow) => set({ workflow, view: "workflow" }),
  clear: () => set({ messages: [], workflow: null, view: "chat" }),
}));
