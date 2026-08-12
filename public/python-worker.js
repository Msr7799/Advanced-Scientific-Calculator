/* global importScripts, loadPyodide */

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.3/full/";
let runtimePromise;

function getRuntime() {
  if (!runtimePromise) {
    importScripts(`${PYODIDE_URL}pyodide.js`);
    runtimePromise = loadPyodide({ indexURL: PYODIDE_URL });
  }
  return runtimePromise;
}

self.onmessage = async ({ data }) => {
  if (data.type !== "run") return;
  const output = [];
  try {
    self.postMessage({ type: "status", status: "loading", id: data.id });
    const runtime = await getRuntime();
    runtime.setStdout({ batched: (text) => output.push(text) });
    runtime.setStderr({ batched: (text) => output.push(text) });
    await runtime.loadPackagesFromImports(data.source);
    self.postMessage({ type: "status", status: "running", id: data.id });
    await runtime.runPythonAsync(data.source, { filename: data.filename });
    self.postMessage({ type: "result", output, id: data.id });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
      output,
      id: data.id,
    });
  }
};
