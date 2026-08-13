import { loadPyodide } from "./pyodide/pyodide.mjs";

const PYODIDE_URL = new URL("./pyodide/", self.location.href).href;
let runtimePromise;

function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = loadPyodide({
      indexURL: PYODIDE_URL,
      packageBaseUrl: "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/",
    }).catch((error) => {
      runtimePromise = undefined;
      throw error;
    });
  }
  return runtimePromise;
}

function formatError(error) {
  if (typeof error === "string") return error;
  if (error && typeof error.message === "string") return error.message;
  if (error && typeof error.toString === "function") {
    const text = error.toString();
    if (text && text !== "[object Object]") return text;
  }
  try {
    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}));
    if (serialized && serialized !== "{}") return serialized;
  } catch {
    // Fall through to a useful generic message.
  }
  return "Python runtime failed to initialize.";
}

self.onmessage = async ({ data }) => {
  if (data.type !== "run" && data.type !== "validate") return;
  const output = [];
  try {
    self.postMessage({ type: "status", status: "loading", id: data.id });
    const runtime = await getRuntime();
    if (data.type === "validate") {
      runtime.globals.set("__agent_source__", data.source);
      runtime.globals.set("__agent_filename__", data.filename);
      try {
        runtime.runPython('compile(__agent_source__, __agent_filename__, "exec")');
      } finally {
        runtime.globals.delete("__agent_source__");
        runtime.globals.delete("__agent_filename__");
      }
      self.postMessage({ type: "validated", id: data.id });
      return;
    }
    runtime.setStdout({ batched: (text) => output.push(text) });
    runtime.setStderr({ batched: (text) => output.push(text) });
    await runtime.loadPackagesFromImports(data.source);
    self.postMessage({
      type: "status",
      status: "running",
      runtimeVersion: runtime.version,
      pythonVersion: runtime.runPython("import sys; '.'.join(map(str, sys.version_info[:3]))"),
      id: data.id,
    });
    await runtime.runPythonAsync(data.source, { filename: data.filename });
    self.postMessage({ type: "result", output, id: data.id });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: formatError(error),
      output,
      id: data.id,
    });
  }
};
