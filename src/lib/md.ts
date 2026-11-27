const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

const inline = (s: string) =>
  s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

export function md(src: string): string {
  const out: string[] = [];
  let list: string | null = null;
  let para: string[] = [];
  let code: string[] | null = null;
  const flushP = () => {
    if (para.length) {
      out.push("<p>" + inline(para.join(" ")) + "</p>");
      para = [];
    }
  };
  const flushL = () => {
    if (list) {
      out.push("</" + list + ">");
      list = null;
    }
  };
  const item = (type: string, text: string) => {
    flushP();
    if (list !== type) {
      flushL();
      out.push("<" + type + ">");
      list = type;
    }
    out.push("<li>" + inline(text) + "</li>");
  };
  for (const raw of esc(src).split("\n")) {
    if (code !== null) {
      if (/^\s*```/.test(raw)) {
        out.push("<pre><code>" + code.join("\n") + "</code></pre>");
        code = null;
      } else code.push(raw);
      continue;
    }
    if (/^\s*```/.test(raw)) {
      flushP();
      flushL();
      code = [];
      continue;
    }
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) {
      flushP();
      continue;
    }
    if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
      flushP();
      flushL();
      const lv = Math.min(4, m[1].length + 1);
      out.push("<h" + lv + ">" + inline(m[2]) + "</h" + lv + ">");
      continue;
    }
    if ((m = line.match(/^[-*•]\s+(.*)$/))) {
      item("ul", m[1]);
      continue;
    }
    if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      item("ol", m[1]);
      continue;
    }
    flushL();
    para.push(line);
  }
  if (code !== null) out.push("<pre><code>" + code.join("\n") + "</code></pre>");
  flushP();
  flushL();
  return out.join("");
}
