"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, type ReactNode } from "react";

interface AppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
  danger?: boolean;
}

export function AppDialog({ open, onOpenChange, title, description, icon, children, footer, danger = false }: AppDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus());
    return () => { cancelAnimationFrame(frame); window.removeEventListener("keydown", onKeyDown); };
  }, [onOpenChange, open]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}>
          <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.18, ease: "easeOut" }} className="w-full max-w-[440px] overflow-hidden rounded-md border border-[#334a61] bg-[#0b1420] shadow-[0_24px_90px_rgba(0,0,0,0.7)]">
            <div className="flex items-start gap-3 border-b border-[#24384d] px-5 py-4">
              {icon && <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${danger ? "border-[#6d343b] bg-[#32171c] text-[#f17878]" : "border-[#294b68] bg-[#10283d] text-[#74b7e9]"}`}>{icon}</div>}
              <div className="min-w-0 flex-1">
                <h2 id="app-dialog-title" className="text-[14px] font-bold text-[#edf6ff]">{title}</h2>
                {description && <p className="mt-1 text-[10px] leading-4 text-[#718aa2]">{description}</p>}
              </div>
              <button type="button" onClick={() => onOpenChange(false)} className="mode-icon-button" aria-label="Close dialog"><X size={14} /></button>
            </div>
            {children && <div className="px-5 py-4">{children}</div>}
            <div className="flex items-center justify-end gap-2 border-t border-[#24384d] bg-[#08111b] px-5 py-3">{footer}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export const dialogButtonClass = "inline-flex min-h-9 items-center justify-center rounded-md border px-4 text-[11px] font-bold transition-colors disabled:pointer-events-none disabled:opacity-40";
