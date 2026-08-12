"use client";

import { useState } from "react";

const EXAMPLE_SCRIPTS = [
  { name: "Hello World", code: 'print("Hello, Casio fx-CG50!")' },
  { name: "Fibonacci",   code: "def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=' ')\n        a, b = b, a+b\nfib(10)" },
  { name: "Statistics",  code: "import statistics\ndata = [2, 4, 4, 4, 5, 5, 7, 9]\nprint('Mean:', statistics.mean(data))\nprint('Stdev:', statistics.stdev(data))" },
];

export default function PythonMode() {
  const [code, setCode] = useState(EXAMPLE_SCRIPTS[0].code);
  const [output] = useState<string[]>([]);

  return (
    <div className="flex flex-col h-full" style={{ background: "#0a1220" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: "#1a2a40" }}>
        <span className="text-[18px]">🐍</span>
        <div>
          <div className="text-[11px] font-bold tracking-widest text-[#44ddaa]">PYTHON MODE</div>
          <div className="text-[9px] text-[#2a4050]">Pyodide runtime — coming soon</div>
        </div>
        <div className="ml-auto flex gap-2">
          {EXAMPLE_SCRIPTS.map((s) => (
            <button
              key={s.name}
              onClick={() => setCode(s.code)}
              className="px-2 py-1 rounded text-[9px] font-bold transition-all"
              style={{ background: "#0d1828", color: "#4488aa", border: "1px solid #1a3040" }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Editor */}
        <div className="flex-1 flex flex-col border-r" style={{ borderColor: "#1a2a40" }}>
          <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: "#1a2a40", background: "#0d1828" }}>
            <span className="text-[9px] text-[#2a4050]">EDITOR</span>
            <div className="ml-auto flex gap-1">
              <span className="w-2 h-2 rounded-full bg-[#e05050] opacity-60" />
              <span className="w-2 h-2 rounded-full bg-[#e0a020] opacity-60" />
              <span className="w-2 h-2 rounded-full bg-[#40c040] opacity-60" />
            </div>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 p-4 font-mono text-[12px] resize-none outline-none"
            style={{
              background: "#080e18",
              color: "#c0e8ff",
              lineHeight: 1.65,
              border: "none",
              tabSize: 4,
            }}
            spellCheck={false}
          />
        </div>

        {/* Output console */}
        <div className="w-64 shrink-0 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: "#1a2a40", background: "#0d1828" }}>
            <span className="text-[9px] text-[#2a4050]">OUTPUT</span>
          </div>
          <div className="flex-1 p-3 font-mono text-[11px] overflow-y-auto panel-scroll" style={{ background: "#060c14", color: "#44ddaa" }}>
            {output.length === 0 ? (
              <div className="space-y-1 text-[#1a3040]">
                <div>{">>> Python runtime"}</div>
                <div>{">>> Pyodide integration"}</div>
                <div>{">>> coming in next phase"}</div>
                <div className="mt-4 text-[#1e4030]">
                  # The Python console will execute<br />
                  # real Python via Pyodide WASM.
                </div>
              </div>
            ) : (
              output.map((line, i) => (
                <div key={i} className="leading-relaxed">{line}</div>
              ))
            )}
          </div>

          {/* Run button — placeholder */}
          <button
            className="m-2 py-2 rounded-lg text-[11px] font-bold tracking-wider transition-all"
            style={{ background: "#0d2a1a", color: "#44aa66", border: "1px solid #1a4a2a" }}
            title="Python execution coming soon — Pyodide integration pending"
          >
            ▶ RUN (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}
