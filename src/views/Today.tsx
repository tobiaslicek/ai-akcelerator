import { useRef, useState } from "react";
import { Gauge } from "../components/Gauge";
import { Lit } from "../components/ui";
import { longDate, parseKey, plural, shortDate, todayKey, weekKey } from "../lib/dates";
import { useEnter } from "../lib/motion";
import {
  currentBrief,
  dueList,
  installApp,
  markDay,
  nextTopic,
  proposeChallenge,
  setBriefIdx,
  startLesson,
  startReview,
  startTopic,
  streak,
  today,
  toggleChStep,
  toggleListen,
  useStore,
  type State,
} from "../lib/store";
import type { NewsItem } from "../types";

const TAG_COLORS: Record<string, string> = { Claude: "#FF6A2A", "Vizuál": "#FF2E7E", Automatizace: "#3B5BFF", Modely: "#8B5CFF", "Nástroje": "#19C3A6" };

function Hero({ s }: { s: State }) {
  const hr = new Date().getHours();
  const hello = hr < 10 ? "Dobré ráno" : hr < 18 ? "Dobrý den" : "Dobrý večer";
  const due = dueList(s);
  const d = today(s);
  const nt = nextTopic(s);
  const brief = currentBrief(s);
  const steps = [
    {
      done: !!d.brief,
      title: "Přečti si brief",
      sub: brief ? plural((brief.items ?? []).length, "novinka", "novinky", "novinek") + " na míru" : "Dnes tu zatím žádný není",
      go: () => document.getElementById("headline")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    },
    {
      done: !!d.review || due.length === 0,
      title: "Zopakuj si, co umíš",
      sub: d.review ? "Hotovo" : due.length ? "Čeká " + plural(due.length, "téma", "témata", "témat") : "Dnes nic nečeká",
      go: () => {
        location.hash = "trasa";
        if (due.length && !s.review) startReview();
      },
    },
    {
      done: !!d.lesson,
      title: "Nauč se jednu věc",
      sub: nt ? nt.title : "Zeptej se lektora na cokoli",
      go: () => (nt && !d.lesson ? startTopic(nt) : void (location.hash = "ucit-se")),
    },
  ];
  const n = steps.filter((x) => x.done).length;
  const st = streak(s);
  return (
    <div className="hero">
      <div className="hero-copy">
        <p className="date">{longDate(new Date()).replace(/^./, (c) => c.toUpperCase())}</p>
        <Lit as="h1" className="hello" text={hello} />
        <Lit className="tagline" text={n === 3 ? "jedeš naplno." : n === 0 ? "roztoč to." : "ještě přidej."} base={260} />
        <Lit className="lead" text={n === 3 ? "Dnešní rozjezd je hotový. Všechno navíc je bonus." : "Tři krátké kroky. Oblouk ukazuje, kolik jich dnes máš."} base={420} />
      </div>
      <Gauge value={n} streakLabel={st + " " + (st === 1 ? "den v řadě" : st >= 2 && st <= 4 ? "dny v řadě" : "dní v řadě")} />
      <div className="steps">
        {steps.map((x) => (
          <button key={x.title} type="button" className={"step" + (x.done ? " is-done" : "")} onClick={x.go}>
            <span className="ring" />
            <span>
              <b>{x.title}</b>
              <small>{x.sub}</small>
            </span>
            {!x.done && <em>Jdu na to</em>}
          </button>
        ))}
      </div>
    </div>
  );
}

function NewsRow({ it, i, open, onToggle }: { it: NewsItem; i: number; open: boolean; onToggle: () => void }) {
  const url = typeof it.url === "string" && it.url.startsWith("https://") ? it.url : null;
  const ask =
    "Vysvětli mi tuhle novinku a co s ní můžu prakticky udělat. Vycházej jen z tohoto shrnutí a nic si k ní nevymýšlej. Když ti něco chybí, řekni to.\n\n" +
    [it.title, it.summary, it.why, it.try].filter(Boolean).join("\n");
  return (
    <div className={"rowx" + (open ? " open" : "")} style={{ ["--g" as string]: TAG_COLORS[it.tag ?? ""] ?? "#FF6A2A" }}>
      <button type="button" aria-expanded={open} onClick={onToggle}>
        <i>{String(i + 1).padStart(2, "0")}</i>
        <span>{it.title}</span>
        <span className="tagp">{[it.tag, shortDate(it.date)].filter(Boolean).join(", ")}</span>
      </button>
      <div className="more">
        <div>
          <div className="inner">
            {it.summary && <p>{it.summary}</p>}
            {it.why && (
              <div className="kv">
                <b>Proč se ti to hodí</b>
                <span>{it.why}</span>
              </div>
            )}
            {it.try && (
              <div className="kv">
                <b>Zkus to na 10 minut</b>
                <span>{it.try}</span>
              </div>
            )}
            <div className="item-actions">
              <button type="button" className="btn ghost sm" onClick={() => startLesson(String(it.title || "Novinka"), { ask })}>
                Vysvětli mi to
              </button>
              {url && (
                <a href={url} target="_blank" rel="noopener">
                  Zdroj: {it.source || "odkaz"}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BriefSection({ s }: { s: State }) {
  const brief = currentBrief(s);
  const [open, setOpen] = useState(0);
  const [openFor, setOpenFor] = useState("");
  const key = brief?.id ?? "";
  if (key !== openFor) {
    setOpenFor(key);
    setOpen(0);
  }
  const items = brief && Array.isArray(brief.items) ? brief.items : [];
  const headline = brief
    ? brief.headline || "Co je nového v AI"
    : !s.briefsReady && !s.briefsLate
      ? "Načítám brief…"
      : s.briefsReady
        ? "Brief tu zatím není."
        : "Brief se nepodařilo načíst.";
  const read = !!today(s).brief;
  const bd = brief ? parseKey(brief.date) : null;
  return (
    <>
      <div className="sec-head">
        <Lit as="h2" id="headline" text={headline} />
        <div className="sec-tools">
          {s.briefs.length > 1 && brief && (
            <div className="daynav">
              <button type="button" className="btn ghost sm" disabled={s.briefIdx >= s.briefs.length - 1} onClick={() => setBriefIdx(s.briefIdx + 1)}>
                Starší
              </button>
              <span>{shortDate(brief.date)}</span>
              <button type="button" className="btn ghost sm" disabled={s.briefIdx <= 0} onClick={() => setBriefIdx(s.briefIdx - 1)}>
                Novější
              </button>
            </div>
          )}
          {brief && s.canSpeak && (
            <button type="button" className="btn primary sm" onClick={toggleListen}>
              {s.speaking ? "Zastavit čtení" : "Poslechnout"}
            </button>
          )}
        </div>
      </div>
      <div id="news">
        {!brief && (s.briefsReady || s.briefsLate) && (
          <div className="card empty">
            <p>
              {s.briefsReady
                ? "Novinky sem zapisuje Claude. Jakmile první brief dorazí, uvidíš tady, co je nového, proč se ti to hodí a co si na deset minut zkusit."
                : "Data se zatím nepodařilo načíst. Otevři stránku v Claude a zkontroluj připojení."}
            </p>
          </div>
        )}
        {brief && brief.date !== todayKey() && (
          <p className="quiet" style={{ marginBottom: 16 }}>
            {(s.briefIdx === 0 ? "Poslední brief je z " : "Brief z ") + (bd ? longDate(bd) : brief.date) + "." + (s.briefIdx === 0 ? " Novější tu zatím není." : "")}
          </p>
        )}
        {brief && !items.length && (
          <div className="card empty">
            <p>Tenhle brief nemá žádné položky.</p>
          </div>
        )}
        {items.length > 0 && (
          <div className="rowsx">
            {items.map((it, i) => (
              <NewsRow key={i} it={it} i={i} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
            ))}
          </div>
        )}
        {items.length > 0 && s.briefIdx === 0 && !s.readOnly && (
          <div className="read-row">
            <button type="button" className={"btn " + (read ? "ghost" : "hot")} disabled={read} onClick={() => markDay("brief")}>
              {read ? "Brief máš přečtený" : "Mám přečteno"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function ChallengeCard({ s }: { s: State }) {
  const ch = s.challenges.find((c) => c.id === weekKey());
  if (!ch) {
    return (
      <div className="challenge">
        <h3>Na tenhle týden tu výzva není.</h3>
        <p>Výzva je jeden malý projekt na hodinu až dvě, navázaný na to, co se zrovna učíš. Lektor ti ji navrhne podle tvé trasy.</p>
        {!s.readOnly && (
          <div>
            <button type="button" className="btn ghost" disabled={s.chBusy || s.tutorOff} onClick={proposeChallenge}>
              {s.chBusy ? "Vymýšlím…" : "Navrhnout výzvu"}
            </button>
          </div>
        )}
      </div>
    );
  }
  const steps = Array.isArray(ch.steps) ? ch.steps : [];
  const left = steps.filter((x) => !x.done).length;
  return (
    <div className="challenge">
      <h3>{ch.title || "Výzva týdne"}</h3>
      {ch.why && <p>{ch.why}</p>}
      <div className="ch-steps">
        {steps.map((x, i) => (
          <button key={i} type="button" className={"ch-step" + (x.done ? " is-done" : "")} aria-pressed={!!x.done} disabled={s.readOnly} onClick={() => toggleChStep(ch, i)}>
            <span className="ring" />
            <span>{x.text}</span>
          </button>
        ))}
      </div>
      <p>{steps.length && !left ? "Výzva je splněná. Zapiš si ji do Systémů, ať o ní víš." : "Zbývá " + plural(left, "krok", "kroky", "kroků") + "."}</p>
    </div>
  );
}

export function Today() {
  const s = useStore();
  const ref = useRef<HTMLElement>(null);
  useEnter(ref, s.briefsReady || s.briefsLate);
  return (
    <section ref={ref}>
      <Hero s={s} />
      <BriefSection s={s} />
      <div className="sec-head">
        <h2>Výzva týdne</h2>
      </div>
      <ChallengeCard s={s} />
      {s.canInstall && (
        <div className="foot">
          <button type="button" className="btn ghost" onClick={installApp}>
            Nainstalovat jako appku
          </button>
        </div>
      )}
    </section>
  );
}
