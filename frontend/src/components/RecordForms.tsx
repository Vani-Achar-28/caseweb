import { useState } from "react";
import type { Confidence, Grade, Status } from "../types";
import { NODES } from "../data/caseData";
import { FACT_KINDS } from "../data/statements";
import type { Claim, Fact, FactKind, Statement } from "../data/statements";
import { searchPlaces } from "../lib/geocode";
import type { Hit } from "../lib/geocode";

const people = () => NODES.filter((n) => n.type === "person");

function PersonSelect({ value, onChange, none }: { value: string; onChange: (v: string) => void; none?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {none && <option value="">{none}</option>}
      {people().map((p) => <option key={p.id} value={p.id}>{p.title}{p.role ? ` (${p.role.toLowerCase()})` : ""}</option>)}
    </select>
  );
}

/** Search for a real place, or type the coordinates. */
function PlacePicker({ lat, lng, onPick, onChange }: { lat: string; lng: string; onPick: (name: string, lat: number, lng: number) => void; onChange: (lat: string, lng: string) => void }) {
  const [q, setQ] = useState(""), [hits, setHits] = useState<Hit[]>([]), [msg, setMsg] = useState("");
  const go = async () => {
    if (!q.trim()) return;
    setMsg("Searching..."); setHits([]);
    try { const h = await searchPlaces(q); setHits(h); setMsg(h.length ? "" : "Nothing found. Try another spelling, or type the coordinates."); }
    catch { setMsg("Search failed. Check your internet."); }
  };
  return (
    <div className="pp">
      <div className="cfrow">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); go(); } }} placeholder="Search a real place (uses the state chosen on the Map tab)" />
        <button type="button" onClick={go}>Search</button>
      </div>
      {msg && <div className="fp">{msg}</div>}
      {hits.map((h, i) => <button type="button" key={i} className="hitb" onClick={() => { onPick(h.name.split(",")[0], h.lat, h.lng); setHits([]); setQ(""); }}>{h.name}</button>)}
      <div className="cfrow">
        <input value={lat} onChange={(e) => onChange(e.target.value, lng)} placeholder="Latitude" />
        <input value={lng} onChange={(e) => onChange(lat, e.target.value)} placeholder="Longitude" />
      </div>
    </div>
  );
}

const RATINGS = (s: Status | null, c: Confidence, g: Grade, set: { s?: (v: Status) => void; c: (v: Confidence) => void; g: (v: Grade) => void }) => (
  <div className="cf3">
    {s !== null && set.s && <label>Verified status<select value={s} onChange={(e) => set.s!(e.target.value as Status)}><option value="verified">Verified</option><option value="pending">Pending</option><option value="unverified">Unverified</option></select></label>}
    <label>Confidence<select value={c} onChange={(e) => set.c(e.target.value as Confidence)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
    <label>Source grade<select value={g} onChange={(e) => set.g(e.target.value as Grade)}><option value="A">A reliable</option><option value="B">B usually reliable</option><option value="C">C unproven</option></select></label>
  </div>
);

/* ============================ STATEMENT FORM ============================ */
type CType = Claim["type"];
interface CD { type: CType; place: string; lat: string; lng: string; from: string; to: string; who: string; at: string }
const CLABEL: Record<CType, string> = { alibi: "says they were at a place", call: "says they had a phone call with", names: "says they saw or heard someone at the scene", departure: "says someone left or moved" };
const blankC = (type: CType = "alibi"): CD => ({ type, place: "", lat: "", lng: "", from: "", to: "", who: people()[0]?.id ?? "", at: "" });
const toCD = (c: Claim): CD => {
  const b = blankC(c.type);
  if (c.type === "alibi") return { ...b, place: c.place, lat: String(c.lat), lng: String(c.lng), from: c.from, to: c.to };
  if (c.type === "call") return { ...b, who: c.with, at: c.at };
  return { ...b, who: c.person, at: c.at };
};
const fromCD = (d: CD, n: number): Claim | string => {
  if (d.type === "alibi") {
    const lat = parseFloat(d.lat), lng = parseFloat(d.lng);
    if (!d.place.trim() || isNaN(lat) || isNaN(lng) || !d.from || !d.to) return `Claim ${n}: add the place name, its location, and both times.`;
    return { type: "alibi", place: d.place.trim(), lat, lng, from: d.from, to: d.to };
  }
  if (!d.who || !d.at) return `Claim ${n}: choose a person and a time.`;
  if (d.type === "call") return { type: "call", with: d.who, at: d.at };
  return { type: d.type, person: d.who, at: d.at };
};

interface SProps { initial?: Statement; onSave: (s: Statement) => void; onDelete?: () => void; onClose: () => void }
export function StatementForm({ initial, onSave, onDelete, onClose }: SProps) {
  const [person, setPerson] = useState(initial?.person ?? people()[0]?.id ?? "");
  const [said, setSaid] = useState(initial?.said ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [confidence, setConfidence] = useState<Confidence>(initial?.confidence ?? "medium");
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? "B");
  const [claims, setClaims] = useState<CD[]>(initial ? initial.claims.map(toCD) : []);
  const [err, setErr] = useState("");
  const setC = (i: number, p: Partial<CD>) => setClaims((l) => l.map((c, k) => (k === i ? { ...c, ...p } : c)));

  const save = () => {
    if (!person) { setErr("Add a person card on the board first."); return; }
    if (!said.trim()) { setErr("Write what the person said."); return; }
    const out: Claim[] = [];
    for (let i = 0; i < claims.length; i++) { const r = fromCD(claims[i], i + 1); if (typeof r === "string") { setErr(r); return; } out.push(r); }
    onSave({ id: initial?.id ?? "S" + Date.now(), person, said: said.trim(), source: source.trim() || "Statement", date: date.trim() || "Undated", confidence, grade, claims: out });
  };

  return (
    <div id="cf" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cfbox">
        <h2>{initial ? "EDIT STATEMENT" : "ADD A STATEMENT"}</h2>
        <label>Who said it<PersonSelect value={person} onChange={setPerson} /></label>
        <label>What they said<textarea value={said} onChange={(e) => setSaid(e.target.value)} placeholder="Write it as they said it..." /></label>
        <div className="cfrow"><label style={{ flex: 1 }}>Source<input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Statement to SI Prakash" /></label>
          <label style={{ flex: 1 }}>Date taken<input value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. 16 Mar 2026" /></label></div>
        {RATINGS(null, confidence, grade, { c: setConfidence, g: setGrade })}
        <div className="phh">WHAT THEY CLAIM (the checks compare these with the evidence)</div>
        {claims.map((c, i) => (
          <div className="claim" key={i}>
            <div className="cfrow">
              <select value={c.type} onChange={(e) => setC(i, { type: e.target.value as CType })}>{(Object.keys(CLABEL) as CType[]).map((t) => <option key={t} value={t}>{CLABEL[t]}</option>)}</select>
              <button type="button" title="Remove" onClick={() => setClaims((l) => l.filter((_, k) => k !== i))}>✕</button>
            </div>
            {c.type === "alibi" ? (<>
              <input value={c.place} onChange={(e) => setC(i, { place: e.target.value })} placeholder="Place name, e.g. home in Koramangala" />
              <PlacePicker lat={c.lat} lng={c.lng} onPick={(n, la, ln) => setC(i, { place: c.place || n, lat: String(la), lng: String(ln) })} onChange={(la, ln) => setC(i, { lat: la, lng: ln })} />
              <div className="cfrow"><label style={{ flex: 1 }}>From<input type="datetime-local" value={c.from} onChange={(e) => setC(i, { from: e.target.value })} /></label>
                <label style={{ flex: 1 }}>To<input type="datetime-local" value={c.to} onChange={(e) => setC(i, { to: e.target.value })} /></label></div>
            </>) : (
              <div className="cfrow"><div style={{ flex: 1 }}><PersonSelect value={c.who} onChange={(v) => setC(i, { who: v })} /></div>
                <input type="datetime-local" value={c.at} onChange={(e) => setC(i, { at: e.target.value })} style={{ flex: 1 }} /></div>
            )}
          </div>))}
        <button type="button" className="lnk2" onClick={() => setClaims((l) => [...l, blankC()])}>＋ Add a claim</button>
        {err && <div className="cferr">{err}</div>}
        <div className="cfrow cfend">
          <button type="button" className="save" onClick={save}>Save statement</button><button type="button" onClick={onClose}>Cancel</button>
          {initial && onDelete && <button type="button" className="del" onClick={onDelete}>Delete</button>}
        </div>
      </div>
    </div>
  );
}

/* ============================== EVIDENCE FORM ============================== */
interface FProps { initial?: Fact; onSave: (f: Fact) => void; onDelete?: () => void; onClose: () => void }
export function FactForm({ initial, onSave, onDelete, onClose }: FProps) {
  const [kind, setKind] = useState<FactKind>(initial?.kind ?? "call");
  const [person, setPerson] = useState(initial?.person ?? people()[0]?.id ?? "");
  const [withP, setWithP] = useState(initial?.with ?? people()[1]?.id ?? people()[0]?.id ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [until, setUntil] = useState(initial?.until ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [status, setStatus] = useState<Status>(initial?.status ?? "pending");
  const [confidence, setConfidence] = useState<Confidence>(initial?.confidence ?? "medium");
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? "B");
  const [lat, setLat] = useState(initial?.lat !== undefined ? String(initial.lat) : "");
  const [lng, setLng] = useState(initial?.lng !== undefined ? String(initial.lng) : "");
  const [ref, setRef] = useState(initial?.ref ?? "");
  const [err, setErr] = useState("");

  const dateOnly = kind === "record";
  const changeKind = (k: FactKind) => {
    setKind(k);
    if (k === "record") setTime((t) => t.slice(0, 10));
    else setTime((t) => (t.length === 10 ? t + "T12:00" : t));
  };
  const save = () => {
    if (!title.trim()) { setErr("Give this evidence a short title."); return; }
    if (!time) { setErr("Choose when it happened."); return; }
    if (kind === "call" && (!withP || withP === person)) { setErr("Choose the other person on the call."); return; }
    const la = parseFloat(lat), ln = parseFloat(lng);
    const hasPlace = lat.trim() !== "" || lng.trim() !== "";
    if (hasPlace && (isNaN(la) || isNaN(ln))) { setErr("Latitude and longitude must both be numbers, or leave both empty."); return; }
    onSave({
      id: initial?.id ?? "F" + Date.now(), kind, person, with: kind === "call" ? withP : undefined,
      time, until: kind === "incident" && until ? until : undefined, lat: hasPlace ? la : undefined, lng: hasPlace ? ln : undefined,
      title: title.trim(), detail: detail.trim() || "No details yet.", source: source.trim() || "Not stated", status, confidence, grade, ref: ref || undefined,
    });
  };

  return (
    <div id="cf" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cfbox">
        <h2>{initial ? "EDIT EVIDENCE" : "ADD EVIDENCE"}</h2>
        <label>What kind<select value={kind} onChange={(e) => changeKind(e.target.value as FactKind)}>{(Object.keys(FACT_KINDS) as FactKind[]).map((k) => <option key={k} value={k}>{FACT_KINDS[k]}</option>)}</select></label>
        <div className="cfrow">
          <label style={{ flex: 1 }}>{kind === "call" ? "Who made the call" : "Who is it about"}<PersonSelect value={person} onChange={setPerson} none={kind === "record" || kind === "other" ? "(no one in particular)" : undefined} /></label>
          {kind === "call" && <label style={{ flex: 1 }}>Who they called<PersonSelect value={withP} onChange={setWithP} /></label>}
        </div>
        <div className="cfrow">
          <label style={{ flex: 1 }}>{kind === "incident" ? "Starts" : "When"}<input type={dateOnly ? "date" : "datetime-local"} value={time} onChange={(e) => setTime(e.target.value)} /></label>
          {kind === "incident" && <label style={{ flex: 1 }}>Ends<input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} /></label>}
        </div>
        <label>Short title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Manoj calls Deepak" /></label>
        <label>Details<textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="What does this show?" /></label>
        <label>Source<input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Phone records, CCTV CAM-03, bank statement" /></label>
        {RATINGS(status, confidence, grade, { s: setStatus, c: setConfidence, g: setGrade })}
        <div className="phh">WHERE (optional, shows on the map)</div>
        <PlacePicker lat={lat} lng={lng} onPick={(_n, la, ln) => { setLat(String(la)); setLng(String(ln)); }} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
        <label>Linked card on the board (optional)<select value={ref} onChange={(e) => setRef(e.target.value)}><option value="">(none)</option>{NODES.filter((n) => n.type !== "note").map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}</select></label>
        {err && <div className="cferr">{err}</div>}
        <div className="cfrow cfend">
          <button type="button" className="save" onClick={save}>Save evidence</button><button type="button" onClick={onClose}>Cancel</button>
          {initial && onDelete && <button type="button" className="del" onClick={onDelete}>Delete</button>}
        </div>
      </div>
    </div>
  );
}