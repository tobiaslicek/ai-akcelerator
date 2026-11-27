import { useRef, useState, type FormEvent } from "react";
import { FeedbackBox } from "../components/FeedbackBox";
import { ArmDelete, PageTitle, Ring, usePointerLight } from "../components/ui";
import { plural } from "../lib/dates";
import { useEnter } from "../lib/motion";
import { addLib, removeDoc, toggleLib, useStore } from "../lib/store";
import type { LibItem } from "../types";

const THEME_COLORS: Record<string, string> = {
  "Kurzy a základy": "#FFB36B",
  "Claude Code a agenti": "#FF6A2A",
  "Weby a design": "#3B5BFF",
  "Vizuál a video": "#FF2E7E",
  Automatizace: "#8B5CFF",
  "Byznys s AI": "#19C3A6",
};
const color = (it: LibItem) => THEME_COLORS[it.theme ?? ""] ?? "#FF2E7E";
const safe = (u?: string) => (typeof u === "string" && u.startsWith("https://") ? u : null);

export function Library() {
  const s = useStore();
  const ref = useRef<HTMLElement>(null);
  useEnter(ref, s.libReady);
  const picksRef = usePointerLight<HTMLDivElement>(".pick");
  const [theme, setTheme] = useState("Vše");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [fbOpen, setFbOpen] = useState<string | null>(null);
  const all = [...s.library].sort((a, b) => (a.order || 0) - (b.order || 0));
  const themes = ["Vše", ...new Set(all.map((i) => i.theme).filter((t): t is string => !!t))];
  const picks = all.filter((i) => i.pick).sort((a, b) => (a.pick || 0) - (b.pick || 0));
  const list = theme === "Vše" ? all.filter((i) => !i.pick) : all.filter((i) => i.theme === theme);
  const ring = (it: LibItem) => <Ring on={!!it.done} disabled={s.readOnly} label={(it.done ? "Vrátit mezi nezhlédnuté: " : "Označit jako hotové: ") + it.title} onClick={() => toggleLib(it)} />;
  const fbKey = (it: LibItem) => "library-" + it.id;
  const noteBtn = (it: LibItem) => {
    const has = !!(s.feedback[fbKey(it)]?.rating || s.feedback[fbKey(it)]?.note);
    return (
      <button type="button" className="btn ghost sm fb-toggle" aria-expanded={fbOpen === it.id} onClick={() => setFbOpen(fbOpen === it.id ? null : it.id)}>
        {has ? "Připomínka uložená" : "Připomínka"}
      </button>
    );
  };
  const box = (it: LibItem) =>
    fbOpen === it.id && (
      <FeedbackBox
        id={fbKey(it)}
        kind="library"
        title={it.title}
        tag={it.theme}
        label="Chceš víc takových odkazů?"
        placeholder="Připomínka k odkazu. Třeba: tenhle autor mi sedí, nebo: moc povrchní"
      />
    );
  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    await addLib(url.trim(), title.trim());
    setUrl("");
    setTitle("");
  };
  return (
    <section ref={ref} id="view-knihovna">
      <div className="page-head">
        <PageTitle lead="Knihovna" tail="na později" />
        <p className="quiet">
          {all.length
            ? "Máš tu " + plural(all.length, "odkaz", "odkazy", "odkazů") + ", hotovo " + all.filter((i) => i.done).length + ". Nahoře je pořadí, které dává smysl pro tvoji trasu. Zbytek ber jako zásobu, ne jako povinnost."
            : "Videa, kurzy a články, ke kterým se chceš vrátit."}
        </p>
      </div>
      {!all.length && <p className="quiet">{s.libReady ? "Zatím tu nic není. Přidej první odkaz níže." : "Načítám…"}</p>}
      {theme === "Vše" && picks.length > 0 && (
        <>
          <div className="sec-head" style={{ marginTop: 0 }}>
            <h2>Začni tady</h2>
          </div>
          <div className="picks" ref={picksRef}>
            {picks.map((it) => (
              <article key={it.id} className={"card pick" + (it.done ? " is-done" : "")} style={{ ["--g" as string]: color(it) }}>
                <div className="item-meta">
                  <span className="pill">{it.theme || it.kind}</span>
                </div>
                <h3>{safe(it.url) ? <a href={it.url} target="_blank" rel="noopener">{it.title}</a> : it.title}</h3>
                {it.why && <p className="quiet">{it.why}</p>}
                <div className="pick-foot">
                  <span>{it.author}</span>
                  <span className="row-end">
                    {!s.readOnly && noteBtn(it)}
                    {ring(it)}
                  </span>
                </div>
                {box(it)}
              </article>
            ))}
          </div>
          <div className="sec-head">
            <h2>Všechno ostatní</h2>
          </div>
        </>
      )}
      {all.length > 0 && (
        <>
          <div className="chips" style={{ margin: "0 0 10px" }}>
            {themes.map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={theme === t} onClick={() => setTheme(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="rows">
            {list.map((it) => {
              const body = (
                <>
                  <span className="row-name">{it.title}</span>
                  <span className="row-sub">{[it.author, it.theme].filter(Boolean).join(", ")}</span>
                </>
              );
              return (
                <div key={it.id} className="row" style={{ ["--g" as string]: color(it), opacity: it.done ? 0.55 : undefined }}>
                  {ring(it)}
                  {safe(it.url) ? (
                    <a className="row-main" href={it.url} target="_blank" rel="noopener">
                      {body}
                    </a>
                  ) : (
                    <div className="row-main">{body}</div>
                  )}
                  <span className="row-end">
                    {!s.readOnly && noteBtn(it)}
                    {!s.readOnly && it.own && <ArmDelete onConfirm={() => removeDoc("library", it.id)} />}
                  </span>
                  {box(it)}
                </div>
              );
            })}
          </div>
        </>
      )}
      {!s.readOnly && (
        <form className="add two" onSubmit={submit}>
          <input className="field" id="lib-url" type="url" placeholder="Odkaz (https://…)" aria-label="Odkaz" required value={url} onChange={(e) => setUrl(e.target.value)} />
          <input className="field" id="lib-title" type="text" placeholder="Název" aria-label="Název" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <button type="submit" className="btn primary">
            Přidat odkaz
          </button>
        </form>
      )}
    </section>
  );
}
