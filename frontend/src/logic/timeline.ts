import { NODES } from "../data/caseData";
import { FACTS, STATEMENTS } from "../data/statements";
import type { TimelineEntry } from "../types";

export interface Tl {
  entries: TimelineEntry[];        // every entry, including ones with no row on the chart (records, other days)
  date: string | null;             // the day shown on the chart, like "2026-03-14"
  lanes: string[];                 // card ids of the people shown as rows, "_" = general row
  base: number;                    // minutes at midnight of that day
  start: number; span: number;     // chart range in minutes after midnight
  incident?: { from: number; until: number };
}
const mins = (iso: string) => new Date(iso).getTime() / 60000;
const dayOf = (iso: string) => iso.slice(0, 10);
const nm = (id: string) => NODES.find((n) => n.id === id)?.title ?? "Someone";
const laneFor = (p: string) => (p && NODES.some((n) => n.id === p) ? p : "_");

/** Builds the timeline from the evidence (facts) and from what statements claim. Nothing is typed in twice. */
export function buildTimeline(flags: Map<string, string>): Tl {
  const timed = FACTS.filter((f) => f.time.length > 10);
  const inc = FACTS.find((f) => f.kind === "incident" && f.time.length > 10);
  let date: string | null = inc ? dayOf(inc.time) : null;
  if (!date && timed.length) {
    const c: Record<string, number> = {};
    timed.forEach((f) => { c[dayOf(f.time)] = (c[dayOf(f.time)] || 0) + 1; });
    date = Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
  }
  const onDay = (iso: string) => !!date && iso.length > 10 && dayOf(iso) === date;

  const entries: TimelineEntry[] = FACTS.map((f) => ({
    id: f.id, when: f.time, until: f.until, lane: onDay(f.time) ? laneFor(f.person) : undefined, title: f.title, detail: f.detail, ref: f.ref,
    status: f.status, confidence: f.confidence, grade: f.grade, source: f.source, flag: flags.get(f.id),
  }));
  STATEMENTS.forEach((s) => s.claims.forEach((c, i) => {
    const base = { id: `${s.id}-${i}`, detail: `"${s.said}"`, status: "pending" as const, confidence: s.confidence, grade: s.grade, source: `${s.source}, ${s.date}`, claim: true };
    if (c.type === "alibi") entries.push({ ...base, when: c.from, until: c.to, lane: onDay(c.from) ? laneFor(s.person) : undefined, title: `${nm(s.person)} says: ${c.place}` });
    if (c.type === "names") entries.push({ ...base, when: c.at, lane: onDay(c.at) ? laneFor(s.person) : undefined, title: `${nm(s.person)} says they saw or heard ${nm(c.person)}` });
    if (c.type === "departure") entries.push({ ...base, when: c.at, lane: onDay(c.at) ? laneFor(c.person) : undefined, title: `${nm(s.person)} says ${nm(c.person)} left or moved` });
  }));

  const laned = entries.filter((e) => e.lane);
  if (!date || !laned.length) return { entries, date, lanes: [], base: 0, start: 0, span: 240 };
  const base = mins(date + "T00:00");
  const lo = Math.min(...laned.map((e) => mins(e.when) - base)), hi = Math.max(...laned.map((e) => mins(e.until ?? e.when) - base));
  const start = Math.floor((lo - 30) / 60) * 60;
  let end = Math.ceil((hi + 30) / 60) * 60;
  if (end - start < 240) end = start + 240;
  const used = new Set(laned.map((e) => e.lane!));
  const lanes = [...NODES.map((n) => n.id).filter((id) => used.has(id)), ...(used.has("_") ? ["_"] : [])];
  return { entries, date, lanes, base, start, span: end - start, incident: inc ? { from: mins(inc.time) - base, until: mins(inc.until ?? inc.time) - base } : undefined };
}