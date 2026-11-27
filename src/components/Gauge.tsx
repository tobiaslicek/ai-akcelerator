import { useEffect, useRef } from "react";
import { REDUCED } from "../lib/motion";

const ARC = "M54.51 284 A168 168 0 1 1 345.49 284";
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeBack = (x: number) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
type Step = { to: number | null; ms: number; ease: (x: number) => number };
const REV: Step[] = [
  { to: 3, ms: 800, ease: easeIO },
  { to: 3, ms: 320, ease: easeIO },
  { to: 2.2, ms: 230, ease: easeIO },
  { to: 3, ms: 240, ease: easeIO },
  { to: 3, ms: 220, ease: easeIO },
  { to: null, ms: 1150, ease: easeBack },
];

export function Gauge({ value, streakLabel }: { value: number; streakLabel: string }) {
  const arc = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const num = useRef<SVGTextElement>(null);
  const target = useRef(value);
  const queue = useRef<Step[]>([]);
  target.current = value;

  useEffect(() => {
    let v = 0;
    let raf = 0;
    let cur: (Step & { from: number; t0: number }) | null = null;
    const draw = (x: number) => {
      const c = Math.max(0, Math.min(3, x));
      const a = ((-120 + c * 80) * Math.PI) / 180;
      arc.current?.setAttribute("stroke-dasharray", ((c / 3) * 100).toFixed(2) + " 100");
      if (arc.current) arc.current.style.opacity = c > 0.01 ? "1" : "0";
      dot.current?.setAttribute("cx", (200 + 168 * Math.sin(a)).toFixed(2));
      dot.current?.setAttribute("cy", (200 - 168 * Math.cos(a)).toFixed(2));
      if (num.current) num.current.textContent = String(Math.round(c));
    };
    if (REDUCED) {
      const tick = () => {
        draw(target.current);
        raf = requestAnimationFrame(tick);
      };
      tick();
      return () => cancelAnimationFrame(raf);
    }
    queue.current = [...REV];
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (!cur && queue.current.length) cur = { ...queue.current.shift()!, from: v, t0: now };
      if (!cur) {
        if (Math.abs(v - target.current) > 0.01) queue.current = [{ to: null, ms: 900, ease: easeBack }];
        return;
      }
      const p = Math.min(1, (now - cur.t0) / cur.ms);
      const to = cur.to ?? target.current;
      v = cur.from + (to - cur.from) * cur.ease(p);
      if (p >= 1) cur = null;
      draw(v);
    };
    draw(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="stage">
      <button
        className="dial"
        type="button"
        aria-label={"Dnešní rozjezd: " + value + " ze 3 kroků. Kliknutím protočíš motor."}
        onClick={() => {
          if (!REDUCED) queue.current = REV.slice(2);
        }}
      >
        <svg viewBox="0 0 400 400" aria-hidden="true">
          <defs>
            <linearGradient id="glow" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#FFB36B" />
              <stop offset=".6" stopColor="#FF5A2A" />
              <stop offset="1" stopColor="#FF2E7E" />
            </linearGradient>
          </defs>
          <path d={ARC} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="16" strokeLinecap="round" />
          <path ref={arc} d={ARC} fill="none" stroke="url(#glow)" strokeWidth="16" strokeLinecap="round" pathLength={100} strokeDasharray="0 100" style={{ filter: "drop-shadow(0 0 14px rgba(255,110,50,.75))" }} />
          <circle ref={dot} cx="54.51" cy="284" r="11" fill="#fff" style={{ filter: "drop-shadow(0 0 10px #fff)" }} />
          <text ref={num} x="200" y="246" textAnchor="middle" fill="#fff" fontSize="170" fontWeight="300" fontFamily="Jost,Futura,sans-serif">0</text>
          <text x="200" y="292" textAnchor="middle" fill="rgba(255,255,255,.66)" fontSize="20" fontFamily="Jost,Futura,sans-serif">ze 3 kroků</text>
          <text x="200" y="352" textAnchor="middle" fill="rgba(255,255,255,.5)" fontSize="17" fontFamily="Jost,Futura,sans-serif">{streakLabel}</text>
        </svg>
      </button>
    </div>
  );
}
