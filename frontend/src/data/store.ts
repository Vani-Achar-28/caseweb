import { LINKS, NODES } from "./caseData";
import { FACTS, STATEMENTS } from "./statements";
import type { Fact, Statement } from "./statements";
import type { LinkData, NodeData } from "../types";

/** Live lookup of every card in the open case by id. */
export const BY_ID: Record<string, NodeData> = {};
const reindex = () => { Object.keys(BY_ID).forEach((k) => delete BY_ID[k]); NODES.forEach((n) => { BY_ID[n.id] = n; }); };

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
/** The built-in sample case, copied before anything else touches it. */
const SEED = { nodes: clone(NODES), links: clone(LINKS), statements: clone(STATEMENTS), facts: clone(FACTS) };

/* ---- every case keeps its own data under its own key prefix ---- */
let current = "";
const K = (k: string) => `caseweb.c.${current}.${k}`;
export const getKey = (k: string) => { try { return localStorage.getItem(K(k)); } catch { return null; } };
export const setKey = (k: string, v: string) => { try { localStorage.setItem(K(k), v); return true; } catch { return false; } };
const fill = <T,>(arr: T[], items: T[]) => { arr.splice(0, arr.length, ...items); };
const read = (k: string) => { try { return JSON.parse(getKey(k) || "null"); } catch { return null; } };

/** Loads one case into the app: its saved data, or the sample / an empty case the first time. */
export function openCase(id: string, sample: boolean) {
  current = id;
  const d = read("data"), r = read("records");
  const ok = d && Array.isArray(d.nodes) && Array.isArray(d.links), rok = r && Array.isArray(r.statements) && Array.isArray(r.facts);
  fill(NODES, ok ? d.nodes : sample ? clone(SEED.nodes) : []);
  fill(LINKS, ok ? d.links : sample ? clone(SEED.links) : []);
  fill(STATEMENTS, rok ? r.statements : sample ? clone(SEED.statements) : []);
  fill(FACTS, rok ? r.facts : sample ? clone(SEED.facts) : []);
  reindex();
}

/** Saves the open case's cards and threads. Returns false if the browser storage is full. */
export const save = () => setKey("data", JSON.stringify({ nodes: NODES, links: LINKS }));
export const saveRecords = () => setKey("records", JSON.stringify({ statements: STATEMENTS, facts: FACTS }));
/** Forgets everything saved for the open case (it goes back to its starting point). */
export const resetCaseData = () => { ["data", "records", "pos", "pins", "tasks"].forEach((k) => { try { localStorage.removeItem(K(k)); } catch { /* ignore */ } }); };

/** Cards you create get ids like C1730000000000. The built-in sample cards cannot be deleted. */
export const isMine = (id: string) => /^C\d{10,}$/.test(id);

export const addNode = (n: NodeData) => { NODES.push(n); reindex(); return save(); };
export const updateNode = (n: NodeData) => {
  const o = BY_ID[n.id];
  if (!o) return false;
  Object.keys(o).forEach((k) => delete (o as unknown as Record<string, unknown>)[k]);
  Object.assign(o, n);
  return save();
};
export const removeNode = (id: string) => {
  const i = NODES.findIndex((n) => n.id === id);
  if (i >= 0) NODES.splice(i, 1);
  for (let j = LINKS.length - 1; j >= 0; j--) if (LINKS[j][0] === id || LINKS[j][1] === id) LINKS.splice(j, 1);
  reindex();
  /* Remove the statements and evidence that were about this person, and any mention of them. */
  for (let i2 = FACTS.length - 1; i2 >= 0; i2--) {
    const f = FACTS[i2];
    if (f.person === id) FACTS.splice(i2, 1);
    else { if (f.with === id) delete f.with; if (f.ref === id) delete f.ref; }
  }
  for (let i3 = STATEMENTS.length - 1; i3 >= 0; i3--) {
    const st = STATEMENTS[i3];
    if (st.person === id) STATEMENTS.splice(i3, 1);
    else st.claims = st.claims.filter((c) => !((c.type === "call" && c.with === id) || (c.type === "names" && c.person === id) || (c.type === "departure" && c.person === id)));
  }
  return save() && saveRecords();
};
export const addLink = (l: LinkData) => { LINKS.push(l); return save(); };
export const removeLink = (l: LinkData) => { const i = LINKS.indexOf(l); if (i >= 0) LINKS.splice(i, 1); return save(); };

export const addFact = (f: Fact) => { FACTS.push(f); return saveRecords(); };
export const updateFact = (f: Fact) => { const i = FACTS.findIndex((x) => x.id === f.id); if (i < 0) return false; FACTS[i] = f; return saveRecords(); };
export const removeFact = (id: string) => { const i = FACTS.findIndex((x) => x.id === id); if (i >= 0) FACTS.splice(i, 1); return saveRecords(); };
export const addStatement = (s: Statement) => { STATEMENTS.push(s); return saveRecords(); };
export const updateStatement = (s: Statement) => { const i = STATEMENTS.findIndex((x) => x.id === s.id); if (i < 0) return false; STATEMENTS[i] = s; return saveRecords(); };
export const removeStatement = (id: string) => { const i = STATEMENTS.findIndex((x) => x.id === id); if (i >= 0) STATEMENTS.splice(i, 1); return saveRecords(); };