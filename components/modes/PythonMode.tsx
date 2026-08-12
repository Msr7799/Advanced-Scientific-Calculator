"use client";

import { useEffect, useRef, useState } from "react";
import { FilePlus2, Play, RotateCcw, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import type { PyodideInterface } from "pyodide";

interface PythonFile { name: string; code: string }

const DEFAULT_FILES: PythonFile[] = [
  { name: "main.py", code: 'print("Hello, Casio fx-CG50!")' },
  { name: "fibonacci.py", code: "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=' ')\n        a, b = b, a + b\n\nfib(10)" },
];

const STORAGE_KEY = "fx-cg50-python-files";
const PYODIDE_CDN_URL = "https://cdn.jsdelivr.net/pyodide/v314.0.3/full/";

type LoadPyodide = typeof import("pyodide")["loadPyodide"];

async function loadPyodideFromCdn(): Promise<PyodideInterface> {
  // Keep this import native so Turbopack does not rewrite Pyodide's internal
  // package imports into an unresolved dynamic module expression.
  const importFromUrl = new Function("url", "return import(url)") as (
    url: string,
  ) => Promise<{ loadPyodide: LoadPyodide }>;
  const { loadPyodide } = await importFromUrl(`${PYODIDE_CDN_URL}pyodide.mjs`);
  return loadPyodide({ indexURL: PYODIDE_CDN_URL });
}

export async function executePython(
  runtime: PyodideInterface,
  source: string,
  filename: string,
): Promise<string> {
  runtime.globals.set("__calculator_source__", source);
  runtime.globals.set("__calculator_filename__", filename);

  try {
    const result = await runtime.runPythonAsync(`
import contextlib
import io

__calculator_output__ = io.StringIO()
with contextlib.redirect_stdout(__calculator_output__), contextlib.redirect_stderr(__calculator_output__):
    exec(compile(__calculator_source__, __calculator_filename__, "exec"), globals())
__calculator_output__.getvalue()
`);
    return String(result ?? "");
  } finally {
    runtime.globals.delete("__calculator_source__");
    runtime.globals.delete("__calculator_filename__");
    runtime.globals.delete("__calculator_output__");
  }
}

function outputLines(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const withoutTrailingNewline = normalized.endsWith("\n")
    ? normalized.slice(0, -1)
    : normalized;
  return withoutTrailingNewline ? withoutTrailingNewline.split("\n") : [];
}

export default function PythonMode() {
  const [files, setFiles] = useState<PythonFile[]>(DEFAULT_FILES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const runtimeRef = useRef<PyodideInterface | null>(null);
  const activeFile = files[activeIndex] ?? files[0];

  useEffect(() => {
    let frame: number | undefined;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PythonFile[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          frame = window.requestAnimationFrame(() => setFiles(parsed));
        }
      }
    } catch {
      // Ignore malformed local editor data.
    }
    return () => { if (frame !== undefined) window.cancelAnimationFrame(frame); };
  }, []);

  const updateCode = (code: string) => {
    setFiles((current) => current.map((file, index) => index === activeIndex ? { ...file, code } : file));
  };

  const saveFiles = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    setOutput([`${activeFile.name} saved.`]);
  };

  const createFile = () => {
    const used = new Set(files.map((file) => file.name));
    let number = 1;
    while (used.has(`program${number}.py`)) number++;
    const next = [...files, { name: `program${number}.py`, code: "# New Python program\n" }];
    setFiles(next);
    setActiveIndex(next.length - 1);
    setOutput([]);
  };

  const deleteFile = () => {
    if (files.length === 1) {
      setFiles([{ name: "main.py", code: "" }]);
      setActiveIndex(0);
      return;
    }
    setFiles((current) => current.filter((_, index) => index !== activeIndex));
    setActiveIndex((index) => Math.max(0, index - 1));
    setOutput([]);
  };

  const runPython = async () => {
    setStatus(runtimeRef.current ? "running" : "loading");
    setOutput([]);
    try {
      if (!runtimeRef.current) {
        runtimeRef.current = await loadPyodideFromCdn();
      }
      setStatus("running");
      await runtimeRef.current.loadPackagesFromImports(activeFile.code);
      const text = await executePython(runtimeRef.current, activeFile.code, activeFile.name);
      const lines = outputLines(text);
      setOutput(lines.length > 0 ? lines : ["Program finished with no output."]);
      setStatus("idle");
    } catch (error) {
      setOutput([error instanceof Error ? error.message : "Python execution failed"]);
      setStatus("error");
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-col bg-[#07101a] text-[#c8d8e8]">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[#20334a] bg-[#0c1725] px-3">
        <Image
          src="/Python-Logo-3.svg"
          alt="Python"
          width={82}
          height={24}
          unoptimized
          className="h-6 w-[82px] shrink-0 object-contain object-left"
        />
        <span className="text-[9px] text-[#526b82]">MicroPython-compatible editor</span>
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={createFile} className="mode-icon-button" title="New Python file"><FilePlus2 size={15} /></button>
          <button type="button" onClick={saveFiles} className="mode-icon-button" title="Save files"><Save size={15} /></button>
          <button type="button" onClick={deleteFile} className="mode-icon-button mode-icon-danger" title="Delete file"><Trash2 size={15} /></button>
          <button type="button" onClick={() => setOutput([])} className="mode-icon-button" title="Clear output"><RotateCcw size={15} /></button>
          <button type="button" onClick={runPython} disabled={status === "loading" || status === "running"} className="inline-flex h-8 items-center gap-2 rounded-md border border-[#257653] bg-[#164832] px-3 text-[10px] font-bold text-[#a8f0ce] disabled:cursor-wait disabled:opacity-60">
            <Play size={13} fill="currentColor" /> {status === "loading" ? "LOADING" : status === "running" ? "RUNNING" : "RUN"}
          </button>
        </div>
      </div>

      <div className="flex h-9 shrink-0 items-end gap-1 border-b border-[#20334a] bg-[#09131f] px-2 pt-1">
        {files.map((file, index) => (
          <button key={`${file.name}-${index}`} type="button" onClick={() => setActiveIndex(index)} className={`h-8 min-w-24 border-x border-t px-3 text-left font-mono text-[10px] ${index === activeIndex ? "border-[#31516f] bg-[#102239] text-white" : "border-transparent text-[#5f7992] hover:bg-[#0d1b2c]"}`}>
            {file.name}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(420px,1fr)_minmax(280px,0.42fr)]">
        <div className="relative min-h-0 border-r border-[#20334a] bg-[#050b13]">
          <div className="pointer-events-none absolute bottom-2 right-3 z-10 font-mono text-[9px] text-[#31465b]">UTF-8 · Python 3</div>
          <textarea value={activeFile.code} onChange={(event) => updateCode(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Tab") {
              event.preventDefault();
              const target = event.currentTarget;
              const next = `${activeFile.code.slice(0, target.selectionStart)}    ${activeFile.code.slice(target.selectionEnd)}`;
              const cursor = target.selectionStart + 4;
              updateCode(next);
              requestAnimationFrame(() => target.setSelectionRange(cursor, cursor));
            }
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              void runPython();
            }
          }} className="h-full w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-[#c6e2f5] outline-none selection:bg-[#24547c]" spellCheck={false} aria-label="Python editor" />
        </div>

        <div className="relative flex min-h-0 flex-col bg-[#030913]">
          <div className="flex h-9 shrink-0 items-center border-b border-[#20334a] px-3 text-[9px] font-bold tracking-[0.18em] text-[#59738e]">
            SHELL
            <span className={`ml-auto h-2 w-2 rounded-full ${status === "error" ? "bg-[#dd5f5f]" : status === "idle" ? "bg-[#3fac78]" : "animate-pulse bg-[#e0b64b]"}`} />
          </div>
          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-5 text-[#86d9ae]">
            <div className="mb-2 text-[#426078]">Python 3 / Pyodide 314.0.3</div>
            {output.length === 0 ? <span className="text-[#31475d]">&gt;&gt;&gt;</span> : output.map((line, index) => <div key={index} className={status === "error" ? "whitespace-pre-wrap text-[#ec7b7b]" : "whitespace-pre-wrap"}>{line}</div>)}
          </div>
          {output.length === 0 && (
            <Image
              src="/Python-Logo-2.svg"
              alt=""
              aria-hidden="true"
              width={116}
              height={130}
              unoptimized
              className="pointer-events-none absolute left-1/2 top-1/2 h-[130px] w-[116px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.10]"
            />
          )}
        </div>
      </div>

      <div className="grid h-9 shrink-0 grid-cols-6 border-t border-[#29425f] bg-[#0b1727]">
        <button type="button" onClick={createFile} className="mode-softkey">NEW</button>
        <button type="button" onClick={saveFiles} className="mode-softkey">SAVE</button>
        <button type="button" onClick={() => setOutput([])} className="mode-softkey">SHELL</button>
        <button type="button" onClick={() => updateCode(`${activeFile.code}\nprint()`)} className="mode-softkey">CHAR</button>
        <button type="button" onClick={deleteFile} className="mode-softkey">DELETE</button>
        <button type="button" onClick={runPython} className="mode-softkey mode-softkey-active">RUN</button>
      </div>
    </div>
  );
}
