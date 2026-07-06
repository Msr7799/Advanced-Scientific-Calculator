import { AstNode } from "@/lib/parser/ast";

export function differentiate(node: AstNode, variable = "x"): AstNode {
  switch (node.type) {
    case "NumberLiteral":
      return { type: "NumberLiteral", value: 0 };
    case "Variable":
      return { type: "NumberLiteral", value: node.name === variable ? 1 : 0 };
    case "Constant":
      return { type: "NumberLiteral", value: 0 };
    case "UnaryExpression":
      return {
        type: "UnaryExpression",
        operator: node.operator,
        argument: differentiate(node.argument, variable),
      };
    case "BinaryExpression": {
      const left = node.left;
      const right = node.right;

      switch (node.operator) {
        case "+":
        case "-":
          return {
            type: "BinaryExpression",
            operator: node.operator,
            left: differentiate(left, variable),
            right: differentiate(right, variable),
          };
        case "*":
          return {
            type: "BinaryExpression",
            operator: "+",
            left: {
              type: "BinaryExpression",
              operator: "*",
              left: differentiate(left, variable),
              right,
            },
            right: {
              type: "BinaryExpression",
              operator: "*",
              left,
              right: differentiate(right, variable),
            },
          };
        case "/":
          return {
            type: "BinaryExpression",
            operator: "/",
            left: {
              type: "BinaryExpression",
              operator: "-",
              left: {
                type: "BinaryExpression",
                operator: "*",
                left: differentiate(left, variable),
                right,
              },
              right: {
                type: "BinaryExpression",
                operator: "*",
                left,
                right: differentiate(right, variable),
              },
            },
            right: {
              type: "BinaryExpression",
              operator: "^",
              left: right,
              right: { type: "NumberLiteral", value: 2 },
            },
          };
        case "^":
          return {
            type: "BinaryExpression",
            operator: "*",
            left: {
              type: "BinaryExpression",
              operator: "^",
              left,
              right,
            },
            right: {
              type: "BinaryExpression",
              operator: "+",
              left: {
                type: "BinaryExpression",
                operator: "/",
                left: {
                  type: "UnaryExpression",
                  operator: "ln",
                  argument: left,
                },
                right: { type: "NumberLiteral", value: 1 },
              },
              right: differentiate(right, variable),
            },
          };
        default:
          return { type: "NumberLiteral", value: 0 };
      }
    }
    case "FunctionCall": {
      const arg = node.args[0];
      const derived = differentiate(arg, variable);
      switch (node.name) {
        case "sin":
          return {
            type: "BinaryExpression",
            operator: "*",
            left: { type: "FunctionCall", name: "cos", args: [arg] },
            right: derived,
          };
        case "cos":
          return {
            type: "BinaryExpression",
            operator: "*",
            left: {
              type: "UnaryExpression",
              operator: "-",
              argument: { type: "FunctionCall", name: "sin", args: [arg] },
            },
            right: derived,
          };
        case "tan":
          return {
            type: "BinaryExpression",
            operator: "*",
            left: {
              type: "BinaryExpression",
              operator: "^",
              left: { type: "FunctionCall", name: "cos", args: [arg] },
              right: { type: "NumberLiteral", value: 2 },
            },
            right: derived,
          };
        case "ln":
          return {
            type: "BinaryExpression",
            operator: "/",
            left: derived,
            right: arg,
          };
        case "log":
          return {
            type: "BinaryExpression",
            operator: "/",
            left: derived,
            right: {
              type: "BinaryExpression",
              operator: "*",
              left: arg,
              right: { type: "FunctionCall", name: "ln", args: [{ type: "Constant", name: "e" }] },
            },
          };
        case "exp":
          return {
            type: "BinaryExpression",
            operator: "*",
            left: { type: "FunctionCall", name: "exp", args: [arg] },
            right: derived,
          };
        default:
          return { type: "NumberLiteral", value: 0 };
      }
    }
    default:
      return { type: "NumberLiteral", value: 0 };
  }
}
