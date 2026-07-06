export type Matrix = number[][];

function validateMatrix(matrix: Matrix): void {
  if (matrix.length === 0) {
    throw new Error("Matrix cannot be empty");
  }
  const width = matrix[0].length;
  if (width === 0) {
    throw new Error("Matrix rows cannot be empty");
  }
  for (const row of matrix) {
    if (row.length !== width) {
      throw new Error("Matrix must have equal row lengths");
    }
  }
}

export function addMatrices(a: Matrix, b: Matrix): Matrix {
  validateMatrix(a);
  validateMatrix(b);
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new Error("Matrices must have the same dimensions for addition");
  }
  return a.map((row, rowIndex) => row.map((value, colIndex) => value + b[rowIndex][colIndex]));
}

export function subtractMatrices(a: Matrix, b: Matrix): Matrix {
  validateMatrix(a);
  validateMatrix(b);
  if (a.length !== b.length || a[0].length !== b[0].length) {
    throw new Error("Matrices must have the same dimensions for subtraction");
  }
  return a.map((row, rowIndex) => row.map((value, colIndex) => value - b[rowIndex][colIndex]));
}

export function multiplyMatrices(a: Matrix, b: Matrix): Matrix {
  validateMatrix(a);
  validateMatrix(b);
  if (a[0].length !== b.length) {
    throw new Error("Matrix multiplication requires the number of columns in the first matrix to equal the number of rows in the second matrix");
  }
  return a.map((row) =>
    b[0].map((_, columnIndex) => row.reduce((sum, value, rowIndex) => sum + value * b[rowIndex][columnIndex], 0))
  );
}

export function transposeMatrix(matrix: Matrix): Matrix {
  validateMatrix(matrix);
  return matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));
}

export function determinant(matrix: Matrix): number {
  validateMatrix(matrix);
  if (matrix.length !== matrix[0].length) {
    throw new Error("Determinant requires a square matrix");
  }
  if (matrix.length === 1) {
    return matrix[0][0];
  }
  if (matrix.length === 2) {
    return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  }
  return matrix[0].reduce((result, value, columnIndex) => {
    const minor = matrix.slice(1).map((row) => row.filter((_, index) => index !== columnIndex));
    return result + ((columnIndex % 2 === 0 ? 1 : -1) * value * determinant(minor));
  }, 0);
}

export function minorMatrix(matrix: Matrix, rowToRemove: number, colToRemove: number): Matrix {
  validateMatrix(matrix);
  return matrix.filter((_, rowIndex) => rowIndex !== rowToRemove).map((row) => row.filter((_, colIndex) => colIndex !== colToRemove));
}

export function cofactorMatrix(matrix: Matrix): Matrix {
  validateMatrix(matrix);
  return matrix.map((row, rowIndex) =>
    row.map((_, colIndex) => {
      const sign = (rowIndex + colIndex) % 2 === 0 ? 1 : -1;
      return sign * determinant(minorMatrix(matrix, rowIndex, colIndex));
    })
  );
}

export function inverseMatrix(matrix: Matrix): Matrix {
  const det = determinant(matrix);
  if (det === 0) {
    throw new Error("Matrix is singular and cannot be inverted");
  }
  const cof = cofactorMatrix(matrix);
  const adjugate = transposeMatrix(cof);
  return adjugate.map((row) => row.map((value) => value / det));
}

export function rankMatrix(matrix: Matrix): number {
  validateMatrix(matrix);
  const temp = matrix.map((row) => [...row]);
  let rank = 0;
  let rowIndex = 0;
  const columnCount = matrix[0].length;

  for (let columnIndex = 0; columnIndex < columnCount && rowIndex < temp.length; columnIndex += 1) {
    let pivotRow = rowIndex;
    while (pivotRow < temp.length && temp[pivotRow][columnIndex] === 0) {
      pivotRow += 1;
    }
    if (pivotRow === temp.length) {
      continue;
    }
    [temp[rowIndex], temp[pivotRow]] = [temp[pivotRow], temp[rowIndex]];
    const pivotValue = temp[rowIndex][columnIndex];
    temp[rowIndex] = temp[rowIndex].map((value) => value / pivotValue);
    for (let otherRow = 0; otherRow < temp.length; otherRow += 1) {
      if (otherRow !== rowIndex) {
        const factor = temp[otherRow][columnIndex];
        temp[otherRow] = temp[otherRow].map((value, currentIndex) => value - factor * temp[rowIndex][currentIndex]);
      }
    }
    rowIndex += 1;
    rank += 1;
  }

  return rank;
}

export function identityMatrix(size: number): Matrix {
  return Array.from({ length: size }, (_, rowIndex) =>
    Array.from({ length: size }, (_, colIndex) => (rowIndex === colIndex ? 1 : 0))
  );
}

export function scalarMultiply(matrix: Matrix, scalar: number): Matrix {
  validateMatrix(matrix);
  return matrix.map((row) => row.map((value) => value * scalar));
}
