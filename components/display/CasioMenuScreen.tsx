"use client";

import { useEffect } from "react";
import { useCasioStore } from "@/store/calculatorStore";
import type { CasioMode } from "@/types/calculator";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTheme } from "@/components/theme/ThemeProvider";

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
  displaySize?: "calculator" | "expanded";
  keyboardNavigation?: boolean;
}

// ─── Menu Screen ─────────────────────────────────────────────────────────────
export default function CasioMenuScreen({ onSelect, displaySize = "calculator", keyboardNavigation = true }: CasioMenuScreenProps) {
  const { currentMode, menuSelectedIndex: selectedIdx, setMenuSelectedIndex: setSelectedIdx } = useCasioStore();
  const { theme } = useTheme();

  // Keyboard navigation in menu
  useEffect(() => {
    if (!keyboardNavigation) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setSelectedIdx((selectedIdx + 1) % MENU_APPS.length);
      if (e.key === "ArrowLeft")  setSelectedIdx((selectedIdx - 1 + MENU_APPS.length) % MENU_APPS.length);
      if (e.key === "ArrowDown")  setSelectedIdx((selectedIdx + 4) % MENU_APPS.length);
      if (e.key === "ArrowUp")    setSelectedIdx((selectedIdx - 4 + MENU_APPS.length) % MENU_APPS.length);
      if (e.key === "Enter") { onSelect(MENU_APPS[selectedIdx].id); return; }

      // Number shortcuts
      const num = parseInt(e.key);
      if (num >= 1 && num <= MENU_APPS.length) {
        onSelect(MENU_APPS[num - 1].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keyboardNavigation, selectedIdx, onSelect, setSelectedIdx]);

  return (
    <div className={`casio-menu-screen casio-lcd casio-lcd-glare lcd-flicker power-on flex h-full w-full flex-col overflow-hidden rounded-[6px] ${displaySize === "expanded" ? "casio-menu-expanded" : ""}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-white/5 ${displaySize === "expanded" ? "px-5 py-3" : "px-3 py-[5px]"}`}>
        <span className={`lcd-accent font-mono font-bold tracking-[0.25em] ${displaySize === "expanded" ? "text-[13px]" : "text-[9px]"}`}>
          CASIO fx-CG50
        </span>
        <span className={`lcd-muted font-mono ${displaySize === "expanded" ? "text-[12px]" : "text-[9px]"}`}>
          MAIN MENU
        </span>
      </div>

      {/* App grid — 4 columns */}
      <div className={`casio-menu-grid grid flex-1 grid-cols-4 content-start ${displaySize === "expanded" ? "gap-3 p-5" : "gap-[6px] p-2"}`}>
        {MENU_APPS.map((app, idx) => {
          const isActive = idx === selectedIdx;
          const isCurrentMode = currentMode === app.id;
          return (
            <motion.button
              key={app.id}
              type="button"
              onClick={() => onSelect(app.id)}
              onMouseEnter={() => setSelectedIdx(idx)}
              className={`menu-icon ${displaySize === "expanded" ? "min-h-[96px]" : ""}`}
              style={{
                borderColor: isActive ? app.color + "aa" : undefined,
                background: isActive
                  ? `${app.color}${theme === "light" ? "38" : "22"}`
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
                className={`absolute top-1 left-1.5 font-bold ${displaySize === "expanded" ? "text-[11px]" : "text-[8px]"}`}
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
                  width={displaySize === "expanded" ? 42 : 26}
                  height={displaySize === "expanded" ? 42 : 26}
                  unoptimized
                  className={`${displaySize === "expanded" ? "h-[42px] w-[42px]" : "h-[26px] w-[26px]"} object-contain`}
                  style={{
                    filter: theme === "light"
                      ? isActive ? "saturate(1.3) brightness(0.82)" : "saturate(1.2) brightness(0.7)"
                      : isActive ? "brightness(1.15)" : "brightness(0.82)",
                  }}
                />
              ) : (
                <span
                  className={`${displaySize === "expanded" ? "text-[30px]" : "text-[18px]"} leading-none`}
                  style={{
                    color: isActive ? app.color : app.color + "bb",
                    textShadow: isActive ? `0 0 8px ${app.color}88` : "none",
                    filter: theme === "light"
                      ? isActive ? "saturate(1.3) brightness(0.7)" : "saturate(1.2) brightness(0.62)"
                      : isActive ? "brightness(1.2)" : "brightness(0.85)",
                  }}
                >
                  {app.icon}
                </span>
              )}

              {/* Label */}
              <span
                className={`${displaySize === "expanded" ? "text-[12px]" : "text-[8px]"} text-center font-bold leading-none tracking-wide`}
                style={{ color: isActive ? app.color : "var(--lcd-muted)" }}
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
      <div className={`flex items-center justify-between border-t border-white/5 ${displaySize === "expanded" ? "px-5 py-3" : "px-3 py-[4px]"}`}>
        <span className={`lcd-muted font-mono ${displaySize === "expanded" ? "text-[10px]" : "text-[8px]"}`}>
          ◄►▲▼ SELECT  EXE/ENTER
        </span>
        <span className={`lcd-muted font-mono ${displaySize === "expanded" ? "text-[10px]" : "text-[8px]"}`}>
          [1-8] SHORTCUT
        </span>
      </div>
    </div>
  );
}
