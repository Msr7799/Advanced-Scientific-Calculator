import { GoogleGenAI } from "@google/genai";
import type { AgentContext, AgentMessage, AgentToolCall } from "@/types/agent";
import { getModelCandidates, chooseModelLane } from "@/lib/ai/model-router";
import { blockModel, reserveModelRequest } from "@/lib/ai/quota-manager";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { toolsForMode } from "@/lib/ai/tools";

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { status?: unknown; code?: unknown };
  const value = Number(candidate.status ?? candidate.code);
  return Number.isFinite(value) ? value : undefined;
}

function readableError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Gemini request failed.";
}

export async function generateAgentTurn(input: {
  message: string;
  history: AgentMessage[];
  context: AgentContext;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured on the server.");
  const ai = new GoogleGenAI({ apiKey });
  const candidates = getModelCandidates(chooseModelLane(input.message));
  let lastError = "No Gemini model is available.";

  for (const model of candidates) {
    try {
      const quota = reserveModelRequest(model);
      const contents = [
        ...input.history.slice(-8).map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content.slice(0, 6000) }] })),
        { role: "user", parts: [{ text: input.message.slice(0, 10_000) }] },
      ];
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: buildSystemPrompt(input.context),
          temperature: 0.25,
          maxOutputTokens: model.includes("pro") ? 8192 : 4096,
          tools: [{ functionDeclarations: toolsForMode(input.context.mode, input.message) }],
        },
      });
      const toolCalls: AgentToolCall[] = (response.functionCalls ?? [])
        .filter((call) => Boolean(call.name))
        .map((call, index) => ({ id: call.id ?? `${Date.now()}-${index}`, name: call.name!, args: (call.args ?? {}) as Record<string, unknown> }));
      return { text: response.text?.trim() ?? "", model, toolCalls, quota };
    } catch (error) {
      lastError = readableError(error);
      const status = getErrorStatus(error);
      if (status === 429 || status === 503 || /quota|cooling|resource_exhausted/i.test(lastError)) {
        blockModel(model);
        continue;
      }
      throw error;
    }
  }
  throw new Error(lastError);
}
