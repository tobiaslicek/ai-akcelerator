import { useRef, useState, type FormEvent } from "react";
import { ArmDelete, PageTitle } from "../components/ui";
import { plural } from "../lib/dates";
import { useEnter } from "../lib/motion";
import { addSys, patchSys, removeDoc, useStore, type State } from "../lib/store";
import type { SysItem } from "../types";

const KINDS = ["Skill", "Automatizace", "Appka", "Jiné"];

function SysRow({ s, it }: { s: State; it: SysItem }) {
  const [min, setMin] = useState(String(Number(it.minutes) || 0));
  return (
    <div className="row has-end" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
      <div className="row-main">
        <span className="row-name">{it.name}</span>
        <span className="row-sub">{[it.kind, it.note].filter(Boolean).join(", ")}</span>
      </div>
      <div className="row-end" style={{ gridColumn: "auto" }}>
        {it.status === "napad" ? (
          !s.readOnly && (
            <button type="button" className="btn ghost sm" onClick={() => patchSys(it, { status: "bezi" })}>
              Už běží
            </button>
          )
        ) : (
          <label className="quiet" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input
              className="field sys-min"
              type="number"
              min="0"
              step="5"
              inputMode="numeric"
              disabled={s.readOnly}
              aria-label={"Minut týdně: " + it.name}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              onBlur={() => {
                const v = Math.max(0, Math.round(Number(min) || 0));
                setMin(String(v));
                if (v !== (Number(it.minutes) || 0)) patchSys(it, { minutes: v });
              }}
            />
            min týdně
          </label>
        )}
        {!s.readOnly && <ArmDelete onConfirm={() => removeDoc("systems", it.id)} />}
      </div>
    </div>
  );
}

export function Systems() {
  const s = useStore();
  const ref = useRef<HTMLElement>(null);
  useEnter(ref, s.sysReady);
  const [name, setName] = useState("");
  const [kind, setKind] = useState(KINDS[0]);
  const [status, setStatus] = useState("bezi");
  const [note, setNote] = useState("");
  const all = [...s.systems].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const running = all.filter((x) => x.status !== "napad");
  const ideas = all.filter((x) => x.status === "napad");
  const mins = running.reduce((n, x) => n + (Number(x.minutes) || 0), 0);
  const [h0, h1] = (mins / 60).toFixed(1).split(".");
  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!name.trim()) return;
    await addSys(name.trim(), kind, status, note.trim());
    setName("");
    setNote("");
  };
  return (
    <section ref={ref} id="view-systemy">
      <div className="page-head">
        <PageTitle lead="Tvoje" tail="systémy" />
        <p className="quiet">Všechno, co za tebe pracuje, a nápady, co postavit dál. U každého si zapiš, kolik minut týdně ti šetří.</p>
      </div>
      <div className="sum">
        <div className="digits">
          {h0.padStart(2, "0").split("").map((c, i) => (
            <b key={i}>{c}</b>
          ))}
          <s>,</s>
          <b>{h1}</b>
        </div>
        <p>
          <strong>hodin týdně ti šetří AI</strong>
          {running.length ? plural(running.length, "systém běží", "systémy běží", "systémů běží") + ". Doplň minuty u těch, kde je zatím nula." : "Zatím tu žádný systém není."}
        </p>
      </div>
      {running.length > 0 && (
        <>
          <p className="group-h">Běží</p>
          <div className="rows">
            {running.map((it) => (
              <SysRow key={it.id + ":" + (it.minutes ?? 0)} s={s} it={it} />
            ))}
          </div>
        </>
      )}
      {ideas.length > 0 && (
        <>
          <p className="group-h">Nápady</p>
          <div className="rows">
            {ideas.map((it) => (
              <SysRow key={it.id} s={s} it={it} />
            ))}
          </div>
        </>
      )}
      {!s.readOnly && (
        <form className="add sys" onSubmit={submit}>
          <input className="field" id="sys-name" type="text" placeholder="Co to je" aria-label="Název systému" required value={name} onChange={(e) => setName(e.target.value)} />
          <select className="field" id="sys-kind" aria-label="Druh" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select className="field" id="sys-status" aria-label="Stav" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="bezi">Běží</option>
            <option value="napad">Nápad</option>
          </select>
          <button type="submit" className="btn primary">
            Přidat
          </button>
          <input className="field wide" id="sys-note" type="text" placeholder="Co dělá, jednou větou" aria-label="Poznámka" value={note} onChange={(e) => setNote(e.target.value)} />
        </form>
      )}
    </section>
  );
}
