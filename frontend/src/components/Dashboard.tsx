import { useMemo, useState } from "react";
import type { CaseInfo } from "../data/cases";
import { summaryOf } from "../data/cases";
import { day } from "../data/timeline";

interface Props { cases: CaseInfo[]; onOpen: (id: string) => void; onNew: () => void; onDelete: (id: string) => void }
const ST: Record<CaseInfo["status"], string> = { open: "OPEN", review: "UNDER REVIEW", closed: "CLOSED" };

export default function Dashboard({ cases, onOpen, onNew, onDelete }: Props) {
  const [q, setQ] = useState(""), [status, setStatus] = useState("all");
  const sums = useMemo(() => Object.fromEntries(cases.map((c) => [c.id, summaryOf(c)])), [cases]);
  const list = cases.filter((c) => (status === "all" || c.status === status) && (c.title + " " + c.number + " " + c.city + " " + c.type + " " + c.lead).toLowerCase().includes(q.toLowerCase()));
  const open = cases.filter((c) => c.status !== "closed");
  const hits = open.reduce((n, c) => n + sums[c.id].contradictions, 0), tasks = open.reduce((n, c) => n + sums[c.id].openTasks, 0);

  return (
    <div id="dash">
      <div className="dtop"><span className="brand">CASEWEB</span><span className="dsub">Investigation dashboard</span></div>
      <div className="dstats">
        <div><b>{cases.length}</b><span>cases</span></div><div><b>{open.length}</b><span>active</span></div>
        <div><b>{tasks}</b><span>open tasks</span></div><div><b className={hits ? "red" : ""}>{hits}</b><span>contradictions found</span></div>
      </div>
      <div className="dbar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cases by title, number, city, type or officer..." />
        <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="review">Under review</option><option value="closed">Closed</option></select>
        <button className="newcase" onClick={onNew}>＋ New case</button>
      </div>
      {cases.length === 0 && <div className="empty big">No cases yet. Click "New case" to start your first investigation.</div>}
      {cases.length > 0 && list.length === 0 && <div className="empty big">No case matches your search.</div>}
      <div className="dgrid">
        {list.map((c) => { const s = sums[c.id]; return (
          <div className="folder" key={c.id} onClick={() => onOpen(c.id)}>
            <div className="ftab">{c.number}</div>
            <button className="fdel" title="Delete this case" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete ${c.number} and everything saved in it? This cannot be undone.`)) onDelete(c.id); }}>✕</button>
            <h3>{c.title}</h3>
            <div className="fbadges"><span className={`pri ${c.priority}`}>{c.priority.toUpperCase()} PRIORITY</span><span className={`cst ${c.status}`}>{ST[c.status]}</span>{c.sample && <span className="smp">SAMPLE DATA</span>}</div>
            <div className="fmeta">{c.type} · {c.city}{c.state ? `, ${c.state}` : ""}<br />Opened {c.opened ? day(c.opened) : "-"} · Lead: {c.lead || "not set"}<br />Updated {new Date(c.updated).toLocaleDateString()}</div>
            {c.description && <p className="fdesc">{c.description}</p>}
            <div className="fcount"><span><b>{s.cards}</b> cards</span><span><b>{s.evidence}</b> evidence</span><span><b>{s.statements}</b> statements</span>
              <span><b>{s.openTasks}</b> tasks</span><span className={s.contradictions ? "red" : ""}><b>{s.contradictions}</b> contradictions</span></div>
          </div>); })}
      </div>
    </div>
  );
}