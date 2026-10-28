import { useState } from "react";
import type { NewCase } from "../data/cases";
import { STATES } from "../data/states";

const TYPES = ["Murder", "Missing person", "Theft or robbery", "Fraud", "Assault", "Other"];
interface Props { number: string; onSave: (c: NewCase) => void; onClose: () => void }

export default function NewCaseForm({ number, onSave, onClose }: Props) {
  const [f, setF] = useState<NewCase>({ number, title: "", type: "Murder", city: "", state: "Karnataka", opened: new Date().toISOString().slice(0, 10),
    lead: "", priority: "medium", status: "open", description: "", template: "blank" });
  const [err, setErr] = useState("");
  const set = <K extends keyof NewCase>(k: K, v: NewCase[K]) => setF((o) => ({ ...o, [k]: v }));
  const save = () => {
    if (!f.title.trim()) { setErr("Give the case a title."); return; }
    onSave({ ...f, title: f.title.trim(), number: f.number.trim() || number, city: f.city.trim(), lead: f.lead.trim(), description: f.description.trim() });
  };
  return (
    <div id="cf" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cfbox">
        <h2>NEW CASE</h2>
        <label>Case title<input autoFocus value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Missing person, Jayanagar" /></label>
        <div className="cf3">
          <label>Case number<input value={f.number} onChange={(e) => set("number", e.target.value)} /></label>
          <label>Type<select value={f.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label>Date opened<input type="date" value={f.opened} onChange={(e) => set("opened", e.target.value)} /></label>
        </div>
        <div className="cfrow">
          <label style={{ flex: 1 }}>City or area<input value={f.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Bengaluru" /></label>
          <label style={{ flex: 1 }}>State<select value={f.state} onChange={(e) => set("state", e.target.value)}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
        <div className="cf3">
          <label>Lead officer<input value={f.lead} onChange={(e) => set("lead", e.target.value)} placeholder="Name" /></label>
          <label>Priority<select value={f.priority} onChange={(e) => set("priority", e.target.value as NewCase["priority"])}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
          <label>Status<select value={f.status} onChange={(e) => set("status", e.target.value as NewCase["status"])}><option value="open">Open</option><option value="review">Under review</option><option value="closed">Closed</option></select></label>
        </div>
        <label>Short description<textarea value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="What happened, in two or three lines" /></label>
        <label>Start with<select value={f.template} onChange={(e) => set("template", e.target.value as NewCase["template"])}>
          <option value="blank">An empty case</option><option value="sample">A copy of the sample case (to practise)</option></select></label>
        {err && <div className="cferr">{err}</div>}
        <div className="cfrow cfend"><button type="button" className="save" onClick={save}>Create and open</button><button type="button" onClick={onClose}>Cancel</button></div>
      </div>
    </div>
  );
}