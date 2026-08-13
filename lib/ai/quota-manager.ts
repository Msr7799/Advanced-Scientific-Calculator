interface QuotaWindow {
  minuteStartedAt: number;
  dayKey: string;
  minuteRequests: number;
  dayRequests: number;
  blockedUntil: number;
}

interface QuotaLimit { rpm: number; rpd: number }

const windows = new Map<string, QuotaWindow>();

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function limitsFor(model: string): QuotaLimit {
  if (model.includes("pro")) return { rpm: envNumber("GEMINI_PRO_RPM", 5), rpd: envNumber("GEMINI_PRO_RPD", 100) };
  if (model.includes("lite")) return { rpm: envNumber("GEMINI_LITE_RPM", 15), rpd: envNumber("GEMINI_LITE_RPD", 1000) };
  return { rpm: envNumber("GEMINI_FLASH_RPM", 10), rpd: envNumber("GEMINI_FLASH_RPD", 250) };
}

function pacificDayKey(now: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function reserveModelRequest(model: string) {
  const now = Date.now();
  const limits = limitsFor(model);
  const safeRpm = Math.max(1, Math.floor(limits.rpm * 0.75));
  const safeRpd = Math.max(1, Math.floor(limits.rpd * 0.75));
  const dayKey = pacificDayKey(now);
  const current = windows.get(model) ?? { minuteStartedAt: now, dayKey, minuteRequests: 0, dayRequests: 0, blockedUntil: 0 };
  if (now - current.minuteStartedAt >= 60_000) { current.minuteStartedAt = now; current.minuteRequests = 0; }
  if (current.dayKey !== dayKey) { current.dayKey = dayKey; current.dayRequests = 0; }
  if (current.blockedUntil > now) throw new Error(`Model ${model} is cooling down. Retry shortly.`);
  if (current.minuteRequests >= safeRpm || current.dayRequests >= safeRpd) throw new Error(`Local safety quota reached for ${model}.`);
  current.minuteRequests++;
  current.dayRequests++;
  windows.set(model, current);
  return { remainingMinute: safeRpm - current.minuteRequests, remainingDay: safeRpd - current.dayRequests };
}

export function blockModel(model: string, retryAfterMs = 30_000) {
  const current = windows.get(model);
  if (current) current.blockedUntil = Date.now() + retryAfterMs;
}
