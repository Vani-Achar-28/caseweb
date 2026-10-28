import { useState } from "react";
import { BY_ID as byId } from "../data/store";
import { FACTS, FACT_KINDS, STATEMENTS } from "../data/statements";
import { runChecks, strengthOf, verdictOf } from "../logic/checks";
import type { Finding, Verdict } from "../logic/checks";
import { clock, day } from "../data/timeline";
import type { Task } from "../types";

const VT: Record<Verdict, string> = { contradicts: "CONTRADICTED", gap: "NEEDS A CHECK", supports: "SUPPORTED", unchecked: "NOT CHECKED" };
const nm = (id: string) => byId[id]?.title ?? "Unknown person";

interface Props {
  tasks: Task[]; onAddTask: (t: Omit<Task, "id">) => void; onOpenEvidence: (entry: string) => void;
  onAddStatement: () => void; onEditStatement: (id: string) => void; onDeleteStatement: (id: string) => void;
  onAddFact: () => void; onEditFact: (id: string) => void; onDeleteFact: (id: string) => void;
}
type CardProps = Pick<Props, "tasks" | "onAddTask" | "onOpenEvidence">;

function FindingCard({ f, tasks, onAddTask, onOpenEvidence }: { f: Finding } & CardProps) {
  const added = tasks.some((t) => t.from === f.id);
  return (
    <div className={`fc ${f.kind}`}>
      <div className="fh"><span className={`vb ${f.kind}`}>{VT[f.kind]}</span><span className="rule">{f.rule}</span><span className={`sb ${f.strength}`}>{f.strength} evidence</span></div>
      <h4>{f.title}</h4>
      <ul>{f.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
      {f.evidence.length > 0 && <div className="chips">{f.evidence.map((e, i) => (
        <button key={i} className="chip2" onClick={() => onOpenEvidence(e.entry)} title="Open this evidence on the timeline">↗ {e.label} <i className={`sb ${e.strength}`}>{e.strength}</i></button>))}</div>}
      {f.kind !== "supports" && <button className="addt" disabled={added}
        onClick={() => onAddTask({ title: `Check: ${f.title}`, kind: "task", status: "todo", priority: f.kind === "contradicts" ? "high" : "medium", owner: "", due: "", from: f.id })}>
        {added ? "Added to Tasks" : "＋ Add to tasks"}</button>}
    </div>
  );
}

export default function Checks(props: Props) {
  const findings = runChecks();
  const verdicts = Object.fromEntries(STATEMENTS.map((s) => [s.id, verdictOf(findings.filter((f) => f.statement === s.id))]));
  const [sel, setSel] = useState<string>("");
  const st = STATEMENTS.find((s) => s.id === sel) ?? STATEMENTS.find((s) => verdicts[s.id] === "contradicts") ?? STATEMENTS[0];
  const loose = findings.filter((f) => !f.statement);
  const count = (v: Verdict) => STATEMENTS.filter((s) => verdicts[s.id] === v).length;
  const facts = [...FACTS].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div id="ck">
      <div className="tlbar"><div><h2>STATEMENTS VS EVIDENCE</h2>
        <div className="sub">The rules compare what people said with the phone records, CCTV and posts. They show where the two disagree. They do not say who is lying. The investigator decides what a conflict means.</div></div>
        <div className="btns"><button className="addbtn" onClick={props.onAddStatement}>＋ Add statement</button><button className="addbtn" onClick={props.onAddFact}>＋ Add evidence</button></div></div>
      <div className="tally">
        <span className="vb contradicts">{count("contradicts")} contradicted</span><span className="vb gap">{count("gap")} need a check</span>
        <span className="vb supports">{count("supports")} supported</span><span className="vb gap">{loose.length} with no statement</span>
      </div>
      {!st ? <div className="empty big">No statements yet. Click "Add statement" to record what a person said.</div> : (
        <div className="ckcols">
          <div className="slist">
            {STATEMENTS.map((s) => (
              <button key={s.id} className={"sc" + (s.id === st.id ? " sel" : "")} onClick={() => setSel(s.id)}>
                <div className="sh"><b>{nm(s.person)}</b><span className={`vb ${verdicts[s.id]}`}>{VT[verdicts[s.id]]}</span></div>
                <div className="sq">"{s.said}"</div>
              </button>))}
          </div>
          <div className="sdetail">
            <div className="quote"><div className="who">{nm(st.person)} · {st.source} · {st.date}</div>
              <p>"{st.said}"</p><div className="who">Statement reliability: {st.confidence} confidence, grade {st.grade}</div>
              <div className="qbtns"><button onClick={() => props.onEditStatement(st.id)}>Edit</button><button onClick={() => props.onDeleteStatement(st.id)}>Delete</button></div></div>
            {findings.filter((f) => f.statement === st.id).map((f) => <FindingCard key={f.id} f={f} {...props} />)}
            {st.claims.length === 0 && <div className="empty">This statement has no claims yet, so there is nothing to check. Edit it and add what the person claims.</div>}
          </div>
        </div>)}
      {loose.length > 0 && <><h3 className="ckh">PEOPLE WITH EVIDENCE BUT NO STATEMENT</h3>
        <div className="loose">{loose.map((f) => <FindingCard key={f.id} f={f} {...props} />)}</div></>}
      <h3 className="ckh">EVIDENCE ON RECORD ({facts.length})</h3>
      <div className="evwrap"><table className="evt"><thead><tr><th>When</th><th>Kind</th><th>Person</th><th>What</th><th>Strength</th><th /></tr></thead><tbody>
        {facts.map((f) => (
          <tr key={f.id}><td>{day(f.time).slice(0, -5)}{f.time.length > 10 ? ` ${clock(f.time)}` : ""}</td><td>{FACT_KINDS[f.kind]}</td><td>{f.person ? nm(f.person) : "-"}</td><td>{f.title}</td>
            <td><span className={`sb ${strengthOf(f.confidence, f.grade)}`}>{strengthOf(f.confidence, f.grade)}</span></td>
            <td className="ra"><button onClick={() => props.onOpenEvidence(f.id)}>Open</button><button onClick={() => props.onEditFact(f.id)}>Edit</button><button onClick={() => props.onDeleteFact(f.id)}>Delete</button></td></tr>))}
      </tbody></table></div>
    </div>
  );
}