/**
 * Casio fx-CG50 Physical Keyboard Mapping
 * Maps browser keyboard events to calculator actions.
 */

export type CasioKeyAction =
  | { type: "DIGIT"; value: string }
  | { type: "OPERATOR"; value: string }
  | { type: "FUNCTION"; value: string }
  | { type: "CONTROL"; value: "EXE" | "DEL" | "AC" | "EXIT" | "MENU" | "SHIFT" | "ALPHA" }
  | { type: "DPAD"; value: "UP" | "DOWN" | "LEFT" | "RIGHT" | "CENTER" }
  | { type: "FKEY"; value: "F1" | "F2" | "F3" | "F4" | "F5" | "F6" }
  | { type: "NONE" };

export function mapKeyboardEvent(e: KeyboardEvent): CasioKeyAction {
  // Ignore modifier-key combos (except Shift for function keys)
  if (e.ctrlKey || e.metaKey || e.altKey) return { type: "NONE" };

  const { key } = e;

  // D-pad / navigation
  if (key === "ArrowUp")    return { type: "DPAD", value: "UP" };
  if (key === "ArrowDown")  return { type: "DPAD", value: "DOWN" };
  if (key === "ArrowLeft")  return { type: "DPAD", value: "LEFT" };
  if (key === "ArrowRight") return { type: "DPAD", value: "RIGHT" };

  // Control
  if (key === "Enter")     return { type: "CONTROL", value: "EXE" };
  if (key === "Backspace") return { type: "CONTROL", value: "DEL" };
  if (key === "Escape")    return { type: "CONTROL", value: "EXIT" };
  if (key === "Delete")    return { type: "CONTROL", value: "AC" };

  // Function keys
  if (key === "F1") return { type: "FKEY", value: "F1" };
  if (key === "F2") return { type: "FKEY", value: "F2" };
  if (key === "F3") return { type: "FKEY", value: "F3" };
  if (key === "F4") return { type: "FKEY", value: "F4" };
  if (key === "F5") return { type: "FKEY", value: "F5" };
  if (key === "F6") return { type: "FKEY", value: "F6" };

  // Digits
  if (/^[0-9]$/.test(key)) return { type: "DIGIT", value: key };
  if (key === ".") return { type: "DIGIT", value: "." };

  // Operators
  const opMap: Record<string, string> = {
    "+": "+", "-": "-", "*": "*", "/": "/",
    "^": "^", "%": "%", "(": "(", ")": ")",
    "=": "=",
  };
  if (opMap[key]) return { type: "OPERATOR", value: opMap[key] };

  // Shift-based shortcuts
  if (e.shiftKey) {
    const shiftMap: Record<string, string> = {
      "S": "sin(",
      "C": "cos(",
      "T": "tan(",
      "L": "log(",
      "N": "ln(",
      "Q": "sqrt(",
      "P": "pi",
      "E": "e",
      "A": "ans",
    };
    if (shiftMap[key]) return { type: "FUNCTION", value: shiftMap[key] };
  }

  return { type: "NONE" };
}

/** Keys that should have default browser behavior suppressed */
export function shouldPreventDefault(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const controlled = [
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "Enter", "Backspace", "Escape", "Delete",
    "F1", "F2", "F3", "F4", "F5", "F6",
    "=", "+", "-", "*", "/", "^", "%",
    "0","1","2","3","4","5","6","7","8","9",".",
    "(", ")",
  ];
  return controlled.includes(e.key);
}
