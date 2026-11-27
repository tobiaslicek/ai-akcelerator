import { useRef } from "react";
import { Options, Question } from "../components/Quiz";
import { PageTitle, Ring } from "../components/ui";
import { daysTo, plural, todayKey } from "../lib/dates";
import { useEnter } from "../lib/motion";
import { answerReview, closeReview, doneCount, dueList, isDone, nextTopic, startReview, startTopic, toggleTopic, useStore, type State } from "../lib/store";
import { STAGES, STAGE_COLORS, TOPIC, TOPICS, type Topic } from "../lib/topics";

function Status({ s, t }: { s: State; t: Topic }) {
  const p = s.topics[t.id];
  if (!p) return null;
  if ((p.due || "") <= todayKey()) return <span className="pill due">Čeká na opakování</span>;
  if ((p.stage || 0) >= 3) return <span className="pill">Usazeno</span>;
  return <span className="pill">Opakování za {plural(daysTo(p.due), "den", "dny", "dní")}</span>;
}

function ReviewCard({ s }: { s: State }) {
  const R = s.review;
  const due = dueList(s);
  if (!R) {
    if (!due.length) return null;
    return (
      <div className="card review">
        <div className="review-head">
          <div>
            <h2>Čeká {plural(due.length, "téma", "témata", "témat")} na zopakování</h2>
            <p className="quiet">Jedna otázka ke každému. Co víš, se vrátí později. Co ne, zítra.</p>
          </div>
          {!s.readOnly && (
            <button type="button" className="btn hot" onClick={startReview}>
              Začít opakování
            </button>
          )}
        </div>
      </div>
    );
  }
  if (R.busy)
    return (
      <div className="card review">
        <p className="quiet">Připravuju otázky…</p>
      </div>
    );
  const all = R.items.every((_, i) => R.answers[i] != null);
  const right = R.items.filter((_, i) => R.right[i]).length;
  return (
    <div className="card review">
      <div className="review-head">
        <h2>Opakování</h2>
      </div>
      <div className="quiz">
        {R.items.map((it, i) => {
          const a = R.answers[i];
          const legend = (
            <>
              <span className="topic">{TOPIC[it.id]?.title}</span>
              {it.self ? "Vysvětli si to nahlas vlastními slovy. Šlo to?" : it.q}
            </>
          );
          return (
            <Question key={i} legend={legend}>
              {it.self ? (
                ([["Vím", true], ["Nevím", false]] as const).map(([label, ok]) => (
                  <button key={label} type="button" className={"opt" + (a == null ? "" : a === ok ? (ok ? " ok" : " bad") : "")} disabled={a != null} onClick={() => answerReview(i, ok, ok)}>
                    {label}
                  </button>
                ))
              ) : (
                <>
                  <Options options={it.options ?? []} correct={it.correct ?? 0} picked={typeof a === "number" ? a : undefined} onPick={(j) => answerReview(i, j, j === it.correct)} />
                  {a != null && <p className="why">{(a === it.correct ? "Správně. " : "Vedle. ") + (it.why ?? "")}</p>}
                </>
              )}
            </Question>
          );
        })}
        {all && (
          <>
            <p className="score">
              {right} z {R.items.length} sedí. {right === R.items.length ? "Tohle drží." : "Co nesedělo, se ti vrátí zítra."}
            </p>
            <div>
              <button type="button" className="btn primary" onClick={closeReview}>
                Hotovo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function RouteView() {
  const s = useStore();
  const ref = useRef<HTMLElement>(null);
  useEnter(ref);
  const nt = nextTopic(s);
  return (
    <section ref={ref} id="view-trasa">
      <div className="page-head">
        <PageTitle lead="Trasa" tail="od základů" />
        <p className="quiet">
          Šest etap, {TOPICS.length} témat. Hotovo máš {doneCount(s)}. Klikni na téma a lektor ti ho vysvětlí. Co odškrtneš, se ti vrátí k zopakování za den, týden a měsíc.
        </p>
      </div>
      <ReviewCard s={s} />
      {STAGES.map((st, i) => (
        <section key={st.n} className="stage-block" aria-label={st.n + ". etapa: " + st.name} style={{ ["--g" as string]: STAGE_COLORS[i] }}>
          <div className="stage-head">
            <span className="stage-n">{st.n}</span>
            <h2>
              {st.name}
              <small>
                {st.sub}, {st.topics.filter((t) => isDone(s, t.id)).length} z {st.topics.length}
              </small>
            </h2>
          </div>
          <div className="rows">
            {st.topics.map((t) => {
              const done = isDone(s, t.id);
              const isNext = nt?.id === t.id;
              const end = done || isNext;
              return (
                <div key={t.id} className={"row" + (end ? " has-end" : "")}>
                  <Ring on={done} disabled={s.readOnly} label={(done ? "Zrušit hotovo: " : "Označit jako hotové: ") + t.title} onClick={() => toggleTopic(t.id)} />
                  <button type="button" className="row-main" onClick={() => startTopic(t)}>
                    <span className="row-name">{t.title}</span>
                    <span className="row-sub">{t.hint}</span>
                  </button>
                  {end && (
                    <div className="row-end">
                      <Status s={s} t={t} />
                      {isNext && <span className="pill">Tady pokračuj</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
