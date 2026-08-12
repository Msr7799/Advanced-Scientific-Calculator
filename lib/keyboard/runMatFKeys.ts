export type RunMatFKeyMenu = "main" | "more" | "calc" | "algb" | "optn" | "optn2" | "vars";

export const RUN_MAT_FKEY_LABELS: Record<RunMatFKeyMenu, Array<{ key: string; label: string }>> = {
  main: [
    { key: "F1", label: "CALC" }, { key: "F2", label: "ALGB" }, { key: "F3", label: "OPTN" },
    { key: "F4", label: "MENU" }, { key: "F5", label: "VARS" }, { key: "F6", label: ">" },
  ],
  calc: [
    { key: "F1", label: "int dx" }, { key: "F2", label: "d/dx" }, { key: "F3", label: "d2/dx2" },
    { key: "F4", label: "Solve" }, { key: "F5", label: "SUM" }, { key: "F6", label: "BACK" },
  ],
  algb: [
    { key: "F1", label: "Simp" }, { key: "F2", label: "Fact" }, { key: "F3", label: "Expa" },
    { key: "F4", label: "Solve" }, { key: "F5", label: "x" }, { key: "F6", label: "BACK" },
  ],
  optn: [
    { key: "F1", label: "LIST" }, { key: "F2", label: "MAT/VCT" }, { key: "F3", label: "CPLX" },
    { key: "F4", label: "CALC" }, { key: "F5", label: "STAT" }, { key: "F6", label: ">" },
  ],
  optn2: [
    { key: "F1", label: "CONV" }, { key: "F2", label: "HYP" }, { key: "F3", label: "PROB" },
    { key: "F4", label: "NUM" }, { key: "F5", label: "ANGLE" }, { key: "F6", label: "BACK" },
  ],
  vars: [
    { key: "F1", label: "Ans" }, { key: "F2", label: "M" }, { key: "F3", label: "X" },
    { key: "F4", label: "Y" }, { key: "F5", label: "Z" }, { key: "F6", label: "BACK" },
  ],
  more: [
    { key: "F1", label: "ANGLE" }, { key: "F2", label: "RCL" }, { key: "F3", label: "STO" },
    { key: "F4", label: "M+" }, { key: "F5", label: "M-" }, { key: "F6", label: "<" },
  ],
};
