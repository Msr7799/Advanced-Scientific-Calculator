export interface DescriptiveStats {
  n: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  range: number;
  variance: number; // population
  sampleVariance: number;
  stdDev: number; // population
  sampleStdDev: number;
  q1: number;
  q3: number;
  iqr: number;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function describe(data: number[]): DescriptiveStats {
  if (data.length === 0) {
    throw new Error("Dataset cannot be empty");
  }
  const sorted = [...data].sort((a, b) => a - b);
  const n = data.length;
  const sum = data.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = quantile(sorted, 0.5);

  const freq = new Map<number, number>();
  let maxFreq = 0;
  for (const v of data) {
    const c = (freq.get(v) ?? 0) + 1;
    freq.set(v, c);
    if (c > maxFreq) maxFreq = c;
  }
  const mode = maxFreq > 1 ? [...freq.entries()].filter(([, c]) => c === maxFreq).map(([v]) => v) : [];

  const variance = data.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const sampleVariance = n > 1 ? (data.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1)) : 0;

  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);

  return {
    n,
    sum,
    mean,
    median,
    mode,
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    variance,
    sampleVariance,
    stdDev: Math.sqrt(variance),
    sampleStdDev: Math.sqrt(sampleVariance),
    q1,
    q3,
    iqr: q3 - q1,
  };
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r: number; // correlation coefficient
  r2: number; // coefficient of determination
  predict: (x: number) => number;
  equation: string;
}

export function linearRegression(xs: number[], ys: number[]): RegressionResult {
  if (xs.length !== ys.length || xs.length < 2) {
    throw new Error("Need at least 2 paired (x, y) points");
  }
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const r = sxy / Math.sqrt(sxx * syy);
  const r2 = r * r;

  return {
    slope,
    intercept,
    r,
    r2,
    predict: (x: number) => slope * x + intercept,
    equation: `y = ${slope.toFixed(4)}x ${intercept >= 0 ? "+" : "-"} ${Math.abs(intercept).toFixed(4)}`,
  };
}

export function correlation(xs: number[], ys: number[]): number {
  return linearRegression(xs, ys).r;
}

/** Quadratic least-squares fit: y = ax^2 + bx + c, via normal equations. */
export function quadraticRegression(xs: number[], ys: number[]): { a: number; b: number; c: number; equation: string } {
  if (xs.length !== ys.length || xs.length < 3) {
    throw new Error("Need at least 3 paired (x, y) points");
  }
  const n = xs.length;
  let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0, sy = 0, sxy = 0, sx2y = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    const y = ys[i];
    const x2 = x * x;
    sx += x;
    sx2 += x2;
    sx3 += x2 * x;
    sx4 += x2 * x2;
    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }

  // Solve the 3x3 normal-equations system via Cramer's rule.
  const A = [
    [n, sx, sx2],
    [sx, sx2, sx3],
    [sx2, sx3, sx4],
  ];
  const B = [sy, sxy, sx2y];

  const det3 = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  const D = det3(A);
  const replaceCol = (m: number[][], col: number, vec: number[]) =>
    m.map((row, i) => row.map((v, j) => (j === col ? vec[i] : v)));

  const c = det3(replaceCol(A, 0, B)) / D;
  const b = det3(replaceCol(A, 1, B)) / D;
  const a = det3(replaceCol(A, 2, B)) / D;

  return {
    a,
    b,
    c,
    equation: `y = ${a.toFixed(4)}x² ${b >= 0 ? "+" : "-"} ${Math.abs(b).toFixed(4)}x ${c >= 0 ? "+" : "-"} ${Math.abs(c).toFixed(4)}`,
  };
}

/** Standard normal CDF, Φ(z), via Abramowitz-Stegun approximation (max error ~7.5e-8). */
export function standardNormalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const tail = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z >= 0 ? 1 - tail : tail;
}

/** Standard normal PDF, φ(z). */
export function standardNormalPdf(z: number): number {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-(z * z) / 2);
}

/** z = (x - μ) / σ */
export function zScore(x: number, mean: number, stdDev: number): number {
  if (stdDev === 0) throw new Error("Standard deviation cannot be zero");
  return (x - mean) / stdDev;
}

/** P(X ≤ x) for X ~ Normal(mean, stdDev). */
export function normalCdf(x: number, mean?: number, stdDev?: number): number {
  if (mean === undefined || stdDev === undefined) {
    return standardNormalCdf(x);
  }
  return standardNormalCdf(zScore(x, mean, stdDev));
}

/** P(lower ≤ X ≤ upper) for X ~ Normal(mean, stdDev). */
export function normalRangeProbability(lower: number, upper: number, mean: number, stdDev: number): number {
  return normalCdf(upper, mean, stdDev) - normalCdf(lower, mean, stdDev);
}

/** Inverse standard normal CDF (quantile function) via Acklam's rational approximation. */
export function inverseStandardNormalCdf(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new Error("p must be strictly between 0 and 1");
  }

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/** P(A|B) = P(A∩B) / P(B) */
export function conditionalProbability(pAIntersectB: number, pB: number): number {
  if (pB === 0) throw new Error("P(B) cannot be zero");
  if (pAIntersectB > pB + 1e-9) {
    throw new Error("P(A∩B) cannot exceed P(B)");
  }
  return pAIntersectB / pB;
}

/** Bayes' theorem: P(A|B) = P(B|A) * P(A) / P(B) */
export function bayesTheorem(pBGivenA: number, pA: number, pB: number): number {
  if (pB === 0) throw new Error("P(B) cannot be zero");
  return (pBGivenA * pA) / pB;
}

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error("Factorial requires a non-negative integer");
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

export function combination(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  return factorial(n) / (factorial(k) * factorial(n - k));
}

export function permutation(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  return factorial(n) / factorial(n - k);
}

/** P(X = k) for X ~ Binomial(n, p) */
export function binomialPmf(n: number, p: number, k: number): number {
  if (p < 0 || p > 1) throw new Error("p must be in [0, 1]");
  return combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

/** P(X ≤ k) for X ~ Binomial(n, p) */
export function binomialCdf(n: number, p: number, k: number): number {
  let sum = 0;
  for (let i = 0; i <= k; i += 1) sum += binomialPmf(n, p, i);
  return sum;
}

/** P(X = k) for X ~ Poisson(λ) */
export function poissonPmf(lambda: number, k: number): number {
  if (lambda < 0) throw new Error("lambda must be non-negative");
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/** P(X ≤ k) for X ~ Poisson(λ) */
export function poissonCdf(lambda: number, k: number): number {
  let sum = 0;
  for (let i = 0; i <= k; i += 1) sum += poissonPmf(lambda, i);
  return sum;
}

export interface HypothesisTestResult {
  testStatistic: number;
  pValue: number;
  significant: boolean;
}

/** One-sample z-test for a population mean against a hypothesized value. */
export function oneSampleZTest(
  sampleMean: number,
  hypothesizedMean: number,
  populationStdDev: number,
  sampleSize: number,
  alpha = 0.05,
  tailed: "two" | "left" | "right" = "two"
): HypothesisTestResult {
  const standardError = populationStdDev / Math.sqrt(sampleSize);
  const z = (sampleMean - hypothesizedMean) / standardError;
  let pValue: number;
  if (tailed === "two") {
    pValue = 2 * (1 - standardNormalCdf(Math.abs(z)));
  } else if (tailed === "left") {
    pValue = standardNormalCdf(z);
  } else {
    pValue = 1 - standardNormalCdf(z);
  }
  return { testStatistic: z, pValue, significant: pValue < alpha };
}

export function histogramBins(data: number[], binCount: number): { start: number; end: number; count: number }[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const width = (max - min) / binCount || 1;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    start: min + i * width,
    end: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of data) {
    const idx = Math.min(binCount - 1, Math.floor((v - min) / width));
    bins[Math.max(0, idx)].count += 1;
  }
  return bins;
}
