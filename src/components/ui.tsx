import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useStore } from "../lib/store";

export function Words({ text, base = 0, start = 0 }: { text: string; base?: number; start?: number }) {
  const parts = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {parts.map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          <span className="w" style={{ animationDelay: base + (start + i) * 35 + "ms" }}>
            {w}
          </span>
        </span>
      ))}
    </>
  );
}

type LitTag = "h1" | "h2" | "p";
export function Lit({ as: Tag = "p", className = "", text, base = 0, id }: { as?: LitTag; className?: string; text: string; base?: number; id?: string }) {
  return (
    <Tag key={text} id={id} className={className + " lit play"}>
      <Words text={text} base={base} />
    </Tag>
  );
}

export function PageTitle({ lead, tail }: { lead: string; tail: string }) {
  const n = lead.split(/\s+/).filter(Boolean).length;
  return (
    <h1 className="title lit play">
      <Words text={lead} /> <i><Words text={tail} start={n} /></i>
    </h1>
  );
}

export function Ring({ on, label, onClick, disabled }: { on: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" className={"ring" + (on ? " on" : "")} aria-pressed={on} aria-label={label} disabled={disabled} onClick={onClick} />;
}

export function ArmDelete({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className="link" onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? "Opravdu smazat?" : "Smazat"}
    </button>
  );
}

export function Toast() {
  const { toast } = useStore();
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!toast.n) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 2600);
    return () => clearTimeout(t);
  }, [toast.n]);
  return (
    <div className={"toast" + (on ? " on" : "")} role="status" aria-live="polite">
      {toast.text}
    </div>
  );
}

export function Glow({ color, className, style, children }: { color: string; className: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={className} style={{ ...style, ["--g" as string]: color }}>
      {children}
    </div>
  );
}

export function usePointerLight<T extends HTMLElement>(selector: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      root.querySelectorAll<HTMLElement>(selector).forEach((c) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", e.clientX - r.left + "px");
        c.style.setProperty("--my", e.clientY - r.top + "px");
        c.style.setProperty("--o", ".55");
      });
    };
    const leave = () =>
      root.querySelectorAll<HTMLElement>(selector).forEach((c) => {
        c.style.removeProperty("--mx");
        c.style.removeProperty("--my");
        c.style.removeProperty("--o");
      });
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", leave);
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
    };
  }, [selector]);
  return ref;
}
