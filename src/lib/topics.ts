export interface Topic {
  id: string;
  title: string;
  hint: string;
  stage: string;
}
export interface Stage {
  n: number;
  name: string;
  sub: string;
  topics: Topic[];
}

const RAW: [string, string, [string, string, string][]][] = [
    ['Základy', 'Jak AI funguje', [
      ['llm', 'Jak jazykový model přemýšlí', 'Tokeny, pravděpodobnost a proč si občas vymýšlí'],
      ['context', 'Kontextové okno a paměť', 'Co model vidí, co zapomíná a proč na tom stojí všechno ostatní'],
      ['models', 'Modely a kdy který použít', 'Rychlý, vyvážený, nejchytřejší: cena, rychlost, kvalita'],
      ['api', 'Co je API a API klíč', 'Jak spolu programy mluví a proč klíč nikomu neukazovat'],
      ['json', 'JSON: jak ho číst a psát', 'Formát, kterým si nástroje předávají data']]],
    ['Zadání', 'Jak s AI mluvit', [
      ['prompt', 'Anatomie dobrého zadání', 'Cíl, kontext, omezení a formát výstupu'],
      ['examples', 'Příklady a reference', 'Proč jedna ukázka vydá za deset vět popisu'],
      ['iterate', 'Iterace a zpětná vazba', 'Jak z prvního pokusu udělat dobrý výsledek'],
      ['instructions', 'Trvalé instrukce (CLAUDE.md)', 'Jak naučit Claude svůj styl jednou provždy'],
      ['verify', 'Ověřování výstupů', 'Jak poznat chybu dřív, než ji pošleš dál']]],
    ['Nástroje', 'Co Claude umí kolem sebe', [
      ['skills', 'Skills: kdy a jak je psát', 'Zabalený postup, který Claude použije sám'],
      ['mcp', 'MCP a konektory', 'Jak Claude připojit k Outlooku, SharePointu a dalším'],
      ['subagents', 'Subagenti a paralelní práce', 'Rozděl úkol a pusť víc Claudů najednou'],
      ['artifacts', 'Artifacts s daty', 'Stránky, které si pamatují a ptají se Clauda'],
      ['scheduled', 'Plánované úlohy a hooks', 'Ať věci běží samy, i když u toho nesedíš']]],
    ['Automatizace', 'Ať to běží bez tebe', [
      ['workflow', 'Spouštěč a akce', 'Jak číst a navrhnout jakékoli workflow'],
      ['webhook', 'Webhooky', 'Jak jedna aplikace dá vědět druhé, že se něco stalo'],
      ['http', 'HTTP request a dokumentace API', 'Jak napojit službu, která nemá hotový konektor'],
      ['n8n-make', 'n8n, nebo Make', 'V čem se liší a kdy sáhnout po kterém'],
      ['errors', 'Chyby, logy a opakování', 'Co dělat, když automatizace v noci spadne']]],
    ['Agenti', 'AI, která pracuje sama', [
      ['agent', 'Co je agent', 'Model, nástroje a smyčka, která běží, dokud není hotovo'],
      ['rag', 'Vlastní znalosti (RAG)', 'Jak dát AI firemní dokumenty, aniž bys ji trénoval'],
      ['evals', 'Vyhodnocování', 'Jak měřit, jestli je systém lepší, nebo jen jiný'],
      ['security', 'Bezpečnost a práva', 'Prompt injection, hesla a co agentovi nepovolit'],
      ['cost', 'Náklady a tokeny', 'Kolik co stojí a kde se dá ušetřit']]],
    ['Vlastní systémy', 'Tvůj Jarvis', [
      ['audit', 'Zmapuj svůj týden', 'Co se opakuje, co zdržuje a co předat AI'],
      ['knowledge', 'Znalostní báze', 'Jedno místo, odkud AI čerpá kontext o tvé práci'],
      ['pipeline', 'Od nápadu k systému', 'Navrhni, postav, otestuj, zdokumentuj'],
      ['maintain', 'Údržba a předání', 'Aby systém fungoval i za půl roku a pro kolegy']]],
  ];

export const STAGES: Stage[] = RAW.map(([name, sub, topics], i) => ({
  n: i + 1,
  name,
  sub,
  topics: topics.map(([id, title, hint]) => ({ id, title, hint, stage: name })),
}));
export const TOPICS: Topic[] = STAGES.flatMap((s) => s.topics);
export const TOPIC: Record<string, Topic> = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
export const GAPS = [1, 7, 30, 90];
export const STAGE_COLORS = ["#FFB36B", "#FF6A2A", "#FF2E7E", "#8B5CFF", "#3B5BFF", "#19C3A6"];
