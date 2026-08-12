"use client";

import { useState, useEffect } from "react";
import { useCasioStore } from "@/store/calculatorStore";
import type { CasioMode } from "@/types/calculator";
import { motion } from "framer-motion";
import Image from "next/image";

// ─── Menu app definitions ────────────────────────────────────────────────────
interface MenuApp {
  id: CasioMode;
  label: string;
  icon: string;
  color: string;
  shortcut: string;
}

const MENU_APPS: MenuApp[] = [
  { id: "RUN_MAT",    label: "RUN•MAT",  icon: "▶",  color: "#5588ff", shortcut: "1" },
  { id: "STATISTICS", label: "STAT",     icon: "Σ",  color: "#44cc88", shortcut: "2" },
  { id: "GRAPH",      label: "GRAPH",    icon: "∿",  color: "#ff9944", shortcut: "3" },
  { id: "TABLE",      label: "TABLE",    icon: "▦",  color: "#55ccff", shortcut: "4" },
  { id: "EQUATION",   label: "EQN",      icon: "=",  color: "#ff66aa", shortcut: "5" },
  { id: "MATRIX",     label: "MATRIX",   icon: "⊞",  color: "#cc88ff", shortcut: "6" },
  { id: "VECTOR",     label: "VECTOR",   icon: "→",  color: "#ffcc44", shortcut: "7" },
  { id: "PYTHON",     label: "PYTHON",   icon: "🐍", color: "#44ddaa", shortcut: "8" },
];

// ─── Props ───────────────────────────────────────────────────────────────────
interface CasioMenuScreenProps {
  onSelect: (mode: CasioMode) => void;
}

// ─── Menu Screen ─────────────────────────────────────────────────────────────
export default function CasioMenuScreen({ onSelect }: CasioMenuScreenProps) {
  const { currentMode } = useCasioStore();
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Keyboard navigation in menu
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSelectedIdx((i) => (i + 1) % MENU_APPS.length);
      if (e.key === "ArrowLeft")  setSelectedIdx((i) => (i - 1 + MENU_APPS.length) % MENU_APPS.length);
      if (e.key === "ArrowDown")  setSelectedIdx((i) => (i + 4) % MENU_APPS.length);
      if (e.key === "ArrowUp")    setSelectedIdx((i) => (i - 4 + MENU_APPS.length) % MENU_APPS.length);
      if (e.key === "Enter") { onSelect(MENU_APPS[selectedIdx].id); return; }

      // Number shortcuts
      const num = parseInt(e.key);
      if (num >= 1 && num <= MENU_APPS.length) {
        onSelect(MENU_APPS[num - 1].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, onSelect]);

  return (
    <div className="flex flex-col h-full" style={{ background: "linear-gradient(180deg, #0e2040 0%, #0a1830 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-[5px] border-b border-white/5">
        <span className="text-[9px] font-mono font-bold tracking-[0.25em] text-[#4488cc]">
          CASIO fx-CG50
        </span>
        <span className="text-[9px] font-mono text-[#304860]">
          MAIN MENU
        </span>
      </div>

      {/* App grid — 4 columns */}
      <div className="flex-1 grid grid-cols-4 gap-[6px] p-2 content-start">
        {MENU_APPS.map((app, idx) => {
          const isActive = idx === selectedIdx;
          const isCurrentMode = currentMode === app.id;
          return (
            <motion.button
              key={app.id}
              type="button"
              onClick={() => onSelect(app.id)}
              onMouseEnter={() => setSelectedIdx(idx)}
              className="menu-icon"
              style={{
                borderColor: isActive ? app.color + "aa" : undefined,
                background: isActive
                  ? `${app.color}22`
                  : isCurrentMode
                  ? `${app.color}10`
                  : undefined,
                boxShadow: isActive
                  ? `0 0 8px ${app.color}44, inset 0 0 0 1px ${app.color}55`
                  : undefined,
              }}
              whileTap={{ scale: 0.92 }}
            >
              {/* Shortcut number */}
              <span
                className="absolute top-1 left-1.5 text-[8px] font-bold"
                style={{ color: app.color + "99" }}
              >
                {app.shortcut}
              </span>

              {/* Icon */}
              {app.id === "PYTHON" ? (
                <Image
                  src="/Python-Logo.svg"
                  alt=""
                  aria-hidden="true"
                  width={26}
                  height={26}
                  unoptimized
                  className="h-[26px] w-[26px] object-contain"
                  style={{
                    filter: isActive ? "brightness(1.15)" : "brightness(0.82)",
                  }}
                />
              ) : (
                <span
                  className="text-[18px] leading-none"
                  style={{
                    color: isActive ? app.color : app.color + "bb",
                    textShadow: isActive ? `0 0 8px ${app.color}88` : "none",
                    filter: isActive ? "brightness(1.2)" : "brightness(0.85)",
                  }}
                >
                  {app.icon}
                </span>
              )}

              {/* Label */}
              <span
                className="text-[8px] font-bold tracking-wide leading-none text-center"
                style={{ color: isActive ? app.color : "#6888a8" }}
              >
                {app.label}
              </span>

              {/* Current mode dot */}
              {isCurrentMode && (
                <span
                  className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: app.color, boxShadow: `0 0 4px ${app.color}` }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Bottom hint */}
      <div className="px-3 py-[4px] border-t border-white/5 flex items-center justify-between">
        <span className="text-[8px] text-[#304860] font-mono">
          ◄►▲▼ SELECT  EXE/ENTER
        </span>
        <span className="text-[8px] text-[#304860] font-mono">
          [1-8] SHORTCUT
        </span>
      </div>
    </div>
  );
}
