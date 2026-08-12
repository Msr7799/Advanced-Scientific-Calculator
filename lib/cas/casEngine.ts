"use client";

/**
 * CAS Engine — wraps Nerdamer for symbolic math operations.
 * All functions are lazy-imported to avoid SSR issues.
 */

export interface CasResult {
  success: boolean;
  result: string;
  latex?: string;
  error?: string;
}

async function loadNerdamer() {
  const nerdamer = (await import("nerdamer")).default;
  await import("nerdamer/Algebra");
  await import("nerdamer/Calculus");
  await import("nerdamer/Solve");
  await import("nerdamer/Extra");
  return nerdamer;
}

function wrapCas(fn: () => string): CasResult {
  try {
    const result = fn();
    return { success: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "CAS error";
    return { success: false, result: "", error: msg };
  }
}

export async function casSimplify(expression: string): Promise<CasResult> {
  const nerdamer = await loadNerdamer();
  return wrapCas(() => nerdamer.simplify(expression).toString());
}

export async function casExpand(expression: string): Promise<CasResult> {
  const nerdamer = await loadNerdamer();
  return wrapCas(() => nerdamer.expand(expression).toString());
}

export async function casFactor(expression: string): Promise<CasResult> {
  const nerdamer = await loadNerdamer();
  return wrapCas(() => nerdamer.factor(expression).toString());
}

export async function casDiff(expression: string, variable = "x"): Promise<CasResult> {
  const nerdamer = await loadNerdamer();
  return wrapCas(() => nerdamer.diff(expression, variable).toString());
}

export async function casIntegrate(expression: string, variable = "x"): Promise<CasResult> {
  const nerdamer = await loadNerdamer();
  return wrapCas(() => nerdamer.integrate(expression, variable).toString());
}

export async function casSolve(equation: string, variable = "x"): Promise<CasResult> {
  const nerdamer = await loadNerdamer();
  return wrapCas(() => {
    const result = nerdamer.solve(equation, variable);
    return result.toString();
  });
}
