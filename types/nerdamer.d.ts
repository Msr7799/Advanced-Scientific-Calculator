/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "nerdamer" {
  interface NerdamerStatic {
    (expression: string, subs?: Record<string, string | number>, options?: string[]): NerdamerExpression;
    solve(equation: string, variable: string): NerdamerExpression;
    solveEquations(equations: string[]): Array<[string, string | number]>;
    diff(expression: string, variable: string, nth?: number): NerdamerExpression;
    integrate(expression: string, variable: string): NerdamerExpression;
    simplify(expression: string): NerdamerExpression;
    expand(expression: string): NerdamerExpression;
    factor(expression: string): NerdamerExpression;
    set(name: string, value: any): void;
    getVars(expression: string): string[];
    reserved(): string[];
    version(): string;
    tan(x: any): NerdamerExpression;
    sin(x: any): NerdamerExpression;
    cos(x: any): NerdamerExpression;
  }

  interface NerdamerExpression {
    toString(): string;
    toTeX(): string;
    text(opt?: string): string;
    evaluate(): NerdamerExpression;
    symbol: any;
  }

  const nerdamer: NerdamerStatic;
  export = nerdamer;
}

declare module "nerdamer/Algebra" {}
declare module "nerdamer/Calculus" {}
declare module "nerdamer/Solve" {}
declare module "nerdamer/Extra" {}
