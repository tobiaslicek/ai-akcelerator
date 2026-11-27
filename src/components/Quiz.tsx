import type { ReactNode } from "react";

export function Options({ options, correct, picked, onPick }: { options: string[]; correct: number; picked: number | undefined; onPick: (j: number) => void }) {
  return (
    <>
      {options.map((opt, j) => (
        <button key={j} type="button" className={"opt" + (picked == null ? "" : j === correct ? " ok" : j === picked ? " bad" : "")} disabled={picked != null} onClick={() => onPick(j)}>
          {opt}
        </button>
      ))}
    </>
  );
}

export function Question({ legend, children }: { legend: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="qq">
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}
