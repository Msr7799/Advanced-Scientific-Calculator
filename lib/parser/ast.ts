export type NodeType =
  | "NumberLiteral"
  | "Variable"
  | "BinaryExpression"
  | "UnaryExpression"
  | "FunctionCall"
  | "Constant"
  | "MatrixLiteral";

export interface BaseNode {
  type: NodeType;
}

export interface NumberLiteralNode extends BaseNode {
  type: "NumberLiteral";
  value: number;
}

export interface VariableNode extends BaseNode {
  type: "Variable";
  name: string;
}

export interface ConstantNode extends BaseNode {
  type: "Constant";
  name: string;
}

export interface BinaryExpressionNode extends BaseNode {
  type: "BinaryExpression";
  operator: string;
  left: AstNode;
  right: AstNode;
}

export interface UnaryExpressionNode extends BaseNode {
  type: "UnaryExpression";
  operator: string;
  argument: AstNode;
}

export interface FunctionCallNode extends BaseNode {
  type: "FunctionCall";
  name: string;
  args: AstNode[];
}

export interface MatrixLiteralNode extends BaseNode {
  type: "MatrixLiteral";
  value: string;
}

export type AstNode =
  | NumberLiteralNode
  | VariableNode
  | ConstantNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | FunctionCallNode
  | MatrixLiteralNode;
