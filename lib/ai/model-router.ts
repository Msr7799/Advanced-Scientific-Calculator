export type ModelLane = "lite" | "standard" | "expert";

const MODELS = {
  lite: {
    primary: process.env.GEMINI_MODEL_LITE ?? "gemini-2.5-flash-lite",
    fallback: process.env.GEMINI_MODEL_LITE_FALLBACK ?? "gemini-3.5-flash-lite",
  },
  standard: {
    primary: process.env.GEMINI_MODEL_STANDARD ?? "gemini-2.5-flash",
    fallback: process.env.GEMINI_MODEL_STANDARD_FALLBACK ?? "gemini-3.6-flash",
  },
  expert: {
    primary: process.env.GEMINI_MODEL_EXPERT ?? "gemini-2.5-pro",
    fallback: process.env.GEMINI_MODEL_EXPERT_FALLBACK ?? "gemini-3.1-pro-preview",
  },
} as const;

export function chooseModelLane(message: string): ModelLane {
  const normalized = message.toLowerCase();
  if (/prove|برهن|اثبت|تحليل عميق|راجع الكود بالكامل|optimization|تعقيد/.test(normalized)) return "expert";
  if (/python|بايثون|code|كود|graph|قراف|ارسم|معادلة|matrix|مصفوف|vector|فيكتور|workflow|node|نود/.test(normalized)) return "standard";
  return "lite";
}

export function getModelCandidates(lane: ModelLane): string[] {
  return [MODELS[lane].primary, MODELS[lane].fallback].filter((model, index, values) => values.indexOf(model) === index);
}
