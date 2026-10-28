import { FACTS, STATEMENTS } from "./statements";
import { NODES } from "./caseData";
import { SEED_TASKS } from "./tasks";
import { getKey, openCase } from "./store";
import { runChecks } from "../logic/checks";
import type { Task } from "../types";

export interface CaseInfo {
  id: string; number: string; title: string; type: string; city: string; state: string; opened: string; lead: string;
  priority: "high" | "medium" | "low"; status: "open" | "review" | "closed"; description: string; sample: boolean; updated: string;
}
export type NewCase = Omit<CaseInfo, "id" | "updated" | "sample"> & { template: "blank" | "sample" };

const LKEY = "caseweb.cases";
export const saveCases = (l: CaseInfo[]) => { try { localStorage.setItem(LKEY, JSON.stringify(l)); } catch { /* ignore */ } };

/** The list of cases. The first time, it creates the sample case and moves any older single-case data into it. */
export function loadCases(): CaseInfo[] {
  try { const s = JSON.parse(localStorage.getItem(LKEY) || "null"); if (Array.isArray(s)) return s; } catch { /* ignore */ }
  const c: CaseInfo = { id: "case-001", number: "CASE-001", title: "Murder of Ravi Shetty, Indiranagar", type: "Murder", city: "Bengaluru", state: "Karnataka",
    opened: "2026-03-15", lead: "Insp. Rao", priority: "high", status: "open", sample: true, updated: new Date().toISOString(),
    description: "Sample case with made-up data. A shop owner was found stabbed. Three people have motives and none of their stories fully match the evidence." };
  ["data", "records", "pos", "pins", "tasks"].forEach((k) => {
    try { const v = localStorage.getItem("caseweb." + k); if (v !== null) localStorage.setItem(`caseweb.c.${c.id}.${k}`, v); } catch { /* ignore */ }
  });
  saveCases([c]);
  return [c];
}

export function createCase(f: NewCase, list: CaseInfo[]): CaseInfo {
  const { template, ...rest } = f;
  const c: CaseInfo = { ...rest, id: "case-" + Date.now(), sample: template === "sample", updated: new Date().toISOString() };
  saveCases([c, ...list]);
  return c;
}
export function nextNumber(list: CaseInfo[]) {
  const n = Math.max(0, ...list.map((c) => parseInt(c.number.replace(/\D/g, ""), 10) || 0));
  return `CASE-${String(n + 1).padStart(3, "0")}`;
}
export function deleteCase(id: string) {
  saveCases(loadCases().filter((c) => c.id !== id));
  try { Object.keys(localStorage).filter((k) => k.startsWith(`caseweb.c.${id}.`)).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
}
export function touchCase(id: string) {
  const l = loadCases();
  const c = l.find((x) => x.id === id);
  if (c) { c.updated = new Date().toISOString(); saveCases(l); }
}

export interface Summary { cards: number; evidence: number; statements: number; openTasks: number; contradictions: number }
/** Counts for the dashboard cards. It loads the case briefly to count, without changing anything. */
export function summaryOf(c: CaseInfo): Summary {
  openCase(c.id, c.sample);
  let tasks: Task[] = c.sample ? SEED_TASKS : [];
  try { const t = JSON.parse(getKey("tasks") || "null"); if (Array.isArray(t)) tasks = t; } catch { /* ignore */ }
  return { cards: NODES.length, evidence: FACTS.length, statements: STATEMENTS.length, openTasks: tasks.filter((t) => t.status !== "done").length,
    contradictions: runChecks().filter((f) => f.kind === "contradicts").length };
}