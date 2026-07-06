export interface Fraction {
  numerator: number;
  denominator: number;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

export function normalizeFraction(fraction: Fraction): Fraction {
  const sign = fraction.denominator < 0 ? -1 : 1;
  const numerator = fraction.numerator * sign;
  const denominator = Math.abs(fraction.denominator);
  const divisor = gcd(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

export function parseFraction(value: string): Fraction {
  const pieces = value.split("/").map((part) => Number(part.trim()));
  if (pieces.some((part) => Number.isNaN(part))) {
    throw new Error("Invalid fraction format");
  }
  if (pieces.length === 1) {
    return { numerator: pieces[0], denominator: 1 };
  }
  const numerator = pieces.slice(0, -1).reduce((acc, current) => acc * pieces[pieces.length - 1] + current, 0);
  const denominator = pieces[pieces.length - 1];
  return normalizeFraction({ numerator, denominator });
}

export function fractionToDecimal(fraction: Fraction): number {
  return fraction.numerator / fraction.denominator;
}

export function decimalToFraction(value: number): Fraction {
  const precision = 1e9;
  const numerator = Math.round(value * precision);
  const denominator = precision;
  return normalizeFraction({ numerator, denominator });
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({
    numerator: a.numerator * b.denominator + b.numerator * a.denominator,
    denominator: a.denominator * b.denominator,
  });
}

export function subtractFractions(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({
    numerator: a.numerator * b.denominator - b.numerator * a.denominator,
    denominator: a.denominator * b.denominator,
  });
}

export function multiplyFractions(a: Fraction, b: Fraction): Fraction {
  return normalizeFraction({
    numerator: a.numerator * b.numerator,
    denominator: a.denominator * b.denominator,
  });
}

export function divideFractions(a: Fraction, b: Fraction): Fraction {
  if (b.numerator === 0) {
    throw new Error("Cannot divide by zero fraction");
  }
  return normalizeFraction({
    numerator: a.numerator * b.denominator,
    denominator: a.denominator * b.numerator,
  });
}

export function formatFraction(fraction: Fraction): string {
  const normalized = normalizeFraction(fraction);
  return normalized.denominator === 1
    ? `${normalized.numerator}`
    : `${normalized.numerator}/${normalized.denominator}`;
}
