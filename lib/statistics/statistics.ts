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

export function zScore(x: number, mean: number, stdDev: number): number {
  return (x - mean) / stdDev;
}

/** Standard normal CDF via Abramowitz-Stegun approximation. */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) prob = 1 - prob;
  return 1 - prob;
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
