import type { CasioMode } from "@/types/calculator";

export type AgentRole = "user" | "assistant" | "system";

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  createdAt: number;
  model?: string;
  toolNames?: string[];
}

export interface AgentToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AgentContext {
  mode: CasioMode;
  expression?: string;
  result?: string;
  angleMode: "DEG" | "RAD" | "GRD";
  variables?: Record<string, number>;
  graphEquations?: Array<{ id: string; expression: string; visible: boolean }>;
  pythonFile?: { name: string; code: string };
}

export interface AgentTurnResponse {
  text: string;
  model: string;
  toolCalls: AgentToolCall[];
  quota: { remainingMinute: number; remainingDay: number };
}

export interface WorkflowSpec {
  title: string;
  nodes: Array<{ id: string; type: string; label: string; value?: string }>;
  edges: Array<{ id: string; source: string; target: string }>;
}
