import { useEffect, useState } from "react";
import { saveFeedback, useStore } from "../lib/store";
import type { Feedback } from "../types";

interface Props {
  id: string;
  kind: string;
  title: string;
  tag?: string;
  label?: string;
  up?: string;
  down?: string;
  placeholder?: string;
}

export const fbId = (prefix: string, text: string) =>
  prefix +
  "-" +
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export function FeedbackBox({
  id,
  kind,
  title,
  tag,
  label = "Řekni Claudovi, jestli tohle chceš",
  up = "Tohle se mi hodí",
  down = "Tohle není pro mě",
  placeholder = "Připomínka pro Clauda. Třeba: přesně tohle potřebuju, nebo: tohle je mimo, protože…",
}: Props) {
  const s = useStore();
  const saved = s.feedback[id];
  const [note, setNote] = useState(saved?.note ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setNote(saved?.note ?? "");
  }, [id, saved?.note]);
  if (s.readOnly) return null;
  const base: Feedback = { id, kind, title, tag, rating: saved?.rating ?? null, note: saved?.note ?? "" };
  const rate = (r: "up" | "down") => saveFeedback({ ...base, note: note.trim(), rating: saved?.rating === r ? null : r });
  const dirty = note.trim() !== (saved?.note ?? "");
  const send = async () => {
    setBusy(true);
    await saveFeedback({ ...base, note: note.trim() });
    setBusy(false);
  };
  return (
    <div className="fb">
      <div className="fb-row">
        <span className="fb-label">{label}</span>
        <button type="button" className="chip" aria-pressed={saved?.rating === "up"} onClick={() => rate("up")}>
          {up}
        </button>
        <button type="button" className="chip" aria-pressed={saved?.rating === "down"} onClick={() => rate("down")}>
          {down}
        </button>
      </div>
      <div className="fb-row">
        <textarea
          className="field"
          rows={2}
          id={"fb-" + id}
          aria-label="Připomínka pro Clauda"
          placeholder={placeholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button type="button" className="btn ghost sm" disabled={!dirty || busy} onClick={send}>
          {dirty ? "Uložit připomínku" : saved?.note ? "Uloženo" : "Uložit připomínku"}
        </button>
      </div>
      {(saved?.rating || saved?.note) && <p className="fb-note">Claude si to přečte, až bude chystat další brief, a lektor to bere v úvahu hned.</p>}
    </div>
  );
}
