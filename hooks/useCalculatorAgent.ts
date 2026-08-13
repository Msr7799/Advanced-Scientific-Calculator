"use client";

import { useCallback } from "react";
import { z } from "zod";
import { calculate } from "@/lib/math/engine";
import { useCalculatorDispatch, useCalculatorState } from "@/lib/state/calculatorState";
import { useCasioStore } from "@/store/calculatorStore";
import { useAgentStore } from "@/store/agentStore";
import type { AgentContext, AgentToolCall, WorkflowSpec } from "@/types/agent";
import type { CasioMode } from "@/types/calculator";
import { addMatrices, determinant, inverseMatrix, multiplyMatrices, rankMatrix, subtractMatrices, transposeMatrix, type Matrix } from "@/lib/matrix/matrix";
import { angleBetweenDegrees, crossProduct, dotProduct, magnitude, normalize, type Vector } from "@/lib/vector/vector";
import { describe } from "@/lib/statistics/statistics";

const PYTHON_STORAGE_KEY = "fx-cg50-python-files";
const MODES = new Set<CasioMode>(["MENU", "RUN_MAT", "GRAPH", "TABLE", "EQUATION", "MATRIX", "VECTOR", "STATISTICS", "PYTHON"]);
const workflowSchema = z.object({
  title: z.string().min(1).max(120),
  nodes: z.array(z.object({ id: z.string(), type: z.string(), label: z.string(), value: z.string().optional() })).max(20),
  edges: z.array(z.object({ id: z.string(), source: z.string(), target: z.string() })).max(30),
});

interface PythonFile { name: string; code: string }

function readPythonFiles(): PythonFile[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PYTHON_STORAGE_KEY) ?? "[]") as PythonFile[];
    return Array.isArray(parsed) && parsed.length ? parsed.filter((file) => typeof file.name === "string" && typeof file.code === "string") : [
      { name: "main.py", code: 'print("Hello, Casio fx-CG50!")' },
      { name: "fibonacci.py", code: "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=' ')\n        a, b = b, a + b\n\nfib(10)" },
    ];
  } catch { return [{ name: "main.py", code: "" }]; }
}

function savePythonFiles(files: PythonFile[]) {
  window.localStorage.setItem(PYTHON_STORAGE_KEY, JSON.stringify(files));
  window.dispatchEvent(new CustomEvent("casio-python-files-changed", { detail: files }));
}

function validatePythonSource(source: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker("/python-worker.js?v=314003", { type: "module" });
    const id = Date.now();
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("Python syntax validation timed out."));
    }, 20_000);
    worker.onmessage = ({ data }: MessageEvent<{ type: string; id: number; message?: string }>) => {
      if (data.id !== id || (data.type !== "validated" && data.type !== "error")) return;
      window.clearTimeout(timeout);
      worker.terminate();
      if (data.type === "validated") resolve();
      else reject(new Error(data.message ?? "Python syntax is invalid."));
    };
    worker.onerror = () => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(new Error("Python syntax validator could not be loaded."));
    };
    worker.postMessage({ type: "validate", source, filename, id });
  });
}

export function useCalculatorAgent() {
  const calculator = useCalculatorState();
  const dispatch = useCalculatorDispatch();
  const currentMode = useCasioStore((state) => state.currentMode);
  const angleMode = useCasioStore((state) => state.angleMode);
  const variables = useCasioStore((state) => state.variables);
  const graphEquations = useCasioStore((state) => state.graphEquations);
  const setWorkflow = useAgentStore((state) => state.setWorkflow);

  const buildContext = useCallback((): AgentContext => {
    const context: AgentContext = { mode: currentMode, angleMode };
    if (currentMode === "RUN_MAT") {
      context.expression = calculator.expression;
      context.result = calculator.result;
      context.variables = variables;
    }
    if (currentMode === "GRAPH" || currentMode === "TABLE") {
      context.graphEquations = graphEquations.map(({ id, expression, visible }) => ({ id, expression, visible }));
    }
    if (currentMode === "PYTHON") {
      const file = readPythonFiles()[0];
      if (file) context.pythonFile = { name: file.name, code: file.code.slice(0, 30_000) };
    }
    return context;
  }, [angleMode, calculator.expression, calculator.result, currentMode, graphEquations, variables]);

  const executeTool = useCallback(async (call: AgentToolCall): Promise<string> => {
    const store = useCasioStore.getState();
    switch (call.name) {
      case "set_calculator_mode": {
        const mode = String(call.args.mode) as CasioMode;
        if (!MODES.has(mode)) throw new Error("The requested calculator mode is invalid.");
        store.setMode(mode);
        return `Opened ${mode}.`;
      }
      case "set_expression": {
        const expression = String(call.args.expression ?? "").slice(0, 2000);
        store.setMode("RUN_MAT");
        dispatch({ type: "SET_EXPRESSION", payload: expression });
        dispatch({ type: "SET_RESULT", payload: "" });
        return `Expression set to ${expression}.`;
      }
      case "evaluate_expression": {
        const expression = String(call.args.expression ?? "").slice(0, 2000);
        const evaluated = calculate(expression, { ...store.variables, ans: store.lastAnswer, angleMode: store.angleMode });
        dispatch({ type: "SET_EXPRESSION", payload: expression });
        dispatch({ type: "SET_RESULT", payload: evaluated.result });
        store.setMode("RUN_MAT");
        const numeric = Number(evaluated.result);
        if (Number.isFinite(numeric)) store.setLastAnswer(numeric);
        store.addHistory({ expression, result: evaluated.result });
        return `${expression} = ${evaluated.result}`;
      }
      case "set_angle_unit": {
        const unit = String(call.args.unit);
        if (unit !== "DEG" && unit !== "RAD" && unit !== "GRD") throw new Error("Invalid angle unit.");
        store.setAngleMode(unit);
        return `Angle unit changed to ${unit}.`;
      }
      case "add_graph_equation": {
        const expression = String(call.args.expression ?? "").replace(/^\s*y\s*=\s*/i, "").slice(0, 1000);
        const target = store.graphEquations.find((equation) => !equation.expression.trim());
        if (target) store.setGraphEquation(target.id, expression);
        else {
          if (store.graphEquations.length >= 6) throw new Error("The graph already contains six equations.");
          store.addGraphEquation();
          const added = useCasioStore.getState().graphEquations.at(-1);
          if (added) useCasioStore.getState().setGraphEquation(added.id, expression);
        }
        store.setMode("GRAPH");
        return `Added graph y=${expression}.`;
      }
      case "update_graph_equation": {
        const id = String(call.args.id).toUpperCase();
        const expression = String(call.args.expression ?? "").replace(/^\s*y\s*=\s*/i, "").slice(0, 1000);
        if (!store.graphEquations.some((equation) => equation.id === id)) throw new Error(`${id} does not exist.`);
        store.setGraphEquation(id, expression);
        store.setMode("GRAPH");
        return `Updated ${id} to y=${expression}.`;
      }
      case "create_python_file": {
        const requested = String(call.args.filename ?? "program.py").trim();
        const filename = (requested.endsWith(".py") ? requested : `${requested}.py`).replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 120);
        const files = readPythonFiles();
        if (files.some((file) => file.name.toLowerCase() === filename.toLowerCase())) throw new Error(`${filename} already exists.`);
        const code = String(call.args.code ?? "").slice(0, 30_000);
        await validatePythonSource(code, filename);
        files.push({ name: filename, code });
        savePythonFiles(files);
        store.setMode("PYTHON");
        return `Created ${filename}.`;
      }
      case "update_python_file": {
        const filename = String(call.args.filename ?? "main.py");
        const files = readPythonFiles();
        const index = files.findIndex((file) => file.name.toLowerCase() === filename.toLowerCase());
        if (index < 0) throw new Error(`${filename} was not found.`);
        const code = String(call.args.code ?? "").slice(0, 30_000);
        await validatePythonSource(code, files[index].name);
        files[index] = { ...files[index], code };
        savePythonFiles(files);
        store.setMode("PYTHON");
        return `Updated ${files[index].name}.`;
      }
      case "run_python_file": {
        const filename = String(call.args.filename ?? "main.py");
        if (!readPythonFiles().some((file) => file.name.toLowerCase() === filename.toLowerCase())) throw new Error(`${filename} was not found.`);
        store.setMode("PYTHON");
        window.setTimeout(() => window.dispatchEvent(new CustomEvent("casio-python-run", { detail: filename })), 350);
        return `Started ${filename}.`;
      }
      case "matrix_operation": {
        const operation = String(call.args.operation);
        const matrixA = call.args.matrixA as Matrix;
        const matrixB = call.args.matrixB as Matrix | undefined;
        let result: Matrix | number;
        if (operation === "add") result = addMatrices(matrixA, matrixB ?? []);
        else if (operation === "subtract") result = subtractMatrices(matrixA, matrixB ?? []);
        else if (operation === "multiply") result = multiplyMatrices(matrixA, matrixB ?? []);
        else if (operation === "transpose") result = transposeMatrix(matrixA);
        else if (operation === "determinant") result = determinant(matrixA);
        else if (operation === "inverse") result = inverseMatrix(matrixA);
        else if (operation === "rank") result = rankMatrix(matrixA);
        else throw new Error("Unsupported matrix operation.");
        store.setMode("MATRIX");
        return `Matrix ${operation} result: ${JSON.stringify(result)}`;
      }
      case "vector_operation": {
        const operation = String(call.args.operation);
        const vectorA = call.args.vectorA as Vector;
        const vectorB = call.args.vectorB as Vector | undefined;
        let result: Vector | number;
        if (operation === "dot") result = dotProduct(vectorA, vectorB ?? []);
        else if (operation === "cross") result = crossProduct(vectorA, vectorB ?? []);
        else if (operation === "magnitude") result = magnitude(vectorA);
        else if (operation === "normalize") result = normalize(vectorA);
        else if (operation === "angle") result = angleBetweenDegrees(vectorA, vectorB ?? []);
        else throw new Error("Unsupported vector operation.");
        store.setMode("VECTOR");
        return `Vector ${operation} result: ${JSON.stringify(result)}`;
      }
      case "statistics_summary": {
        const data = call.args.data as number[];
        const result = describe(data);
        store.setMode("STATISTICS");
        return `Statistics: ${JSON.stringify(result)}`;
      }
      case "create_workflow": {
        const workflow = workflowSchema.parse(call.args) as WorkflowSpec;
        setWorkflow(workflow);
        return `Created workflow ${workflow.title}. Review it before running.`;
      }
      default:
        throw new Error(`Unsupported agent tool: ${call.name}`);
    }
  }, [dispatch, setWorkflow]);

  return { buildContext, executeTool };
}
