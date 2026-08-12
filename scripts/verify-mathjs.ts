import { evaluate } from "mathjs";

const samples = [
  "2+2",
  "sin(30 deg)",
  "sqrt(16)",
  "(2+3)*4",
  "2^3",
];

for (const sample of samples) {
  console.log(sample, "=>", evaluate(sample).toString());
}
