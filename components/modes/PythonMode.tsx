"use client";

import { useEffect, useRef, useState } from "react";
import { FileCode2, FilePlus2, Play, RotateCcw, Save, Square, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCasioFKeys } from "@/lib/keyboard/useCasioFKeys";
import { AppDialog, dialogButtonClass } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

interface PythonFile { name: string; code: string }

const DEFAULT_FILES: PythonFile[] = [
  { name: "main.py", code: 'print("Hello, Casio fx-CG50!")' },
  { name: "fibonacci.py", code: "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=' ')\n        a, b = b, a + b\n\nfib(10)" },
];

const STORAGE_KEY = "fx-cg50-python-files";
export default function PythonMode() {
  const toast = useToast();
  const [files, setFiles] = useState<PythonFile[]>(DEFAULT_FILES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const [savedFiles, setSavedFiles] = useState(JSON.stringify(DEFAULT_FILES));
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");
  const activeFile = files[activeIndex] ?? files[0];
  const deleteTarget = deleteIndex === null ? null : files[deleteIndex];

  useEffect(() => {
    let frame: number | undefined;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PythonFile[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          frame = window.requestAnimationFrame(() => {
            setFiles(parsed);
            setSavedFiles(JSON.stringify(parsed));
          });
        }
      }
    } catch {
      // Ignore malformed local editor data.
    }
    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      workerRef.current?.terminate();
    };
  }, []);

  const updateCode = (code: string) => {
    setFiles((current) => current.map((file, index) => index === activeIndex ? { ...file, code } : file));
  };

  const saveFiles = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
    setSavedFiles(JSON.stringify(files));
    toast({ title: "Python files saved", description: `${files.length} file${files.length === 1 ? "" : "s"} saved in this browser.`, variant: "success" });
  };

  const requestCreateFile = () => {
    const used = new Set(files.map((file) => file.name));
    let number = 1;
    while (used.has(`program${number}.py`)) number++;
    setCreateName(`program${number}.py`);
    setCreateOpen(true);
  };

  const confirmCreateFile = () => {
    const requested = createName.trim();
    if (!requested) return;
    const name = requested.endsWith(".py") ? requested : `${requested}.py`;
    if (files.some((file) => file.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "File already exists", description: `Python workspace / ${name}`, variant: "error" });
      return;
    }
    const next = [...files, { name, code: "# New Python program\n" }];
    setFiles(next);
    setActiveIndex(next.length - 1);
    setOutput([]);
    setCreateOpen(false);
    toast({ title: "Python file created", description: `Python workspace / ${name}`, variant: "success" });
  };

  const requestDeleteFile = () => setDeleteIndex(activeIndex);

  const confirmDeleteFile = () => {
    if (deleteIndex === null || !deleteTarget) return;
    if (files.length === 1) {
      setFiles([{ name: "main.py", code: "" }]);
      setActiveIndex(0);
      setDeleteIndex(null);
      setOutput([]);
      toast({ title: "Workspace reset", description: `${deleteTarget.name} was cleared and an empty main.py was retained.`, variant: "warning" });
      return;
    }
    const deletedName = deleteTarget.name;
    setFiles((current) => current.filter((_, index) => index !== deleteIndex));
    setActiveIndex((index) => Math.min(Math.max(0, index - 1), files.length - 2));
    setOutput([]);
    setDeleteIndex(null);
    toast({ title: "Python file deleted", description: `Removed Python workspace / ${deletedName}`, variant: "success" });
  };

  const requestRenameFile = (index: number) => {
    const current = files[index];
    setRenameIndex(index);
    setRenameName(current.name);
  };

  const confirmRenameFile = () => {
    if (renameIndex === null) return;
    const requested = renameName.trim();
    if (!requested) return;
    const normalized = requested.endsWith(".py") ? requested : `${requested}.py`;
    if (files.some((file, fileIndex) => fileIndex !== renameIndex && file.name.toLowerCase() === normalized.toLowerCase())) {
      toast({ title: "File already exists", description: `Python workspace / ${normalized}`, variant: "error" });
      return;
    }
    const previousName = files[renameIndex].name;
    setFiles((items) => items.map((file, fileIndex) => fileIndex === renameIndex ? { ...file, name: normalized } : file));
    setRenameIndex(null);
    toast({ title: "Python file renamed", description: `${previousName} -> ${normalized}`, variant: "success" });
  };

  const stopPython = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    runIdRef.current++;
    setStatus("idle");
    setOutput((current) => [...current, "Execution stopped."]);
  };

  const runPython = async () => {
    if (status === "loading" || status === "running") return;
    setStatus("loading");
    setOutput([]);
    workerRef.current?.terminate();
    const worker = new Worker("/python-worker.js");
    workerRef.current = worker;
    const id = ++runIdRef.current;
    worker.onmessage = ({ data }: MessageEvent<{ type: string; status?: "loading" | "running"; output?: string[]; message?: string; id: number }>) => {
      if (data.id !== runIdRef.current) return;
      if (data.type === "status" && data.status) setStatus(data.status);
      if (data.type === "result") {
        setOutput(data.output?.length ? data.output : ["Program finished with no output."]);
        setStatus("idle");
      }
      if (data.type === "error") {
        setOutput([...(data.output ?? []), data.message ?? "Python execution failed", "Press RUN to retry."]);
        setStatus("error");
        toast({ title: "Python execution failed", description: data.message ?? "Check the Shell for details.", variant: "error", duration: 5200 });
      }
    };
    worker.onerror = () => {
      if (id !== runIdRef.current) return;
      setOutput(["Python runtime could not be loaded. Check the connection and press RUN to retry."]);
      setStatus("error");
      toast({ title: "Python runtime unavailable", description: "Check the connection and press RUN to retry.", variant: "error" });
    };
    worker.postMessage({ type: "run", source: activeFile.code, filename: activeFile.name, id });
  };

  useCasioFKeys([
    requestCreateFile,
    saveFiles,
    () => setOutput([]),
    () => updateCode(`${activeFile.code}\nprint()`),
    requestDeleteFile,
    status === "loading" || status === "running" ? stopPython : runPython,
  ]);

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
        <span className="text-[9px] text-[#526b82]">Python 3 editor powered by Pyodide</span>
        {JSON.stringify(files) !== savedFiles && <span className="text-[9px] text-[#e2b743]" title="Unsaved changes">UNSAVED</span>}
        <div className="ml-auto flex gap-1.5">
          <button type="button" onClick={requestCreateFile} className="mode-icon-button" title="New Python file"><FilePlus2 size={15} /></button>
          <button type="button" onClick={saveFiles} className="mode-icon-button" title="Save files"><Save size={15} /></button>
          <button type="button" onClick={requestDeleteFile} className="mode-icon-button mode-icon-danger" title={`Delete ${activeFile.name}`}><Trash2 size={15} /></button>
          <button type="button" onClick={() => setOutput([])} className="mode-icon-button" title="Clear output"><RotateCcw size={15} /></button>
          <button type="button" onClick={runPython} disabled={status === "loading" || status === "running"} className="inline-flex h-8 items-center gap-2 rounded-md border border-[#257653] bg-[#164832] px-3 text-[10px] font-bold text-[#a8f0ce] disabled:cursor-wait disabled:opacity-60">
            <Play size={13} fill="currentColor" /> {status === "loading" ? "LOADING" : status === "running" ? "RUNNING" : "RUN"}
          </button>
          {(status === "loading" || status === "running") && <button type="button" onClick={stopPython} className="mode-icon-button mode-icon-danger" title="Stop Python"><Square size={14} fill="currentColor" /></button>}
        </div>
      </div>

      <div className="flex h-9 shrink-0 items-end gap-1 overflow-x-auto border-b border-[#20334a] bg-[#09131f] px-2 pt-1">
        {files.map((file, index) => (
          <button key={`${file.name}-${index}`} type="button" onClick={() => setActiveIndex(index)} onDoubleClick={() => requestRenameFile(index)} title="Double-click to rename" className={`h-8 min-w-24 border-x border-t px-3 text-left font-mono text-[10px] ${index === activeIndex ? "border-[#31516f] bg-[#102239] text-white" : "border-transparent text-[#5f7992] hover:bg-[#0d1b2c]"}`}>
            {file.name}
          </button>
        ))}
      </div>

      <div className="python-workspace grid min-h-0 flex-1 grid-cols-[minmax(420px,1fr)_minmax(280px,0.42fr)]">
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
            <div className="mb-2 text-[#426078]">Python 3 / Pyodide 0.27.3</div>
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
        <button type="button" onClick={requestCreateFile} className="mode-softkey">NEW</button>
        <button type="button" onClick={saveFiles} className="mode-softkey">SAVE</button>
        <button type="button" onClick={() => setOutput([])} className="mode-softkey">SHELL</button>
        <button type="button" onClick={() => updateCode(`${activeFile.code}\nprint()`)} className="mode-softkey">CHAR</button>
        <button type="button" onClick={requestDeleteFile} className="mode-softkey">DELETE</button>
        <button type="button" onClick={status === "loading" || status === "running" ? stopPython : runPython} className="mode-softkey mode-softkey-active">{status === "loading" || status === "running" ? "STOP" : "RUN"}</button>
      </div>

      <AppDialog open={createOpen} onOpenChange={setCreateOpen} title="Create Python file" description="Choose a unique name for the new file in this calculator workspace." icon={<FilePlus2 size={17} />} footer={<><button type="button" onClick={() => setCreateOpen(false)} className={`${dialogButtonClass} border-[#30455a] text-[#91a8bd] hover:bg-[#122235]`}>Cancel</button><button type="button" onClick={confirmCreateFile} disabled={!createName.trim()} className={`${dialogButtonClass} border-[#2673a5] bg-[#155d88] text-white hover:bg-[#1a70a2]`}>Create file</button></>}>
        <label className="block text-[10px] font-bold tracking-[0.12em] text-[#6d879f]">FILE NAME<input value={createName} onChange={(event) => setCreateName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") confirmCreateFile(); }} className="mt-2 h-10 w-full rounded-md border border-[#30475e] bg-[#050c14] px-3 font-mono text-[12px] text-white outline-none focus:border-[#4b91c5]" placeholder="program.py" /></label>
        <div className="mt-3 rounded-md border border-[#1e3448] bg-[#08121d] px-3 py-2 font-mono text-[10px] text-[#5f7c96]">Python workspace / {createName.trim() || "file.py"}</div>
      </AppDialog>

      <AppDialog open={renameIndex !== null} onOpenChange={(open) => { if (!open) setRenameIndex(null); }} title="Rename Python file" description={renameIndex === null ? "" : `Rename ${files[renameIndex]?.name} without changing its contents.`} icon={<FileCode2 size={17} />} footer={<><button type="button" onClick={() => setRenameIndex(null)} className={`${dialogButtonClass} border-[#30455a] text-[#91a8bd] hover:bg-[#122235]`}>Cancel</button><button type="button" onClick={confirmRenameFile} disabled={!renameName.trim()} className={`${dialogButtonClass} border-[#2673a5] bg-[#155d88] text-white hover:bg-[#1a70a2]`}>Rename file</button></>}>
        <label className="block text-[10px] font-bold tracking-[0.12em] text-[#6d879f]">NEW FILE NAME<input value={renameName} onChange={(event) => setRenameName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") confirmRenameFile(); }} className="mt-2 h-10 w-full rounded-md border border-[#30475e] bg-[#050c14] px-3 font-mono text-[12px] text-white outline-none focus:border-[#4b91c5]" /></label>
      </AppDialog>

      <AppDialog open={deleteIndex !== null} onOpenChange={(open) => { if (!open) setDeleteIndex(null); }} title={files.length === 1 ? "Reset the Python workspace?" : `Delete ${deleteTarget?.name ?? "file"}?`} description={files.length === 1 ? "The editor must keep one file, so this operation behaves differently." : "This removes the selected file and its unsaved contents from this browser."} icon={<Trash2 size={17} />} danger footer={<><button type="button" onClick={() => setDeleteIndex(null)} className={`${dialogButtonClass} border-[#30455a] text-[#91a8bd] hover:bg-[#122235]`}>Cancel</button><button type="button" onClick={confirmDeleteFile} className={`${dialogButtonClass} border-[#7a343d] bg-[#8e2632] text-white hover:bg-[#a62d3a]`}>{files.length === 1 ? "Clear and keep main.py" : `Delete ${deleteTarget?.name ?? "file"}`}</button></>}>
        {deleteTarget && <div className="rounded-md border border-[#3b2c35] bg-[#160d13] p-3"><div className="flex items-center gap-3"><FileCode2 size={22} className="text-[#e67b86]" /><div className="min-w-0"><div className="truncate font-mono text-[12px] font-bold text-[#f2dce0]">{deleteTarget.name}</div><div className="mt-0.5 truncate font-mono text-[9px] text-[#8f6970]">Python workspace / {deleteTarget.name}</div></div></div><div className="mt-3 grid grid-cols-2 gap-2 text-[9px]"><div className="rounded bg-black/20 px-2 py-1.5 text-[#ad858b]">{deleteTarget.code.split(/\r?\n/).length} lines</div><div className="rounded bg-black/20 px-2 py-1.5 text-[#ad858b]">{deleteTarget.code.length} characters</div></div></div>}
        <div className={`mt-3 rounded-md border px-3 py-2 text-[10px] leading-4 ${files.length === 1 ? "border-[#67552c] bg-[#241d0b] text-[#d8b95f]" : "border-[#5e3038] bg-[#221015] text-[#d98b94]"}`}>{files.length === 1 ? `${deleteTarget?.name ?? "The file"} will be cleared. An empty file named main.py will remain so the editor can continue working.` : `${deleteTarget?.name ?? "This file"} will be permanently removed from the Python workspace. Other files are not affected.`}</div>
      </AppDialog>
    </div>
  );
}
