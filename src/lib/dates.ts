const pad = (n: number) => String(n).padStart(2, "0");
export const keyOf = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const todayKey = () => keyOf(new Date());
export const parseKey = (k: unknown): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(k ?? ""));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
export const addDays = (k: string, n: number) => {
  const d = parseKey(k) ?? new Date();
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
export const daysTo = (k: string) => {
  const a = parseKey(todayKey())!;
  const b = parseKey(k);
  return b ? Math.round((b.getTime() - a.getTime()) / 864e5) : 0;
};
export const longDate = (d: Date) => d.toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
export const shortDate = (k: unknown) => {
  const d = parseKey(k);
  return d ? d.getDate() + ". " + (d.getMonth() + 1) + "." : "";
};
export const weekKey = () => {
  const d = new Date();
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return t.getUTCFullYear() + "-W" + pad(Math.ceil(((t.getTime() - y0.getTime()) / 864e5 + 1) / 7));
};
export const plural = (n: number, one: string, few: string, many: string) =>
  n + " " + (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
