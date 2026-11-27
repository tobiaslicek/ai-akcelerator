import { useEffect, type RefObject } from "react";

export const REDUCED =
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SELECTOR = ".step,.rowx,.row,.pick,.challenge,.ask,.sum,.stage-head,.review";

export function animateIn(root: HTMLElement | null) {
  if (REDUCED || !root) return;
  [...root.querySelectorAll<HTMLElement>(SELECTOR)]
    .filter((e) => e.offsetParent)
    .slice(0, 18)
    .forEach((e, i) => {
      e.style.animation = "none";
      void e.offsetWidth;
      e.style.animation = "rise .7s var(--ease) " + (120 + i * 45) + "ms both";
      e.addEventListener("animationend", () => (e.style.animation = ""), { once: true });
    });
}

export function useEnter(ref: RefObject<HTMLElement | null>, ready: unknown = true) {
  useEffect(() => {
    if (ready) animateIn(ref.current);
  }, [ref, ready]);
}
