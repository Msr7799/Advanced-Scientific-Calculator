"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";
interface ToastInput { title: string; description?: string; variant?: ToastVariant; duration?: number }
interface ToastMessage extends ToastInput { id: number }

const ToastContext = createContext<((message: ToastInput) => void) | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: "#49d39a",
  error: "#f17878",
  warning: "#e9bc55",
  info: "#69afe6",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);
  const dismiss = useCallback((id: number) => setMessages((current) => current.filter((message) => message.id !== id)), []);
  const toast = useCallback((input: ToastInput) => {
    const id = ++nextId.current;
    setMessages((current) => [...current.slice(-3), { ...input, id }]);
    window.setTimeout(() => dismiss(id), input.duration ?? 3600);
  }, [dismiss]);
  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[400] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2" aria-live="polite" aria-atomic="true">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const variant = message.variant ?? "info";
            const Icon = ICONS[variant];
            return (
              <motion.div key={message.id} initial={{ opacity: 0, x: 32, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 24, scale: 0.97 }} transition={{ duration: 0.18, ease: "easeOut" }} className="pointer-events-auto relative overflow-hidden rounded-md border border-[#30445a] bg-[#0b1420]/95 p-3.5 shadow-[0_16px_50px_rgba(0,0,0,0.55)] backdrop-blur-md">
                <div className="absolute inset-y-0 left-0 w-1" style={{ background: COLORS[variant] }} />
                <div className="flex gap-3 pl-1">
                  <Icon size={18} className="mt-0.5 shrink-0" style={{ color: COLORS[variant] }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-bold text-[#e1edf7]">{message.title}</div>
                    {message.description && <div className="mt-1 break-words text-[10px] leading-4 text-[#718ca5]">{message.description}</div>}
                  </div>
                  <button type="button" onClick={() => dismiss(message.id)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#60788e] hover:bg-white/5 hover:text-white" aria-label="Dismiss notification"><X size={13} /></button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
