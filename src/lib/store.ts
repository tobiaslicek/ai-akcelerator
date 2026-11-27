import { useSyncExternalStore } from "react";
import type {
  Brief,
  Challenge,
  Day,
  Days,
  Feedback,
  Lesson,
  LibItem,
  Note,
  QuizItem,
  Review,
  ReviewItem,
  SysItem,
  TopicProgress,
  Turn,
} from "../types";
import { dbP, deskP, sampleP, ttsP, userP, type DocSnap, type QuerySnap, type SampleError } from "./caps";
import { addDays, daysTo, todayKey, weekKey } from "./dates";
import { GAPS, TOPIC, TOPICS, type Topic } from "./topics";

export interface State {
  briefs: Brief[];
  briefIdx: number;
  briefsReady: boolean;
  briefsLate: boolean;
  topics: Record<string, TopicProgress>;
  days: Days;
  notes: Note[];
  library: LibItem[];
  libReady: boolean;
  systems: SysItem[];
  sysReady: boolean;
  challenges: Challenge[];
  feedback: Record<string, Feedback>;
  profile: string;
  readOnly: boolean;
  tutorOff: boolean;
  canSpeak: boolean;
  speaking: boolean;
  canInstall: boolean;
  installState: string;
  chBusy: boolean;
  lesson: Lesson | null;
  review: Review | null;
  level: "zero" | "some";
  toast: { text: string; n: number };
}

const DEFAULT_PROFILE =
  "Pracuje v marketingu. Staví weby v Claude Code, vizuály dělá v AI nástrojích na obraz a video a učí se AI automatizace (n8n, Make). Nemá pevné technické základy.";

const readLevel = (): "zero" | "some" => {
  try {
    return localStorage.getItem("rozjezd-level") === "some" ? "some" : "zero";
  } catch {
    return "zero";
  }
};

let state: State = {
  briefs: [],
  briefIdx: 0,
  briefsReady: false,
  briefsLate: false,
  topics: {},
  days: {},
  notes: [],
  library: [],
  libReady: false,
  systems: [],
  sysReady: false,
  challenges: [],
  feedback: {},
  profile: DEFAULT_PROFILE,
  readOnly: false,
  tutorOff: false,
  canSpeak: false,
  speaking: false,
  canInstall: false,
  installState: "",
  chBusy: false,
  lesson: null,
  review: null,
  level: readLevel(),
  toast: { text: "", n: 0 },
};

const subs = new Set<() => void>();
const subscribe = (fn: () => void) => {
  subs.add(fn);
  return () => subs.delete(fn);
};
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  subs.forEach((fn) => fn());
};
export const getState = () => state;
export const useStore = () => useSyncExternalStore(subscribe, getState);

export const toast = (text: string) => set({ toast: { text, n: state.toast.n + 1 } });

export const isDone = (s: State, id: string) => !!s.topics[id];
export const doneCount = (s: State) => TOPICS.filter((t) => s.topics[t.id]).length;
export const nextTopic = (s: State): Topic | null => TOPICS.find((t) => !s.topics[t.id]) ?? null;
export const dueList = (s: State) => TOPICS.filter((t) => s.topics[t.id] && (s.topics[t.id].due || "") <= todayKey());
export const today = (s: State): Day => s.days[todayKey()] ?? {};
export const currentBrief = (s: State): Brief | null => s.briefs[s.briefIdx] ?? null;
export function streak(s: State) {
  const any = (k: string) => {
    const d = s.days[k];
    return !!(d && (d.brief || d.review || d.lesson));
  };
  let k = todayKey();
  let n = 0;
  if (!any(k)) k = addDays(k, -1);
  while (any(k) && n < 999) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

const savers: Record<string, { busy: boolean; dirty: boolean }> = {};
function save(path: string, get: () => Record<string, unknown>) {
  const s = savers[path] ?? (savers[path] = { busy: false, dirty: false });
  if (s.busy) {
    s.dirty = true;
    return;
  }
  s.busy = true;
  (async () => {
    try {
      const db = await dbP;
      if (db) await db.doc(path).set({ ...get(), updatedAt: Date.now() });
    } catch {
      toast("Uložení se nepovedlo.");
    } finally {
      s.busy = false;
      if (s.dirty) {
        s.dirty = false;
        save(path, get);
      }
    }
  })();
}
const saving = (path: string) => !!(savers[path] && (savers[path].busy || savers[path].dirty));

export function markDay(step: keyof Day) {
  if (state.readOnly || today(state)[step]) return;
  const k = todayKey();
  const days: Days = { ...state.days, [k]: { ...today(state), [step]: true } };
  for (const d of Object.keys(days)) if (daysTo(d) < -120) delete days[d];
  set({ days });
  save("state/days", () => ({ days: state.days }));
}

export function toggleTopic(id: string) {
  if (state.readOnly) return;
  const topics = { ...state.topics };
  if (topics[id]) delete topics[id];
  else topics[id] = { at: Date.now(), stage: 0, due: addDays(todayKey(), 1) };
  set({ topics });
  save("state/progress", () => ({ topics: state.topics }));
}

function gradeTopic(id: string, ok: boolean) {
  const p = state.topics[id];
  if (!p || state.readOnly) return;
  const stage = ok ? Math.min((p.stage || 0) + 1, 3) : 0;
  set({ topics: { ...state.topics, [id]: { ...p, stage, due: addDays(todayKey(), GAPS[stage]), last: todayKey() } } });
  save("state/progress", () => ({ topics: state.topics }));
}

export const setBriefIdx = (i: number) => set({ briefIdx: Math.max(0, Math.min(state.briefs.length - 1, i)) });
export function setLevel(level: "zero" | "some") {
  set({ level });
  try {
    localStorage.setItem("rozjezd-level", level);
  } catch {
    /* bez úložiště se volba jen nepamatuje */
  }
}

const ERR: Record<string, string> = {
  not_granted: "Lektor tu nemá povoleno ptát se Clauda. Povol to v oprávněních artifactu a načti stránku znovu.",
  sampling_disabled: "Claude není pro tenhle účet dostupný.",
  not_declared: "Lektor na téhle stránce není zapnutý.",
  capability_disabled: "Lektor v tomhle zobrazení nefunguje. Otevři stránku v Claude.",
  capability_removed: "Lektor v tomhle zobrazení nefunguje. Otevři stránku v Claude.",
  rate_limited: "Teď je to moc dotazů najednou. Zkus to za chvíli.",
  session_expired: "Přihlášení vypršelo. Přihlas se znovu do Claude.",
  refused: "Na tohle Claude neodpoví. Zkus zadání přeformulovat.",
  prompt_too_large: "Konverzace je moc dlouhá. Začni novou lekci.",
  empty_completion: "Odpověď nepřišla. Zkus se zeptat jednodušeji.",
  invalid_json: "Tohle se nepodařilo připravit. Zkus to znovu.",
};
const errText = (e: unknown) => ERR[(e as SampleError)?.code ?? ""] ?? "Spojení vypadlo. Zkus to znovu.";

const feedbackDigest = () => {
  const all = Object.values(state.feedback)
    .filter((f) => f.rating || f.note)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 12);
  if (!all.length) return "";
  const kinds: Record<string, string> = { news: "novinka", lesson: "lekce", challenge: "výzva týdne", library: "odkaz v knihovně" };
  const line = (f: Feedback) =>
    "- " + (kinds[f.kind] ?? f.kind) + ", " + (f.rating === "up" ? "hodí se" : f.rating === "down" ? "nehodí se" : "bez hodnocení") + ": " + f.title.slice(0, 90) + (f.note ? " (jeho slovy: " + f.note.slice(0, 200) + ")" : "");
  return "\nCo sám řekl k novinkám, lekcím, výzvám a odkazům, ber to jako vodítko, co ho zajímá a jak mu vysvětlovat:\n" + all.map(line).join("\n") + "\n";
};

export async function saveFeedback(fb: Feedback) {
  const db = await dbP;
  if (!db || state.readOnly) return false;
  const { id, ...rest } = fb;
  const next = { ...rest, updatedAt: Date.now() };
  set({ feedback: { ...state.feedback, [id]: { id, ...next } } });
  try {
    await db.collection("feedback").doc(id).set(next);
    return true;
  } catch {
    toast("Připomínku se nepodařilo uložit.");
    return false;
  }
}

const rules = () =>
  "Jsi osobní lektor AI. Učíš česky jednoho člověka a tykáš mu.\n\n" +
  "Koho učíš: " +
  state.profile +
  "\n" +
  feedbackDigest() +
  "Úroveň pro tuhle lekci: " +
  (state.level === "some"
    ? "základ má, přeskoč úplné začátky a jdi víc do hloubky."
    : "začíná od nuly, nepředpokládej žádné technické znalosti.") +
  "\n\nPravidla:\n" +
  "- Piš jednoduše. Každý odborný pojem při prvním použití jednou větou vysvětli.\n" +
  "- Použij jedno přirovnání z marketingu nebo ze stavby a developmentu.\n" +
  "- Buď konkrétní k nástrojům, které používá.\n" +
  "- Nevymýšlej si novinky, verze ani funkce nástrojů. Když si aktuálním stavem nejsi jistý, řekni to.\n" +
  "- Nepoužívej tabulky. Formát je Markdown s nadpisy ##.\n\n" +
  "První odpověď je lekce do 350 slov s touhle osnovou: ## V kostce (dvě věty), ## Jak to funguje, ## Příklad z tvé práce, ## Zkus si to na 10 minut (číslované kroky), ## Jak poznáš, že to umíš (jedna kontrolní otázka).\n" +
  "Na doplňující otázky odpovídej krátce a k věci, bez osnovy.";

let lessonId = 0;
let ctl: AbortController | null = null;
let streamRaf = 0;
const patchLesson = (patch: Partial<Lesson>) => {
  if (state.lesson) set({ lesson: { ...state.lesson, ...patch } });
};
const blankLesson = (title: string, topicId: string | null, turns: Turn[]): Lesson => ({
  title,
  topicId,
  noteId: null,
  savedLen: 0,
  turns,
  busy: false,
  stream: "",
  error: null,
  quiz: null,
});

export async function runLesson() {
  const L = state.lesson;
  if (!L || L.busy) return;
  const id = lessonId;
  const sample = await sampleP;
  if (id !== lessonId) return;
  if (!sample) {
    set({ tutorOff: true });
    patchLesson({ error: "Lektor odpovídá, jen když je stránka otevřená v Claude." });
    return;
  }
  ctl = new AbortController();
  patchLesson({ busy: true, error: null, stream: "" });
  const turns = state.lesson!.turns;
  try {
    const { text, truncated } = await sample(turns, {
      cache: false,
      signal: ctl.signal,
      onText: ({ text: t }) => {
        if (id !== lessonId) return;
        cancelAnimationFrame(streamRaf);
        streamRaf = requestAnimationFrame(() => {
          if (id === lessonId && state.lesson?.busy) patchLesson({ stream: t });
        });
      },
    });
    if (id !== lessonId) return;
    patchLesson({
      turns: [...turns, { role: "assistant", content: text }],
      error: truncated ? "Odpověď se nevešla celá. Zeptej se na pokračování." : null,
    });
    markDay("lesson");
  } catch (e) {
    if (id !== lessonId) return;
    const err = (e ?? {}) as SampleError;
    patchLesson({
      turns: err.text && err.code !== "refused" ? [...turns, { role: "assistant", content: err.text }] : turns,
      error: err.code === "cancelled" ? null : errText(err),
    });
    if (["not_granted", "sampling_disabled", "not_declared"].includes(err.code ?? "")) set({ tutorOff: true });
  } finally {
    cancelAnimationFrame(streamRaf);
    if (id === lessonId) patchLesson({ busy: false, stream: "" });
  }
}

export function startLesson(title: string, opts: { topicId?: string; ask?: string } = {}) {
  ctl?.abort();
  lessonId++;
  set({
    lesson: blankLesson(title, opts.topicId ?? null, [
      { role: "user", content: rules() },
      { role: "user", content: opts.ask ?? "Chci se naučit: " + title },
    ]),
  });
  if (location.hash !== "#ucit-se") location.hash = "ucit-se";
  runLesson();
}
export const startTopic = (t: Topic) =>
  startLesson(t.title, { topicId: t.id, ask: "Chci se naučit: " + t.title + " (" + t.hint + ")." });
export const stopLesson = () => ctl?.abort();

export function askFollow(text: string) {
  const L = state.lesson;
  if (!L || L.busy || !text.trim()) return;
  patchLesson({ turns: [...L.turns, { role: "user", content: text.trim() }], quiz: null });
  runLesson();
}

export function openNote(n: Note) {
  ctl?.abort();
  lessonId++;
  const turns = (Array.isArray(n.turns) ? n.turns : []).filter(
    (t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string",
  );
  const all: Turn[] = [{ role: "user", content: rules() }, ...turns];
  set({ lesson: { ...blankLesson(n.title || "Lekce", n.topicId ?? null, all), noteId: n.id, savedLen: all.length } });
}

const validQuiz = (data: unknown): QuizItem[] =>
  (Array.isArray(data) ? data : [])
    .filter(
      (it) =>
        it &&
        typeof it.q === "string" &&
        Array.isArray(it.options) &&
        it.options.length >= 2 &&
        Number.isInteger(it.correct) &&
        it.correct >= 0 &&
        it.correct < it.options.length,
    )
    .map((it) => ({ q: it.q, options: it.options.map(String), correct: it.correct, why: String(it.why || "") }));

export async function runQuiz() {
  const L = state.lesson;
  if (!L || L.quiz?.busy) return;
  const id = lessonId;
  const sample = await sampleP;
  if (!sample || id !== lessonId) return;
  patchLesson({ quiz: { busy: true, items: [], answers: {} } });
  const body = L.turns
    .filter((t, i) => i > 0 && t.role === "assistant")
    .map((t) => t.content)
    .join("\n\n")
    .slice(0, 8000);
  try {
    const data = await sample.json(
      "Vytvoř 3 kontrolní otázky v češtině k lekci níže. Ověřují pochopení, ne memorování, a jsou zasazené do praxe. Každá má 4 možnosti a právě jednu správnou. Správnou možnost dávej na různé pozice.\n\n" +
        'Odpověz pouze JSON polem objektů {"q": string, "options": [4 řetězce], "correct": číslo 0 až 3, "why": jedna věta vysvětlení}.\n\nLekce:\n' +
        body,
      { cache: false },
    );
    const items = validQuiz(data);
    if (!items.length) throw { code: "invalid_json" };
    if (id === lessonId) patchLesson({ quiz: { busy: false, items, answers: {} } });
  } catch (e) {
    if (id === lessonId) patchLesson({ quiz: { busy: false, items: [], answers: {}, error: errText(e) } });
  }
}
export function answerQuiz(i: number, j: number) {
  const q = state.lesson?.quiz;
  if (q && q.answers[i] == null) patchLesson({ quiz: { ...q, answers: { ...q.answers, [i]: j } } });
}

export async function saveNote() {
  const L = state.lesson;
  if (!L) return;
  const db = await dbP;
  if (!db) return toast("Uložit jde jen v Claude.");
  const id = L.noteId ?? "n" + Date.now().toString(36);
  const existing = state.notes.find((n) => n.id === id);
  try {
    await db
      .collection("notes")
      .doc(id)
      .set({
        title: L.title,
        topicId: L.topicId,
        turns: L.turns.slice(1),
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      });
    if (state.lesson && state.lesson.title === L.title) patchLesson({ noteId: id, savedLen: L.turns.length });
    toast("Uloženo do zápisníku");
  } catch {
    toast("Uložení se nepovedlo.");
  }
}

export async function removeDoc(coll: string, id: string) {
  const db = await dbP;
  if (!db) return;
  try {
    await db.collection(coll).doc(id).delete();
    if (coll === "notes" && state.lesson?.noteId === id) patchLesson({ noteId: null, savedLen: 0 });
    toast("Smazáno");
  } catch {
    toast("Smazání se nepovedlo.");
  }
}

export async function startReview() {
  const due = dueList(state).slice(0, 5);
  if (!due.length || state.review?.busy) return;
  set({ review: { busy: true, items: [], answers: {}, right: {} } });
  const selfItems: ReviewItem[] = due.map((t) => ({ id: t.id, self: true }));
  const done = (items: ReviewItem[]) => set({ review: { busy: false, items, answers: {}, right: {} } });
  const sample = await sampleP;
  if (!sample) return done(selfItems);
  try {
    const data = await sample.json(
      "Vytvoř ke každému tématu jednu kontrolní otázku v češtině pro začátečníka, který se učí AI. Otázka ověřuje pochopení na situaci z praxe, ne definici. Každá má 4 možnosti a právě jednu správnou, správnou dávej na různé pozice.\n\nTémata:\n" +
        due.map((t) => '- id "' + t.id + '": ' + t.title + " (" + t.hint + ")").join("\n") +
        '\n\nOdpověz pouze JSON polem objektů {"id": id tématu, "q": string, "options": [4 řetězce], "correct": číslo 0 až 3, "why": jedna věta vysvětlení}.',
      { cache: false },
    );
    const seen = new Set<string>();
    const items: ReviewItem[] = [];
    (Array.isArray(data) ? data : []).forEach((raw) => {
      const [q] = validQuiz([raw]);
      const id = raw && typeof raw.id === "string" ? raw.id : "";
      if (q && TOPIC[id] && state.topics[id] && !seen.has(id)) {
        seen.add(id);
        items.push({ id, ...q });
      }
    });
    done(items.length ? items : selfItems);
  } catch {
    done(selfItems);
  }
}
export function answerReview(i: number, answer: number | boolean, ok: boolean) {
  const R = state.review;
  if (!R || R.answers[i] != null) return;
  const next: Review = { ...R, answers: { ...R.answers, [i]: answer }, right: { ...R.right, [i]: ok } };
  set({ review: next });
  gradeTopic(R.items[i].id, ok);
  if (next.items.every((_, j) => next.answers[j] != null)) markDay("review");
}
export const closeReview = () => set({ review: null });

export async function toggleLib(it: LibItem) {
  const db = await dbP;
  if (!db || state.readOnly) return;
  const { id, ...rest } = it;
  db.collection("library")
    .doc(id)
    .set({ ...rest, done: !it.done, doneAt: it.done ? null : Date.now() })
    .catch(() => toast("Uložení se nepovedlo."));
}
export async function addLib(url: string, title: string) {
  if (!url.startsWith("https://")) return toast("Odkaz musí začínat https://");
  const db = await dbP;
  if (!db || !title) return;
  try {
    await db
      .collection("library")
      .add({ url, title: title.slice(0, 200), theme: "Moje", kind: "odkaz", own: true, done: false, order: Date.now() });
    toast("Přidáno");
  } catch {
    toast("Přidání se nepovedlo.");
  }
}

export async function addSys(name: string, kind: string, status: string, note: string) {
  const db = await dbP;
  if (!db || !name) return;
  try {
    await db
      .collection("systems")
      .add({ name: name.slice(0, 120), kind, status, note: note.slice(0, 240), minutes: 0, createdAt: Date.now() });
    toast("Přidáno");
  } catch {
    toast("Přidání se nepovedlo.");
  }
}
export async function patchSys(s: SysItem, patch: Partial<SysItem>) {
  const db = await dbP;
  if (!db || state.readOnly) return;
  const { id, ...rest } = s;
  db.collection("systems")
    .doc(id)
    .set({ ...rest, ...patch, updatedAt: Date.now() })
    .catch(() => toast("Uložení se nepovedlo."));
}

export async function toggleChStep(ch: Challenge, i: number) {
  const db = await dbP;
  if (!db || state.readOnly || !ch.steps) return;
  const steps = ch.steps.map((s, j) => (j === i ? { ...s, done: !s.done } : { ...s }));
  const { id, ...rest } = ch;
  set({ challenges: state.challenges.map((c) => (c.id === id ? { ...ch, steps } : c)) });
  db.collection("challenges")
    .doc(id)
    .set({ ...rest, steps, updatedAt: Date.now() })
    .catch(() => toast("Uložení se nepovedlo."));
}
export async function proposeChallenge() {
  const [sample, db] = await Promise.all([sampleP, dbP]);
  if (!sample || !db || state.chBusy) return;
  set({ chBusy: true });
  const nt = TOPICS.filter((t) => !state.topics[t.id])
    .slice(0, 3)
    .map((t) => t.title)
    .join(", ");
  try {
    const d = (await sample.json(
      "Navrhni jednu týdenní výzvu pro člověka, který se učí AI. Je to malý praktický projekt na 1 až 2 hodiny, který může udělat hned s nástroji, které má. Nevymýšlej si funkce nástrojů.\n\nKdo to je: " +
        state.profile +
        feedbackDigest() +
        "\nCo se bude učit dál: " +
        (nt || "vlastní systémy") +
        "\nCo už má postavené: " +
        (state.systems.map((s) => s.name).join(", ") || "zatím nic") +
        '\n\nOdpověz česky, tykej, pouze JSON objektem {"title": krátký název do 60 znaků, "why": jedna věta proč zrovna tohle, "steps": pole 3 až 5 krátkých kroků jako řetězce}.',
      { cache: false },
    )) as { title?: unknown; why?: unknown; steps?: unknown };
    const steps = (Array.isArray(d?.steps) ? d.steps : [])
      .map((s) => ({ text: String(s).slice(0, 240), done: false }))
      .slice(0, 6);
    if (!d || typeof d.title !== "string" || !steps.length) throw { code: "invalid_json" };
    await db
      .collection("challenges")
      .doc(weekKey())
      .set({ week: weekKey(), title: d.title.slice(0, 120), why: String(d.why || "").slice(0, 400), steps, createdAt: Date.now() });
  } catch (e) {
    toast(errText(e));
  } finally {
    set({ chBusy: false });
  }
}

let stopAsked = false;
export async function toggleListen() {
  const t = await ttsP;
  const b = currentBrief(state);
  if (!t || !b) return;
  if (state.speaking) {
    stopAsked = true;
    t.stop().catch(() => {});
    return;
  }
  stopAsked = false;
  const lines = [
    { text: String(b.headline || "Dnešní brief").slice(0, 1900) },
    ...(b.items ?? []).map((it) => ({
      text: [it.title, it.summary, it.why && "Proč se ti to hodí: " + it.why, it.try && "Zkus si: " + it.try]
        .filter(Boolean)
        .join(". ")
        .slice(0, 1900),
    })),
  ];
  try {
    await t.speak(lines, { language: "cs" });
    if (!stopAsked) markDay("brief");
  } catch (e) {
    const err = (e ?? {}) as SampleError;
    if (err.code === "not_granted") set({ canSpeak: false });
    else if (!stopAsked && !/stop/.test(String(err.reason || err.code || "")))
      toast(err.code === "rate_limited" ? "Čtení je teď vytížené. Zkus to za chvíli." : "Čtení se nepovedlo.");
  }
}

export async function installApp() {
  const desk = await deskP;
  desk?.install?.request().catch(() => toast("Instalace se nepovedla."));
}

function drawIcon() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d");
  if (!x) return "";
  x.fillStyle = "#060609";
  x.beginPath();
  x.roundRect(0, 0, 256, 256, 56);
  x.fill();
  x.lineCap = "round";
  x.lineWidth = 18;
  const a0 = Math.PI * (5 / 6);
  const a1 = Math.PI * (13 / 6);
  x.strokeStyle = "rgba(255,255,255,.14)";
  x.beginPath();
  x.arc(128, 136, 84, a0, a1);
  x.stroke();
  const g = x.createLinearGradient(40, 220, 216, 52);
  g.addColorStop(0, "#FFB36B");
  g.addColorStop(0.6, "#FF5A2A");
  g.addColorStop(1, "#FF2E7E");
  x.strokeStyle = g;
  x.beginPath();
  x.arc(128, 136, 84, a0, a0 + (a1 - a0) * 0.7);
  x.stroke();
  return c.toDataURL("image/png");
}

const docs = <T,>(snap: QuerySnap): T[] => snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);

let started = false;
export function initStore() {
  if (started) return;
  started = true;

  userP.then(async (user) => {
    const owner = user ? await user.isOwner().catch(() => null) : null;
    if (owner === false) set({ readOnly: true });
  });
  sampleP.then((s) => {
    if (!s) set({ tutorOff: true });
  });
  ttsP.then((t) => {
    if (!t) return;
    set({ canSpeak: true });
    t.onState(({ state: s }) => set({ speaking: s !== "idle" }));
  });
  deskP.then(async (desk) => {
    if (!desk) return set({ installState: "off" });
    const icon = drawIcon();
    if (icon) desk.app?.dock?.setIcon(icon).catch(() => {});
    const st = desk.install ? await desk.install.state().catch(() => null) : null;
    set({ canInstall: st === "available", installState: st ?? "unavailable" });
  });

  dbP.then((db) => {
    if (!db) return set({ briefsLate: true, libReady: true, sysReady: true });
    const late = setTimeout(() => {
      if (!state.briefsReady) set({ briefsLate: true });
    }, 10000);
    db.collection("briefs")
      .orderBy("date", "desc")
      .limit(14)
      .onSnapshot(
        (snap) => {
          const cur = currentBrief(state);
          const briefs = docs<Brief>(snap);
          const keep = cur ? briefs.findIndex((b) => b.id === cur.id) : -1;
          const ready = !snap.metadata.fromCache || briefs.length > 0;
          if (ready) clearTimeout(late);
          set({
            briefs,
            briefIdx: keep > 0 ? keep : 0,
            briefsReady: state.briefsReady || ready,
            briefsLate: ready ? false : state.briefsLate,
          });
        },
        () => {
          clearTimeout(late);
          set({ briefsLate: true });
        },
      );
    db.doc("state/progress").onSnapshot(
      (snap: DocSnap) => {
        if (saving("state/progress")) return;
        const d = (snap.exists ? snap.data() : null) as {
          topics?: Record<string, Partial<TopicProgress>>;
          done?: Record<string, unknown>;
        } | null;
        const topics: Record<string, TopicProgress> = {};
        if (d?.topics && typeof d.topics === "object") {
          for (const [id, p] of Object.entries(d.topics))
            if (TOPIC[id] && p && typeof p === "object")
              topics[id] = {
                at: p.at || 0,
                stage: Number(p.stage) || 0,
                due: typeof p.due === "string" ? p.due : todayKey(),
                last: p.last ?? null,
              };
        } else if (d?.done && typeof d.done === "object") {
          for (const id of Object.keys(d.done)) if (TOPIC[id]) topics[id] = { at: 0, stage: 0, due: todayKey() };
        }
        set({ topics });
      },
      () => {},
    );
    db.doc("state/days").onSnapshot(
      (snap: DocSnap) => {
        if (saving("state/days")) return;
        const d = (snap.exists ? snap.data() : null) as { days?: Days } | null;
        set({ days: d?.days && typeof d.days === "object" ? { ...d.days } : {} });
      },
      () => {},
    );
    db.collection("notes")
      .orderBy("createdAt", "desc")
      .limit(60)
      .onSnapshot(
        (snap) => set({ notes: docs<Note>(snap) }),
        () => {},
      );
    db.collection("library")
      .limit(400)
      .onSnapshot(
        (snap) => set({ library: docs<LibItem>(snap), libReady: true }),
        () => {},
      );
    db.collection("systems")
      .limit(200)
      .onSnapshot(
        (snap) => set({ systems: docs<SysItem>(snap), sysReady: true }),
        () => {},
      );
    db.collection("challenges")
      .limit(60)
      .onSnapshot(
        (snap) => set({ challenges: docs<Challenge>(snap) }),
        () => {},
      );
    db.collection("feedback")
      .limit(400)
      .onSnapshot(
        (snap) => set({ feedback: Object.fromEntries(docs<Feedback>(snap).map((f) => [f.id, f])) }),
        () => {},
      );
    db.doc("state/profile")
      .get()
      .then((snap) => {
        const d = snap.exists ? snap.data() : null;
        if (d && typeof d.about === "string" && d.about.trim()) set({ profile: d.about.trim().slice(0, 2000) });
      })
      .catch(() => {});
  });
}
