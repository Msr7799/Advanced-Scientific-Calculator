import { Token, TokenType } from "@/lib/parser/lexer";
import {
  AstNode,
  BinaryExpressionNode,
  ConstantNode,
  FunctionCallNode,
  MatrixLiteralNode,
  NumberLiteralNode,
  UnaryExpressionNode,
  VariableNode,
} from "@/lib/parser/ast";

const unaryOperators = ["+", "-"];
const operatorPrecedence: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "%": 2,
  "mod": 2,
  "pct": 2,
  "^": 3,
};

const rightAssociative = new Set(["^"]);

function createNumber(value: string): NumberLiteralNode {
  return { type: "NumberLiteral", value: Number(value) };
}

function createVariable(name: string): VariableNode {
  return { type: "Variable", name };
}

function createConstant(name: string): ConstantNode {
  return { type: "Constant", name };
}

function createFunctionCall(name: string, args: AstNode[]): FunctionCallNode {
  return { type: "FunctionCall", name, args };
}

function createBinaryExpression(operator: string, left: AstNode, right: AstNode): BinaryExpressionNode {
  return { type: "BinaryExpression", operator, left, right };
}

function createUnaryExpression(operator: string, argument: AstNode): UnaryExpressionNode {
  return { type: "UnaryExpression", operator, argument };
}

function createMatrixLiteral(value: string): MatrixLiteralNode {
  return { type: "MatrixLiteral", value };
}

export class Parser {
  private tokens: Token[];
  private position: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.position = 0;
  }

  private get current(): Token | null {
    return this.tokens[this.position] ?? null;
  }

  private consume(): Token | null {
    const token = this.current;
    this.position += 1;
    return token;
  }

  private parsePrimary(): AstNode {
    const token = this.current;
    if (!token) {
      throw new Error("Unexpected end of expression");
    }

    if (token.type === "number") {
      this.consume();
      return createNumber(token.value);
    }

    if (token.type === "constant") {
      this.consume();
      return createConstant(token.value);
    }

    if (token.type === "identifier") {
      this.consume();
      return createVariable(token.value);
    }

    if (token.type === "function") {
      this.consume();
      this.expect("paren", "(");
      const args: AstNode[] = [];
      if (!this.match("paren", ")")) {
        do {
          args.push(this.parseExpression());
        } while (this.match("comma", ",") && this.consume());
      }
      this.expect("paren", ")");
      return createFunctionCall(token.value, args);
    }

    if (token.type === "matrix") {
      this.consume();
      return createMatrixLiteral(token.value);
    }

    if (token.type === "paren" && token.value === "(") {
      this.consume();
      const expression = this.parseExpression();
      this.expect("paren", ")");
      return expression;
    }

    if (token.type === "operator" && unaryOperators.includes(token.value)) {
      this.consume();
      const argument = this.parsePrimary();
      return createUnaryExpression(token.value, argument);
    }

    throw new Error(`Unexpected token ${token.type} ${token.value}`);
  }

  private parseExpression(precedence = 0): AstNode {
    let left = this.parsePrimary();

    while (true) {
      const token = this.current;
      if (!token || token.type !== "operator") {
        break;
      }

      const tokenPrecedence = operatorPrecedence[token.value] ?? -1;
      if (tokenPrecedence < precedence) {
        break;
      }

      this.consume();
      const nextPrecedence = tokenPrecedence + (rightAssociative.has(token.value) ? 0 : 1);
      const right = this.parseExpression(nextPrecedence);
      left = createBinaryExpression(token.value, left, right);
    }

    return left;
  }

  private match(type: TokenType, value?: string): boolean {
    return !!this.current && this.current.type === type && (value === undefined || this.current.value === value);
  }

  private expect(type: TokenType, value?: string) {
    if (!this.match(type, value)) {
      throw new Error(`Expected ${type} ${value ?? ""} but found ${this.current?.type} ${this.current?.value}`);
    }
    this.consume();
  }

  public parse(): AstNode {
    const node = this.parseExpression();
    if (this.current) {
      throw new Error("Unexpected extra tokens");
    }
    return node;
  }
}
