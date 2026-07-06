export type Vector = number[];

function validateVector(vector: Vector): void {
  if (vector.length === 0) {
    throw new Error("Vector cannot be empty");
  }
}

export function dotProduct(a: Vector, b: Vector): number {
  validateVector(a);
  validateVector(b);
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimension for dot product");
  }
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

export function crossProduct(a: Vector, b: Vector): Vector {
  validateVector(a);
  validateVector(b);
  if (a.length !== 3 || b.length !== 3) {
    throw new Error("Cross product is defined only for 3-dimensional vectors");
  }
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function magnitude(vector: Vector): number {
  validateVector(vector);
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

export function normalize(vector: Vector): Vector {
  const length = magnitude(vector);
  if (length === 0) {
    throw new Error("Cannot normalize a zero vector");
  }
  return vector.map((value) => value / length);
}
