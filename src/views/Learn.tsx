import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FeedbackBox, fbId } from "../components/FeedbackBox";
import { Options, Question } from "../components/Quiz";
import { ArmDelete, PageTitle } from "../components/ui";
import { dictP } from "../lib/caps";
import { md } from "../lib/md";
import { useEnter } from "../lib/motion";
import { answerQuiz, askFollow, isDone, openNote, removeDoc, runLesson, runQuiz, saveNote, setLevel, startLesson, startTopic, stopLesson, toast, toggleTopic, useStore, type State } from "../lib/store";
import { TOPICS } from "../lib/topics";

const EXTRA = ["Rozdíl mezi skillem a subagentem", "Jak si postavit první automatizaci v n8n"];

function Markdown({ text }: { text: string }) {
  const html = useMemo(() => md(text), [text]);
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}

function LessonCard({ s }: { s: State }) {
  const L = s.lesson!;
  const ref = useRef<HTMLElement>(null);
  const [follow, setFollow] = useState("");
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [L.title]);
  const hasAnswer = L.turns.some((t, i) => i > 0 && t.role === "assistant");
  const saved = L.savedLen === L.turns.length;
  const done = !!L.topicId && isDone(s, L.topicId);
  const Q = L.quiz;
  const allAnswered = !!Q && Q.items.length > 0 && Q.items.every((_, i) => Q.answers[i] != null);
  const right = Q ? Q.items.filter((it, i) => Q.answers[i] === it.correct).length : 0;
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!follow.trim()) return;
    askFollow(follow);
    setFollow("");
  };
  return (
    <article className="card lesson" ref={ref}>
      <div className="lesson-head">
        <h2>{L.title}</h2>
        {L.busy && (
          <button type="button" className="btn ghost sm" onClick={stopLesson}>
            Zastavit
          </button>
        )}
      </div>
      {L.turns.slice(2).map((t, i) => (t.role === "assistant" ? <Markdown key={i} text={t.content} /> : <p key={i} className="q">{t.content}</p>))}
      {L.busy && (L.stream ? <Markdown text={L.stream} /> : <div className="md"><p className="quiet">Přemýšlím…</p></div>)}
      {L.error && <p className="err">{L.error}</p>}
      {!L.busy && L.error && L.turns[L.turns.length - 1].role === "user" && (
        <div className="actions">
          <button type="button" className="btn primary" onClick={runLesson}>
            Zkusit znovu
          </button>
        </div>
      )}
      {!L.busy && hasAnswer && (
        <>
          <div className="actions">
            <button type="button" className="btn ghost sm" disabled={!!Q?.busy} onClick={runQuiz}>
              {Q ? "Nové otázky" : "Vyzkoušej mě"}
            </button>
            {!s.readOnly && (
              <button type="button" className="btn ghost sm" disabled={saved} onClick={saveNote}>
                {saved ? "Uloženo v zápisníku" : "Uložit do zápisníku"}
              </button>
            )}
            {!s.readOnly && L.topicId && (
              <button type="button" className={"btn sm " + (done ? "ghost" : "hot")} onClick={() => toggleTopic(L.topicId!)}>
                {done ? "Hotovo. Vrátit zpět" : "Rozumím, mám hotovo"}
              </button>
            )}
          </div>
          {Q && (
            <div className="quiz">
              {Q.busy && <p className="quiet">Připravuju otázky…</p>}
              {Q.error && <p className="err">{Q.error}</p>}
              {Q.items.map((it, i) => (
                <Question key={i} legend={i + 1 + ". " + it.q}>
                  <Options options={it.options} correct={it.correct} picked={Q.answers[i]} onPick={(j) => answerQuiz(i, j)} />
                  {Q.answers[i] != null && <p className="why">{(Q.answers[i] === it.correct ? "Správně. " : "Vedle. ") + it.why}</p>}
                </Question>
              ))}
              {allAnswered && (
                <p className="score">
                  {right} z {Q.items.length} správně.{" "}
                  {right === Q.items.length ? "Tohle umíš." : right >= Q.items.length - 1 ? "Skoro. Projdi si, co ti uteklo." : "Zeptej se lektora na to, co nesedělo, a zkus to znovu."}
                </p>
              )}
            </div>
          )}
          <form className="follow" onSubmit={submit}>
            <input className="field" id="follow-q" type="text" placeholder="Zeptej se dál" aria-label="Doplňující otázka" autoComplete="off" value={follow} onChange={(e) => setFollow(e.target.value)} />
            <button type="submit" className="btn primary">
              Zeptat se
            </button>
          </form>
          <FeedbackBox
            id={L.topicId ? "lesson-" + L.topicId : fbId("lesson", L.title)}
            kind="lesson"
            title={L.title}
            label="Jak ti lekce sedla?"
            up="Takhle mi to sedí"
            down="Takhle ne"
            placeholder="Připomínka pro lektora. Třeba: víc příkladů z realit, nebo: moc dlouhé, zkrať to"
          />
        </>
      )}
    </article>
  );
}

export function Learn() {
  const s = useStore();
  const ref = useRef<HTMLElement>(null);
  useEnter(ref);
  const [q, setQ] = useState("");
  const [mic, setMic] = useState<"hidden" | "idle" | "on">("hidden");
  useEffect(() => {
    let dead = false;
    dictP.then((d) => {
      if (!d || dead) return;
      setMic("idle");
      d.onFinal(({ text }) => setQ((v) => (v.trim() ? v.trim() + " " : "") + text));
      d.onState(({ state }) => setMic((m) => (m === "hidden" ? m : state === "idle" ? "idle" : "on")));
    });
    return () => {
      dead = true;
    };
  }, []);
  const toggleMic = async () => {
    const d = await dictP;
    if (!d) return;
    if (d.active()) d.stop().catch(() => {});
    else
      d.start({ language: "cs" }).catch((e: { code?: string }) => {
        if (e?.code === "not_granted") setMic("hidden");
        else if (e?.code !== "dismissed") toast("Diktování se nepovedlo spustit.");
      });
  };
  const submit = (ev?: FormEvent) => {
    ev?.preventDefault();
    const v = q.trim();
    if (!v) return;
    setQ("");
    startLesson(v);
  };
  const picks = TOPICS.filter((t) => !isDone(s, t.id)).slice(0, 3);
  return (
    <section ref={ref} id="view-ucit-se">
      <div className="narrow">
        <div className="page-head">
          <PageTitle lead="Co se chceš" tail="naučit?" />
        </div>
        <form className="card ask" onSubmit={submit}>
          <textarea
            id="ask-q"
            rows={2}
            placeholder="Napiš téma nebo otázku. Třeba: jak funguje MCP a k čemu mi bude"
            aria-label="Téma nebo otázka"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <div className="ask-row">
            <fieldset className="seg">
              <input type="radio" name="level" id="lvl-zero" checked={s.level === "zero"} onChange={() => setLevel("zero")} />
              <label htmlFor="lvl-zero">Od nuly</label>
              <input type="radio" name="level" id="lvl-some" checked={s.level === "some"} onChange={() => setLevel("some")} />
              <label htmlFor="lvl-some">Základ mám</label>
            </fieldset>
            <div className="actions">
              {mic !== "hidden" && (
                <button type="button" className="btn ghost" aria-pressed={mic === "on"} onClick={toggleMic}>
                  {mic === "on" ? "Poslouchám, klikni pro konec" : "Diktovat"}
                </button>
              )}
              <button type="submit" className="btn hot">
                Vysvětli mi to
              </button>
            </div>
          </div>
        </form>
        <div className="chips">
          {picks.map((t) => (
            <button key={t.id} type="button" className="chip" onClick={() => startTopic(t)}>
              {t.title}
            </button>
          ))}
          {EXTRA.map((x) => (
            <button key={x} type="button" className="chip" onClick={() => startLesson(x)}>
              {x}
            </button>
          ))}
        </div>
        {s.tutorOff && <p className="notice">Lektor odpovídá, jen když je stránka otevřená v Claude a má povoleno ptát se Clauda.</p>}
        {s.lesson && <LessonCard s={s} />}
        <div className="sec-head">
          <h2>Zápisník</h2>
        </div>
        {!s.notes.length && <p className="quiet">Lekce, které si uložíš, najdeš tady. Můžeš se k nim vrátit a ptát se dál.</p>}
        <div className="rows">
          {s.notes.map((n) => {
            const d = new Date(n.createdAt || 0);
            return (
              <div key={n.id} className="row has-end" style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}>
                <button type="button" className="row-main" onClick={() => openNote(n)}>
                  <span className="row-name">{n.title || "Lekce"}</span>
                  <span className="row-sub">{d.getDate() + ". " + (d.getMonth() + 1) + ". " + d.getFullYear()}</span>
                </button>
                {!s.readOnly && (
                  <div className="row-end" style={{ gridColumn: "auto" }}>
                    <ArmDelete onConfirm={() => removeDoc("notes", n.id)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
