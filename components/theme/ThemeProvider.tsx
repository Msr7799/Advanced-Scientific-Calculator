"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

export type AppTheme = "light" | "dark";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme, origin?: { x: number; y: number }) => void;
  toggleTheme: (origin?: { x: number; y: number }) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readTheme(): AppTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("dark");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setThemeState(readTheme()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const setTheme = useCallback((nextTheme: AppTheme, origin?: { x: number; y: number }) => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const applyTheme = () => {
      root.dataset.theme = nextTheme;
      root.style.colorScheme = nextTheme;
      window.localStorage.setItem("calculator-theme", nextTheme);
      setThemeState(nextTheme);
    };

    if (!("startViewTransition" in document) || reduceMotion) {
      applyTheme();
      return;
    }

    const transition = document.startViewTransition(() => flushSync(applyTheme));
    void transition.ready.then(() => {
      const x = origin?.x ?? window.innerWidth - 32;
      const y = origin?.y ?? 32;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }, []);

  const toggleTheme = useCallback((origin?: { x: number; y: number }) => {
    setTheme(readTheme() === "dark" ? "light" : "dark", origin);
  }, [setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}
