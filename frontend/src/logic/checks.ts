import { NODES } from "../data/caseData";
import { FACTS, SCENE, STATEMENTS } from "../data/statements";
import type { Claim, Fact } from "../data/statements";
import { clock } from "../data/timeline";
import type { Confidence, Grade } from "../types";

export type Strength = "strong" | "moderate" | "weak";
export type Kind = "contradicts" | "supports" | "gap";
export type Verdict = Kind | "unchecked";
export interface Evidence { label: string; entry: string; strength: Strength }
export interface Finding {
  id: string; rule: string; kind: Kind; statement?: string; person: string;
  title: string; why: string[]; strength: Strength; evidence: Evidence[];
}

/* ---------- small helpers ---------- */
const name = (id: string) => NODES.find((n) => n.id === id)?.title ?? "an unknown person";
const mins = (iso: string) => new Date(iso).getTime() / 60000;
type Pt = { lat: number; lng: number };
const km = (a: Pt, b: Pt) => {
  const r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
const hasLoc = (f: Fact) => f.lat !== undefined && f.lng !== undefined;
const dist = (f: Fact, p: Pt) => km({ lat: f.lat!, lng: f.lng! }, p);

const ORDER: Strength[] = ["weak", "moderate", "strong"];
const CS: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
const GS: Record<Grade, number> = { A: 3, B: 2, C: 1 };
export const strengthOf = (c: Confidence, g: Grade): Strength => { const s = CS[c] + GS[g]; return s >= 5 ? "strong" : s >= 4 ? "moderate" : "weak"; };
const minS = (a: Strength, b: Strength) => ORDER[Math.min(ORDER.indexOf(a), ORDER.indexOf(b))];
const maxS = (l: Strength[]) => l.reduce((a, b) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a), "weak" as Strength);
const fs = (f: Fact) => strengthOf(f.confidence, f.grade);
const ev = (f: Fact): Evidence => ({ label: `${f.time.length > 10 ? clock(f.time) + ": " : ""}${f.title}`, entry: f.id, strength: fs(f) });

/** Evidence about this person, inside the time they gave, that is more than 2 km from the place they gave. */
export const alibiFar = (person: string, c: Extract<Claim, { type: "alibi" }>): Fact[] =>
  FACTS.filter((f) => f.person === person && hasLoc(f) && mins(f.time) >= mins(c.from) && mins(f.time) <= mins(c.to) && dist(f, c) > 2);
export const km2 = (f: Fact, c: Pt) => dist(f, c);

/* ---------- the rules ---------- */
export function runChecks(): Finding[] {
  const out: Finding[] = [];

  STATEMENTS.forEach((s) => {
    const sst = strengthOf(s.confidence, s.grade);
    s.claims.forEach((c, i) => {
      const id = `${s.id}-${i}`;
      const base = { id, statement: s.id, person: s.person };

      /* Rule 1, location: "I was at X" against phone, CCTV and posts */
      if (c.type === "alibi") {
        const inWin = FACTS.filter((f) => f.person === s.person && hasLoc(f) && mins(f.time) >= mins(c.from) && mins(f.time) <= mins(c.to));
        const far = inWin.filter((f) => dist(f, c) > 2);
        if (far.length) {
          const st = maxS(far.map(fs));
          out.push({ ...base, rule: "Location", kind: "contradicts", strength: st, evidence: far.map(ev),
            title: `${name(s.person)} says "${c.place}", but the evidence puts them elsewhere`,
            why: [...far.map((f) => `${f.title}${f.time.length > 10 ? " at " + clock(f.time) : ""}, about ${dist(f, c).toFixed(1)} km from ${c.place}.`),
              ...(st === "weak" ? ["All of this evidence is weak. Confirm it before relying on it."] : [])] });
        } else if (inWin.length) {
          out.push({ ...base, rule: "Location", kind: "supports", strength: maxS(inWin.map(fs)), evidence: inWin.map(ev),
            title: `Evidence fits ${name(s.person)}'s account of being ${c.place}`, why: inWin.map((f) => `${f.title} at ${clock(f.time)} is near ${c.place}.`) });
        } else {
          out.push({ ...base, rule: "Location", kind: "gap", strength: "weak", evidence: [],
            title: `Nothing yet confirms where ${name(s.person)} was`, why: ["No phone, CCTV or post places this person during the time they gave."] });
        }
      }

      /* Rule 2, claimed call: a call the person mentions must be in the phone records */
      if (c.type === "call") {
        const f = FACTS.find((x) => x.kind === "call" && x.person === s.person && x.with === c.with && Math.abs(mins(x.time) - mins(c.at)) <= 15);
        out.push(f
          ? { ...base, rule: "Claimed call", kind: "supports", strength: minS(fs(f), sst), evidence: [ev(f)],
              title: `The call ${name(s.person)} mentions is in the phone records`, why: [`${f.title} at ${clock(f.time)} matches the statement.`] }
          : { ...base, rule: "Claimed call", kind: "gap", strength: "weak", evidence: [],
              title: `No record of the call ${name(s.person)} mentions`, why: ["The phone records do not show this call. Check the number and the time."] });
      }

      /* Rule 3, a witness names someone: is that person's phone near the scene? */
      if (c.type === "names") {
        const near = FACTS.filter((f) => f.person === c.person && hasLoc(f) && Math.abs(mins(f.time) - mins(c.at)) <= 45 && dist(f, SCENE) < 1.5);
        out.push(near.length
          ? { ...base, rule: "Witness", kind: "supports", strength: minS(maxS(near.map(fs)), sst), evidence: near.map(ev),
              title: `${name(c.person)}'s phone was near the scene when ${name(s.person)} heard or saw them`,
              why: [...near.map((f) => `${f.title} at ${clock(f.time)}.`), "Recognising a voice through a wall is unreliable, so treat this as a pointer only."] }
          : { ...base, rule: "Witness", kind: "gap", strength: "weak", evidence: [],
              title: `Nothing yet places ${name(c.person)} near the scene`, why: ["The witness names this person, but no phone or CCTV data backs it up."] });
      }

      /* Rule 4, a statement about someone else's movement needs an independent record */
      if (c.type === "departure") {
        const own = FACTS.filter((f) => f.person === c.person && hasLoc(f) && Math.abs(mins(f.time) - mins(c.at)) <= 20);
        out.push(own.length
          ? { ...base, rule: "Movement", kind: "supports", strength: maxS(own.map(fs)), evidence: own.map(ev), title: `A record backs up this account of ${name(c.person)}'s movement`, why: own.map((f) => f.title) }
          : { ...base, rule: "Movement", kind: "gap", strength: "weak", evidence: [],
              title: `Only this statement says when ${name(c.person)} left`,
              why: [`No independent record yet. Location data from ${name(c.person)}'s phone would confirm or break it.`] });
      }
    });

    /* Rule 5, missing mention: calls in the phone records that the statement never mentions */
    const missed = FACTS.filter((f) => f.kind === "call" && f.person === s.person && f.with).filter((f) => {
      const other = name(f.with!).split(" ")[0].toLowerCase();
      return !s.claims.some((c) => c.type === "call" && c.with === f.with) && !s.said.toLowerCase().includes(other);
    });
    if (missed.length) {
      out.push({ id: `${s.id}-calls`, rule: "Missing mention", kind: "gap", statement: s.id, person: s.person, strength: maxS(missed.map(fs)), evidence: missed.map(ev),
        title: `${name(s.person)} did not mention ${missed.length} phone call${missed.length > 1 ? "s" : ""}`,
        why: missed.map((f) => `${clock(f.time)}: call with ${name(f.with!)} is in the phone records but not in the statement.`) });
    }
  });

  /* Rule 6, no statement: evidence puts someone at the scene, but nobody has recorded their account */
  const stated = new Set(STATEMENTS.map((s) => s.person));
  [...new Set(FACTS.map((f) => f.person))].forEach((p) => {
    if (!p || stated.has(p) || NODES.find((n) => n.id === p)?.role === "VICTIM") return;
    const near = FACTS.filter((f) => f.person === p && hasLoc(f) && dist(f, SCENE) < 1.5);
    if (near.length) {
      out.push({ id: `nostmt-${p}`, rule: "No statement", kind: "gap", person: p, strength: maxS(near.map(fs)), evidence: near.map(ev),
        title: `${name(p)} has evidence at the scene but no statement`,
        why: [...near.map((f) => `${f.title}${f.time.length > 10 ? " at " + clock(f.time) : ""}.`), "Take a statement and ask where they were that evening."] });
    }
  });
  return out;
}

export const verdictOf = (list: Finding[]): Verdict =>
  list.some((f) => f.kind === "contradicts") ? "contradicts" : list.some((f) => f.kind === "gap") ? "gap"
    : list.some((f) => f.kind === "supports") ? "supports" : "unchecked";

/** A short warning for every piece of evidence that appears in a contradiction or a gap. Shown as a red "!" on the timeline. */
export const flagsOf = (list: Finding[]) => {
  const m = new Map<string, string>();
  list.forEach((f) => f.evidence.forEach((e) => {
    if (f.kind === "contradicts") m.set(e.entry, "Contradicts a statement");
    else if (f.kind === "gap" && !m.has(e.entry)) m.set(e.entry, f.rule === "Missing mention" ? "Not mentioned in the statement" : "Needs a check");
  }));
  return m;
};