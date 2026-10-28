import { useRef, useState } from "react";
import type { LinkData, NodeData } from "../types";
import Conf from "./Conf";
import { CONF_TXT, GRADE_TXT, LINKS, STATUS_TXT, TYPE_LABEL } from "../data/caseData";
import { BY_ID as byId } from "../data/store";

interface Props {
  node: NodeData; at: { x: number; y: number }; extra: [string, string][]; notes: string;
  onMove: (x: number, y: number) => void; onClose: () => void; onGo: (id: string) => void;
  onAdd: (label: string, value: string) => void; onNotes: (t: string) => void;
  onEdit?: () => void; onUnlink?: (l: LinkData) => void;
}

export default function Notepad({ node, at, extra, notes, onMove, onClose, onGo, onAdd, onNotes, onEdit, onUnlink }: Props) {
  const [label, setLabel] = useState(""), [value, setValue] = useState("");
  const grab = useRef<{ dx: number; dy: number } | null>(null);
  const conn = LINKS.filter((l) => (l[0] === node.id || l[1] === node.id) && byId[l[0]] && byId[l[1]]);
  const submit = () => { if (label.trim() && value.trim()) { onAdd(label.trim(), value.trim()); setLabel(""); setValue(""); } };
  const img = node.photo ?? node.thumb;

  return (
    <div id="pad" className="open" style={{ left: at.x, top: at.y }}>
      <div id="padh"
        onPointerDown={(e) => { if ((e.target as HTMLElement).id === "padx") return; grab.current = { dx: e.clientX - at.x, dy: e.clientY - at.y }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (grab.current) onMove(e.clientX - grab.current.dx, e.clientY - grab.current.dy); }}
        onPointerUp={() => { grab.current = null; }}>
        <h2><small>{TYPE_LABEL[node.type]}</small>{node.title}</h2>
        {onEdit && <button id="padedit" title="Edit this card" onClick={onEdit}>Edit</button>}
        <button id="padx" title="Close" onClick={onClose}>×</button>
      </div>
      <div id="padb">
        {img && <img className="padimg" src={img} alt="" />}
        {node.status && <div className="row"><span>Verified status</span><span><i className={`badge ${node.status}`}>{STATUS_TXT[node.status]}</i></span></div>}
        {node.confidence && <div className="row"><span>Confidence</span><span><Conf level={node.confidence} /> {CONF_TXT[node.confidence]}</span></div>}
        {node.grade && <div className="row"><span>Source grade</span><span>{GRADE_TXT[node.grade]}</span></div>}
        {node.photoMeta && <div className="row"><span>Photo fingerprint</span><span>{node.photoMeta.hash ? node.photoMeta.hash.slice(0, 16) + "..." : "n/a"}</span></div>}
        {node.photoMeta && <div className="row"><span>Photo added</span><span>{new Date(node.photoMeta.at).toLocaleString()}</span></div>}
        {[...node.rows, ...extra].map((r, i) => <div className="row" key={i}><span>{r[0]}</span><span>{r[1]}</span></div>)}
        <h3>CONNECTED TO</h3>
        {conn.length === 0 && <div>No threads yet.</div>}
        {conn.map((l, i) => {
          const o = l[0] === node.id ? l[1] : l[0];
          return <div key={i}><button className="go" onClick={() => onGo(o)}>{byId[o].title}</button> ({l[2]}{l[3] ? ", unconfirmed" : ""})
            {onEdit && onUnlink && <button className="unl" title="Remove this thread" onClick={() => onUnlink(l)}>✕</button>}</div>;
        })}
        <h3>ADD A DETAIL</h3>
        <div className="add">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label" />
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="value" onKeyDown={(e) => e.key === "Enter" && submit()} />
          <button className="btn" onClick={submit}>Add</button>
        </div>
        <h3>MY NOTES</h3>
        <textarea value={notes} onChange={(e) => onNotes(e.target.value)} placeholder="Write your own notes here..." />
      </div>
    </div>
  );
}