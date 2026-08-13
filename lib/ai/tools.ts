import type { FunctionDeclaration } from "@google/genai";

const object = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });
const string = (description: string, values?: string[]) => ({ type: "string", description, ...(values ? { enum: values } : {}) });

const CORE_TOOLS: FunctionDeclaration[] = [
  { name: "set_calculator_mode", description: "Open a calculator workspace or the main menu.", parametersJsonSchema: object({ mode: string("Target calculator mode", ["MENU", "RUN_MAT", "GRAPH", "TABLE", "EQUATION", "MATRIX", "VECTOR", "STATISTICS", "PYTHON"]) }, ["mode"]) },
  { name: "set_expression", description: "Put a mathematical expression in RUN-MAT without evaluating it.", parametersJsonSchema: object({ expression: string("Calculator expression") }, ["expression"]) },
  { name: "evaluate_expression", description: "Evaluate an expression and show it on the calculator display.", parametersJsonSchema: object({ expression: string("Expression compatible with the calculator") }, ["expression"]) },
  { name: "set_angle_unit", description: "Change the calculator angle unit.", parametersJsonSchema: object({ unit: string("Angle unit", ["DEG", "RAD", "GRD"]) }, ["unit"]) },
];

const GRAPH_TOOLS: FunctionDeclaration[] = [
  { name: "add_graph_equation", description: "Add and display a graph equation in y=f(x) form.", parametersJsonSchema: object({ expression: string("Expression in x") }, ["expression"]) },
  { name: "update_graph_equation", description: "Replace an existing graph equation.", parametersJsonSchema: object({ id: string("Equation id such as Y1"), expression: string("New expression in x") }, ["id", "expression"]) },
];

const PYTHON_TOOLS: FunctionDeclaration[] = [
  { name: "create_python_file", description: "Create a Python editor file. This requires user approval.", parametersJsonSchema: object({ filename: string("File name ending in .py"), code: string("Initial Python source") }, ["filename", "code"]) },
  { name: "update_python_file", description: "Replace a Python file with generated source. This requires user approval and a preview.", parametersJsonSchema: object({ filename: string("Existing Python file"), code: string("Complete replacement Python source"), summary: string("Short explanation of the change") }, ["filename", "code", "summary"]) },
  { name: "run_python_file", description: "Open Python and run a named file after user approval.", parametersJsonSchema: object({ filename: string("Python file to run") }, ["filename"]) },
];

const MATH_WORKSPACE_TOOLS: FunctionDeclaration[] = [
  { name: "matrix_operation", description: "Calculate a matrix operation and open Matrix mode.", parametersJsonSchema: object({ operation: string("Matrix operation", ["add", "subtract", "multiply", "transpose", "determinant", "inverse", "rank"]), matrixA: { type: "array", items: { type: "array", items: { type: "number" } } }, matrixB: { type: "array", items: { type: "array", items: { type: "number" } } } }, ["operation", "matrixA"]) },
  { name: "vector_operation", description: "Calculate a vector operation and open Vector mode.", parametersJsonSchema: object({ operation: string("Vector operation", ["dot", "cross", "magnitude", "normalize", "angle"]), vectorA: { type: "array", items: { type: "number" } }, vectorB: { type: "array", items: { type: "number" } } }, ["operation", "vectorA"]) },
  { name: "statistics_summary", description: "Calculate descriptive statistics and open Statistics mode.", parametersJsonSchema: object({ data: { type: "array", minItems: 1, maxItems: 500, items: { type: "number" } } }, ["data"]) },
];

const WORKFLOW_TOOLS: FunctionDeclaration[] = [
  { name: "create_workflow", description: "Create a visual smart-node workflow for calculator tasks. Do not run it automatically.", parametersJsonSchema: object({ title: string("Workflow title"), nodes: { type: "array", maxItems: 20, items: object({ id: string("Unique node id"), type: string("Node type", ["prompt", "calculator", "graph", "python", "matrix", "vector", "statistics", "condition", "variable", "result"]), label: string("Visible node label"), value: string("Optional concise value") }, ["id", "type", "label"]) }, edges: { type: "array", maxItems: 30, items: object({ id: string("Unique edge id"), source: string("Source node id"), target: string("Target node id") }, ["id", "source", "target"]) } }, ["title", "nodes", "edges"]) },
];

export function toolsForMode(mode: string, message = ""): FunctionDeclaration[] {
  const tools = [...CORE_TOOLS];
  const intent = message.toLowerCase();
  if (mode === "GRAPH" || mode === "TABLE" || mode === "MENU" || /graph|قراف|رسم|ارسم|منحن|معادل/.test(intent)) tools.push(...GRAPH_TOOLS);
  if (mode === "PYTHON" || mode === "MENU" || /python|بايثون|code|كود|ملف|برنامج/.test(intent)) tools.push(...PYTHON_TOOLS);
  if (mode === "MATRIX" || mode === "VECTOR" || mode === "STATISTICS" || mode === "MENU" || /matrix|مصفوف|vector|فيكتور|stat|احصا|إحصا/.test(intent)) tools.push(...MATH_WORKSPACE_TOOLS);
  tools.push(...WORKFLOW_TOOLS);
  return tools;
}
