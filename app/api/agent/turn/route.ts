import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAgentTurn } from "@/lib/ai/gemini";

export const runtime = "nodejs";

const modeSchema = z.enum(["MENU", "RUN_MAT", "GRAPH", "TABLE", "EQUATION", "MATRIX", "VECTOR", "STATISTICS", "PYTHON"]);
const requestSchema = z.object({
  message: z.string().trim().min(1).max(10_000),
  history: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().max(8_000),
    createdAt: z.number(),
    model: z.string().optional(),
    toolNames: z.array(z.string()).optional(),
  })).max(10).default([]),
  context: z.object({
    mode: modeSchema,
    expression: z.string().max(2_000).optional(),
    result: z.string().max(2_000).optional(),
    angleMode: z.enum(["DEG", "RAD", "GRD"]),
    variables: z.record(z.string(), z.number()).optional(),
    graphEquations: z.array(z.object({ id: z.string(), expression: z.string().max(1_000), visible: z.boolean() })).max(6).optional(),
    pythonFile: z.object({ name: z.string().max(120), code: z.string().max(30_000) }).optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const result = await generateAgentTurn(input);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid agent request."
      : error instanceof Error ? error.message : "The AI assistant could not complete this request.";
    const status = /quota|cooling|429/i.test(message) ? 429 : /API_KEY/.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
