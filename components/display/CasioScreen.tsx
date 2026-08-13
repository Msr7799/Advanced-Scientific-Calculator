"use client";

import { useEffect, useState } from "react";
import { useCasioStore } from "@/store/calculatorStore";
import NaturalMath from "@/components/display/NaturalMath";

interface FKeyLabel { key: string; label: string; color?: string }

interface CasioScreenProps {
  expression: string;
  result: string;
  isError: boolean;
  cursorPosition?: number;
  displaySize?: "calculator" | "expanded";
  fKeyLabels?: FKeyLabel[];
  onFKey?: (key: string) => void;
  children?: React.ReactNode;
  modeTitle?: string;
}

const DEFAULT_FKEYS: FKeyLabel[] = [
  { key: "F1", label: "CALC" },
  { key: "F2", label: "ALGB" },
  { key: "F3", label: "OPTN" },
  { key: "F4", label: "MENU" },
  { key: "F5", label: "VARS" },
  { key: "F6", label: "▶" },
];

export default function CasioScreen({
  expression,
  result,
  isError,
  cursorPosition = expression.length,
  displaySize = "calculator",
  fKeyLabels = DEFAULT_FKEYS,
  onFKey,
  children,
  modeTitle = "RUN-MAT",
}: CasioScreenProps) {
  const [cursorVisible, setCursorVisible] = useState(true);
  const { angleMode, shiftActive, alphaActive, memory } = useCasioStore();
  const showResult = result !== "";
  const hasMemory = memory !== 0;

  useEffect(() => {
    const timer = setInterval(() => setCursorVisible((visible) => !visible), 530);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="casio-lcd casio-lcd-glare lcd-flicker power-on flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[6px]"
    >
      <div className="status-bar flex shrink-0 select-none items-center justify-between px-2 py-[3px]">
        <div className="flex items-center gap-1">
          <span className={`status-indicator ${shiftActive ? "shift-on" : "off"}`}>SHIFT</span>
          <span className={`status-indicator ${alphaActive ? "alpha-on" : "off"}`}>ALPHA</span>
          {hasMemory && (
            <span className="status-indicator" style={{ background: "rgba(80,160,80,0.3)", color: "#80e080" }}>M</span>
          )}
        </div>

        <span className="lcd-accent font-mono text-[9px] font-bold tracking-[0.2em]">{modeTitle}</span>

        <div className="flex items-center gap-1">
          <span className="lcd-angle status-indicator">{angleMode}</span>
          <span className="text-[9px] text-[#506080]">▥</span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {children ? (
          <div className="absolute inset-0">{children}</div>
        ) : (
          <DefaultCalcView
            expression={expression}
            result={result}
            showResult={showResult}
            isError={isError}
            cursorPosition={cursorPosition}
            cursorVisible={cursorVisible}
            displaySize={displaySize}
          />
        )}
      </div>

      <div className="fkey-bar grid shrink-0 select-none grid-cols-6 border-t border-white/5" style={{ background: "rgba(8,18,36,0.3)" }}>
        {fKeyLabels.map((key) => (
          <button
            type="button"
            key={key.key}
            onClick={() => onFKey?.(key.key.toLowerCase())}
            disabled={!onFKey}
            className="fkey-label fkey-screen-button truncate border-r border-white/5 px-0.5 py-[4px] text-center font-bold tracking-wider last:border-r-0"
            style={{ color: key.color ?? "var(--lcd-accent)", fontSize: displaySize === "expanded" ? 11 : 10 }}
            aria-label={`${key.key}: ${key.label}`}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DefaultCalcView({
  expression,
  result,
  showResult,
  isError,
  cursorPosition,
  cursorVisible,
  displaySize,
}: {
  expression: string;
  result: string;
  showResult: boolean;
  isError: boolean;
  cursorPosition: number;
  cursorVisible: boolean;
  displaySize: "calculator" | "expanded";
}) {
  const expanded = displaySize === "expanded";

  return (
    <div className={`h-full overflow-auto ${expanded ? "px-5 py-4" : "px-4 py-3"}`}>
      <div
        className="min-h-[1.8em] overflow-x-auto overflow-y-hidden"
        style={{ fontSize: expanded ? 24 : 17 }}
      >
        <NaturalMath
          expression={expression}
          cursorPosition={cursorPosition}
          showCursor
          cursorVisible={cursorVisible}
          ariaLabel={expression || "Empty calculation line"}
        />
      </div>

      {(showResult || isError) && (
        <div className="mt-4 flex min-h-[2em] justify-end border-t border-white/5 pt-3 text-right">
          {isError ? (
            <div className="font-mono text-[13px] font-bold text-[#ff6060]" style={{ textShadow: "0 0 8px #ff606055" }}>
              {result || "Math ERROR"}
            </div>
          ) : (
            <div style={{ fontSize: expanded ? 32 : result.length > 14 ? 16 : result.length > 10 ? 19 : 24 }}>
              <NaturalMath
                expression={result}
                className="natural-result"
                ariaLabel={`Result: ${result}`}
                showCursor={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
