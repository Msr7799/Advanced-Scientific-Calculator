import { AstNode } from "@/lib/parser/ast";

function isNumber(node: AstNode): node is { type: "NumberLiteral"; value: number } {
  return node.type === "NumberLiteral";
}

function isVariable(node: AstNode): node is { type: "Variable"; name: string } {
  return node.type === "Variable";
}

function isBinary(node: AstNode): node is { type: "BinaryExpression"; operator: string; left: AstNode; right: AstNode } {
  return node.type === "BinaryExpression";
}

export function simplifyAst(node: AstNode): AstNode {
  if (isBinary(node)) {
    const left = simplifyAst(node.left);
    const right = simplifyAst(node.right);

    if (left.type === "NumberLiteral" && right.type === "NumberLiteral") {
      switch (node.operator) {
        case "+":
          return { type: "NumberLiteral", value: left.value + right.value };
        case "-":
          return { type: "NumberLiteral", value: left.value - right.value };
        case "*":
          return { type: "NumberLiteral", value: left.value * right.value };
        case "/":
          return { type: "NumberLiteral", value: left.value / right.value };
        case "^":
          return { type: "NumberLiteral", value: left.value ** right.value };
        default:
          return { ...node, left, right };
      }
    }

    if (node.operator === "+") {
      if (isVariable(left) && isVariable(right) && left.name === right.name) {
        return {
          type: "BinaryExpression",
          operator: "*",
          left: { type: "NumberLiteral", value: 2 },
          right: left,
        };
      }
    }

    if (node.operator === "*") {
      if (isNumber(left) && isVariable(right)) {
        return { type: "BinaryExpression", operator: "*", left, right };
      }
      if (isVariable(left) && isNumber(right)) {
        return { type: "BinaryExpression", operator: "*", left: right, right: left };
      }
    }

    return { ...node, left, right };
  }

  return node;
}
