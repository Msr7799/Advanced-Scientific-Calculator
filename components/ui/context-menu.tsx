"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type ContextMenuEntry =
  | { type: "label"; label: string }
  | { type: "separator" }
  | {
      type: "item";
      label: string;
      icon?: ReactNode;
      shortcut?: string;
      checked?: boolean;
      destructive?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    };

interface ContextMenuProps {
  children: ReactNode;
  entries: ContextMenuEntry[];
  ariaLabel?: string;
  className?: string;
}

const MENU_WIDTH = 236;
const MENU_GUTTER = 10;

export function ContextMenu({ children, entries, ariaLabel = "Context menu", className = "" }: ContextMenuProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => setPosition(null), []);
  const openAt = useCallback((clientX: number, clientY: number) => {
    const estimatedHeight = Math.min(540, entries.length * 34 + 24);
    setPosition({
      x: Math.max(MENU_GUTTER, Math.min(clientX, window.innerWidth - MENU_WIDTH - MENU_GUTTER)),
      y: Math.max(MENU_GUTTER, Math.min(clientY, window.innerHeight - estimatedHeight - MENU_GUTTER)),
    });
  }, [entries.length]);

  useEffect(() => {
    if (!position) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const buttons = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const delta = event.key === "ArrowDown" ? 1 : -1;
      buttons[(current + delta + buttons.length) % buttons.length]?.focus();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    const frame = window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, position]);

  const cancelLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  return (
    <>
      <div
        className={className}
        onContextMenu={(event) => {
          event.preventDefault();
          openAt(event.clientX, event.clientY);
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== "touch") return;
          cancelLongPress();
          longPressRef.current = setTimeout(() => openAt(event.clientX, event.clientY), 520);
        }}
        onPointerMove={cancelLongPress}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
      >
        {children}
      </div>
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {position && (
            <motion.div
              ref={menuRef}
              role="menu"
              aria-label={ariaLabel}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -3 }}
              transition={{ duration: 0.13, ease: "easeOut" }}
              className="fixed z-[250] w-[236px] overflow-hidden rounded-md border border-[#31465f] bg-[#0b1420]/[0.98] p-1.5 text-[#c7d8e9] shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md"
              style={{ left: position.x, top: position.y, transformOrigin: "top left" }}
            >
              {entries.map((entry, index) => {
                if (entry.type === "separator") return <div key={index} role="separator" className="my-1 h-px bg-[#26384c]" />;
                if (entry.type === "label") return <div key={index} className="px-2.5 py-1.5 text-[9px] font-bold tracking-[0.18em] text-[#58718b]">{entry.label}</div>;
                return (
                  <button
                    key={`${entry.label}-${index}`}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={entry.checked}
                    disabled={entry.disabled}
                    onClick={() => { entry.onSelect(); close(); }}
                    className={`flex min-h-9 w-full items-center gap-2.5 rounded px-2.5 text-left text-[11px] outline-none transition-colors focus:bg-[#19314a] hover:bg-[#162b41] disabled:pointer-events-none disabled:opacity-35 ${entry.destructive ? "text-[#f18484]" : ""}`}
                  >
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[#75a9d6]">
                      {entry.checked !== undefined ? (entry.checked ? <Check size={14} /> : null) : entry.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                    {entry.shortcut && <span className="font-mono text-[9px] text-[#55708a]">{entry.shortcut}</span>}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
