"use client";

import { useEffect } from "react";

export function dispatchCasioFKey(key: string): void {
  window.dispatchEvent(new CustomEvent("casio-fkey", { detail: key.toUpperCase() }));
}

export function dispatchRunMatFKey(key: string): void {
  window.dispatchEvent(new CustomEvent("casio-run-mat-fkey", { detail: key.toLowerCase() }));
}

export function useCasioFKeys(actions: Array<(() => void) | undefined>): void {
  useEffect(() => {
    const onFKey = (event: Event) => {
      const key = (event as CustomEvent<string>).detail;
      const index = Number(key.slice(1)) - 1;
      actions[index]?.();
    };
    window.addEventListener("casio-fkey", onFKey);
    return () => window.removeEventListener("casio-fkey", onFKey);
  }, [actions]);
}
