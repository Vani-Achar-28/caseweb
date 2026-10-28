import { useEffect, useMemo, useRef, useState } from "react";
import type { NodeData, Pos, Task, TimelineEntry } from "./types";
import { LINKS, NODES, TABS } from "./data/caseData";
import { BY_ID as byId, addFact, addLink, addNode, addStatement, isMine, removeFact, removeLink, removeNode, removeStatement, resetCaseData, getKey, setKey, updateFact, updateNode, updateStatement } from "./data/store";
import { FACTS, STATEMENTS } from "./data/statements";
import type { Fact, Statement } from "./data/statements";
import { runChecks, flagsOf } from "./logic/checks";
import { buildTimeline } from "./logic/timeline";
import { FactForm, StatementForm } from "./components/RecordForms";
import CardForm from "./components/CardForm";
import Board from "./components/Board";
import Notepad from "./components/Notepad";
import Timeline from "./components/Timeline";
import Checks from "./components/Checks";
import Tasks from "./components/Tasks";
import { SEED_TASKS } from "./data/tasks";
import MapView from "./components/MapView";
import { MAP_PINS } from "./data/mapData";
import type { MapPin } from "./data/mapData";
import { day, whenText } from "./data/timeline";
import { touchCase } from "./data/cases";
import type { CaseInfo } from "./data/cases";

type View = "board" | "timeline" | "map" | "checks" | "tasks";
const VIEWS: [View, string][] = [["board", "BOARD"], ["timeline", "TIMELINE"], ["map", "MAP"], ["checks", "CHECKS"], ["tasks", "TASKS"]];
const home = (): Pos => Object.fromEntries(NODES.map((n) => [n.id, { x: n.x, y: n.y }]));

interface WProps { info: CaseInfo; onHome: () => void; onReset: () => void }

export default function Workspace({ info, onHome, onReset }: WProps) {
  const [rev, setRev] = useState(0);
  const bump = () => setRev((r) => r + 1);
  const [pos, setPos] = useState<Pos>(() => {
    try {
      const s = JSON.parse(getKey("pos") || "{}");
      return { ...home(), ...Object.fromEntries(Object.entries(s).filter(([k]) => byId[k])) } as Pos;
    } catch { return home(); }
  });
  useEffect(() => {
    const t = setTimeout(() => { setKey("pos", JSON.stringify(pos)); }, 300);
    return () => clearTimeout(t);
  }, [pos]);
  const [form, setForm] = useState<{ id?: string } | null>(null);
  const [sform, setSform] = useState<{ id?: string } | null>(null);
  const [fform, setFform] = useState<{ id?: string } | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [draftLink, setDraftLink] = useState<{ a: string; b: string } | null>(null);
  const [lbl, setLbl] = useState("");
  const [unconf, setUnconf] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [tab, setTab] = useState("CASE");
  const [q, setQ] = useState("");
  const [padAt, setPadAt] = useState({ x: 0, y: 0 });
  const [extras, setExtras] = useState<Record<string, [string, string][]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [view, setView] = useState<View>("board");
  const [entry, setEntry] = useState<string | null>(null);
  const [weak, setWeak] = useState(false);
  const [custom, setCustom] = useState<MapPin[]>(() => {
    try { return JSON.parse(getKey("pins") || "[]"); } catch { return []; }
  });
  useEffect(() => { setKey("pins", JSON.stringify(custom)); }, [custom]);

  const [tasks, setTasks] = useState<Task[]>(() => {
    try { const s = getKey("tasks"); return s ? JSON.parse(s) : info.sample ? SEED_TASKS : []; } catch { return info.sample ? SEED_TASKS : []; }
  });
  useEffect(() => { setKey("tasks", JSON.stringify(tasks)); }, [tasks]);
  /* remember when the case was last changed, for the dashboard */
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } touchCase(info.id); }, [rev, custom, tasks]);
  const addTask = (t: Omit<Task, "id">) => setTasks((l) => [...l, { ...t, id: "K" + Date.now() }]);
  /** From the Checks screen: jump to the evidence on the timeline and open its notepad. */
  const showEvidence = (id: string) => { setPadAt({ x: Math.max(10, innerWidth - 380), y: 140 }); setSel(null); setEntry(id); setView("timeline"); };

  const place = (rect?: DOMRect) => {
    if (rect && !sel && !entry) {
      let x = rect.right + 18;
      if (x + 340 > innerWidth - 10) x = rect.left - 340 - 18;
      setPadAt({ x: Math.max(10, x), y: Math.max(60, Math.min(rect.top - 20, innerHeight - 420)) });
    }
  };
  const open = (id: string, rect?: DOMRect) => {
    if (linkMode) {
      if (!linkFrom) setLinkFrom(id);
      else if (id !== linkFrom) { setDraftLink({ a: linkFrom, b: id }); setLinkMode(false); setLinkFrom(null); setLbl(""); setUnconf(false); }
      return;
    }
    place(rect); setSel(id);
  };
  const warn = (ok: boolean) => { if (!ok) alert("The browser storage is full. Remove a photo or a card."); };
  const saveCard = (n: NodeData) => {
    if (byId[n.id]) warn(updateNode(n));
    else { warn(addNode(n)); setPos((p) => ({ ...p, [n.id]: { x: n.x, y: n.y } })); }
    setForm(null); bump();
  };
  const deleteCard = (id: string) => {
    if (!confirm("Delete this card, its threads, and the statements and evidence entered for this person?")) return;
    warn(removeNode(id)); setForm(null); closeAll(); bump();
  };
  const saveThread = () => {
    if (!draftLink) return;
    warn(addLink([draftLink.a, draftLink.b, lbl.trim() || "linked", unconf ? 1 : 0])); setDraftLink(null); bump();
  };
  const cancelAll = () => { setLinkMode(false); setLinkFrom(null); setDraftLink(null); setForm(null); setSform(null); setFform(null); };
  const saveFact = (f: Fact) => { warn(FACTS.some((x) => x.id === f.id) ? updateFact(f) : addFact(f)); setFform(null); bump(); };
  const delFact = (id: string) => { if (!confirm("Delete this evidence entry?")) return; warn(removeFact(id)); setFform(null); closeAll(); bump(); };
  const saveStatement = (s: Statement) => { warn(STATEMENTS.some((x) => x.id === s.id) ? updateStatement(s) : addStatement(s)); setSform(null); bump(); };
  const delStatement = (id: string) => { if (!confirm("Delete this statement?")) return; warn(removeStatement(id)); setSform(null); closeAll(); bump(); };
  const openEntry = (id: string, rect: DOMRect) => { place(rect); setEntry(id); };
  const closeAll = () => { setSel(null); setEntry(null); };
  const goBoard = (id: string) => { setEntry(null); setView("board"); setSel(id); };
  const switchView = (v: View) => { closeAll(); setView(v); };
  /** A timeline dot opens a notepad built from the entry, plus the linked card's own details. */
  const entryNode = (e: TimelineEntry): NodeData => {
    const base = e.ref ? byId[e.ref] : undefined;
    const rows: [string, string][] = [["When", whenText(e)], ["What happened", e.detail], ["Source", e.source]];
    if (e.flag) rows.push(["Flag", e.flag]);
    if (base) rows.push(["Linked card", base.title], ...base.rows);
    return { id: e.ref ?? e.id, type: "event", x: 0, y: 0, r: 0, w: 0, h: 0, title: e.title, status: e.status, confidence: e.confidence, grade: e.grade, rows };
  };
  /** A map pin opens a notepad built from the pin, plus the linked card's own details. */
  const pinNode = (p: MapPin): NodeData => {
    const base = p.ref ? byId[p.ref] : undefined;
    const rows: [string, string][] = [...p.rows, ["Coordinates", `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`], ["Location data", p.custom ? "Entered by the investigator" : "Sample, not a real location"]];
    if (base) rows.push(["Linked card", base.title], ...base.rows);
    return { id: p.ref ?? p.id, type: "location", x: 0, y: 0, r: 0, w: 0, h: 0, title: p.title, status: p.status, confidence: p.confidence, grade: p.grade, rows };
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { closeAll(); cancelAll(); } };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);

  const { lit, hot } = useMemo(() => {
    const id = hover ?? sel;
    const hot = new Set<number>();
    if (!id) return { lit: null, hot };
    const lit = new Set([id]);
    LINKS.forEach((l, i) => { if (l[0] === id || l[1] === id) { hot.add(i); lit.add(l[0]); lit.add(l[1]); } });
    return { lit, hot };
  }, [hover, sel, rev]);

  const { hidden, shown } = useMemo(() => {
    const types = TABS[tab], s = q.toLowerCase(), hidden = new Set<string>();
    NODES.forEach((n) => {
      const hay = (n.title + " " + n.rows.map((r) => r.join(" ")).join(" ")).toLowerCase();
      const isWeak = n.status === "unverified" || n.confidence === "low";
      if ((types && !types.includes(n.type)) || (s && !hay.includes(s)) || (weak && !isWeak)) hidden.add(n.id);
    });
    return { hidden, shown: NODES.length - hidden.size };
  }, [tab, q, weak, rev]);

  const findings = useMemo(() => runChecks(), [rev]);
  const tl = useMemo(() => buildTimeline(flagsOf(findings)), [rev]);
  const ent = entry ? tl.entries.find((e) => e.id === entry) : undefined;
  const pin = entry ? [...MAP_PINS, ...custom].find((p) => p.id === entry) : undefined;
  const node = view === "timeline" ? (ent ? entryNode(ent) : null) : view === "map" ? (pin ? pinNode(pin) : ent ? entryNode(ent) : null) : sel ? byId[sel] : null;
  /** Which form the Edit button in the notepad opens, if any. */
  const editFor = (): (() => void) | undefined => {
    if (view === "board" && node) return () => setForm({ id: node.id });
    if ((view === "timeline" || (view === "map" && !pin)) && entry) {
      if (FACTS.some((f) => f.id === entry)) return () => setFform({ id: entry });
      const sid = entry.split("-")[0];
      if (STATEMENTS.some((s) => s.id === sid)) return () => setSform({ id: sid });
    }
    return undefined;
  };
  return (<>
    {view === "board" && <Board pos={pos} setPos={setPos} lit={lit} hot={hot} hidden={hidden} sel={linkMode ? linkFrom : sel}
      onHover={setHover} onOpen={open} onBackground={closeAll} />}
    {view === "map" && <MapView sample={info.sample} custom={custom} rev={rev} onPick={openEntry} onBackground={closeAll}
      onAdd={(p) => setCustom((c) => [...c, p])} onRemove={(id) => { setCustom((c) => c.filter((p) => p.id !== id)); closeAll(); }} />}
    {view === "checks" && <Checks tasks={tasks} onAddTask={addTask} onOpenEvidence={showEvidence}
      onAddStatement={() => setSform({})} onEditStatement={(id) => setSform({ id })} onDeleteStatement={delStatement}
      onAddFact={() => setFform({})} onEditFact={(id) => setFform({ id })} onDeleteFact={delFact} />}
    {view === "tasks" && <Tasks tasks={tasks} setTasks={setTasks} />}
    {view === "timeline" && <Timeline tl={tl} sel={entry} onPick={openEntry} onBackground={closeAll} onAdd={() => setFform({})} />}
    <div id="top"><button id="home" onClick={onHome} title="Back to all cases">← All cases</button><span className="brand">CASEWEB</span><span className="chip">{info.number}</span>
      <span className="chip">{info.title}</span>{info.sample && <span className="chip" style={{ color: "#e8a43a" }}>SYNTHETIC DATA</span>}
      <div id="views">{VIEWS.map(([v, label]) => <button key={v} className={view === v ? "on" : ""} onClick={() => switchView(v)}>{label}</button>)}</div></div>
    {view === "board" && NODES.length === 0 && <div className="emptyboard">This case is empty.<br />Click <b>＋ Add card</b> (bottom right) to add the first person or piece of evidence.</div>}
    {view === "board" && <>
    <div id="term"><h6>Archive Terminal</h6>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="search name, alias, tag..." />
      <label><input type="checkbox" checked={weak} onChange={(e) => setWeak(e.target.checked)} />Show only weak clues (unverified or low confidence)</label>
      <div>{shown} of {NODES.length} items · {LINKS.length} threads</div></div>
    <div id="casefile"><b>CASE FILE</b>Opened {info.opened ? day(info.opened) : "-"}<br />Lead: {info.lead || "not set"}<br />Status: {info.status}<br /><br />Drag cards. Click any card to open its notepad.<br /><button className="lnk" onClick={() => { if (confirm("Delete everything you added to this case and go back to its starting point?")) { resetCaseData(); onReset(); } }}>Reset this case</button></div>
    <div id="tabs">{Object.keys(TABS).map((t) => <button key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}</div>
    <button id="reset" onClick={() => setPos(home())}>Reset board</button>
    <div id="tools"><button onClick={() => { cancelAll(); setForm({}); }}>＋ Add card</button>
      <button className={linkMode ? "on" : ""} onClick={() => { closeAll(); setDraftLink(null); setLinkFrom(null); setLinkMode(!linkMode); }}>⛓ Add thread</button></div>
    </>}
    {node && <Notepad node={node} at={padAt} extra={extras[node.id] ?? []} notes={notes[node.id] ?? ""}
      onMove={(x, y) => setPadAt({ x, y })} onClose={closeAll} onGo={(id) => (view !== "board" ? goBoard(id) : open(id))}
      onEdit={editFor()} onUnlink={view === "board" ? (l) => { removeLink(l); bump(); } : undefined}
      onAdd={(l, v) => setExtras((o) => ({ ...o, [node.id]: [...(o[node.id] ?? []), [l, v]] }))}
      onNotes={(t) => setNotes((o) => ({ ...o, [node.id]: t }))} />}
    {form && <CardForm key={form.id ?? "new"} initial={form.id ? byId[form.id] : undefined} canDelete={!!form.id && isMine(form.id)}
      onSave={saveCard} onDelete={() => deleteCard(form.id!)} onClose={() => setForm(null)} />}
    {fform && <FactForm key={fform.id ?? "new"} initial={fform.id ? FACTS.find((f) => f.id === fform.id) : undefined}
      onSave={saveFact} onDelete={() => delFact(fform.id!)} onClose={() => setFform(null)} />}
    {sform && <StatementForm key={sform.id ?? "new"} initial={sform.id ? STATEMENTS.find((s) => s.id === sform.id) : undefined}
      onSave={saveStatement} onDelete={() => delStatement(sform.id!)} onClose={() => setSform(null)} />}
    {linkMode && <div id="hint">{linkFrom ? `From "${byId[linkFrom].title}". Now click the card to connect it to.` : "Click the first card of the thread."} Esc to cancel.</div>}
    {draftLink && <div id="thread"><b>NEW THREAD</b>
      <div className="tl2">{byId[draftLink.a].title} ↔ {byId[draftLink.b].title}</div>
      <input value={lbl} onChange={(e) => setLbl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveThread()} placeholder="What connects them? e.g. called at 9:10 pm" autoFocus />
      <label><input type="checkbox" checked={unconf} onChange={(e) => setUnconf(e.target.checked)} />Not confirmed yet (dashed thread)</label>
      <div className="cfrow"><button className="save" onClick={saveThread}>Save thread</button><button onClick={() => setDraftLink(null)}>Cancel</button></div></div>}
  </>);
}