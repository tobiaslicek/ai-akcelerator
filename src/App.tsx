import { useEffect, useState } from "react";
import { Toast } from "./components/ui";
import type { View } from "./types";
import { Learn } from "./views/Learn";
import { Library } from "./views/Library";
import { RouteView } from "./views/RouteView";
import { Systems } from "./views/Systems";
import { Today } from "./views/Today";

const TABS: [View, string][] = [
  ["dnes", "Dnes"],
  ["ucit-se", "Učit se"],
  ["trasa", "Trasa"],
  ["knihovna", "Knihovna"],
  ["systemy", "Systémy"],
];
const read = (): View => {
  const v = location.hash.slice(1) as View;
  return TABS.some(([id]) => id === v) ? v : "dnes";
};

export function App() {
  const [view, setView] = useState<View>(read);
  useEffect(() => {
    const on = () => {
      setView(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return (
    <>
      <div className="app">
        <main>
          {view === "dnes" && <Today />}
          {view === "ucit-se" && <Learn />}
          {view === "trasa" && <RouteView />}
          {view === "knihovna" && <Library />}
          {view === "systemy" && <Systems />}
        </main>
      </div>
      <nav className="nav" aria-label="Části aplikace">
        {TABS.map(([id, label]) => (
          <a key={id} href={"#" + id} aria-current={view === id ? "page" : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <Toast />
    </>
  );
}
