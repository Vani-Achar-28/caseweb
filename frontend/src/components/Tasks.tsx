import { useState } from "react";
import type { Task } from "../types";

const COLS: { key: Task["status"]; name: string }[] = [{ key: "todo", name: "TO DO" }, { key: "doing", name: "IN PROGRESS" }, { key: "done", name: "DONE" }];
const ORDER: Task["status"][] = ["todo", "doing", "done"];

interface Props { tasks: Task[]; setTasks: (f: (t: Task[]) => Task[]) => void }

export default function Tasks({ tasks, setTasks }: Props) {
  const [title, setTitle] = useState(""), [kind, setKind] = useState<Task["kind"]>("task"), [priority, setPriority] = useState<Task["priority"]>("medium");
  const [owner, setOwner] = useState(""), [due, setDue] = useState("");
  const add = () => {
    if (!title.trim()) return;
    setTasks((t) => [...t, { id: "K" + Date.now(), title: title.trim(), kind, status: "todo", priority, owner: owner.trim(), due }]);
    setTitle(""); setOwner(""); setDue("");
  };
  const move = (id: string, d: number) => setTasks((t) => t.map((x) => (x.id === id ? { ...x, status: ORDER[Math.max(0, Math.min(2, ORDER.indexOf(x.status) + d))] } : x)));
  const open = tasks.filter((t) => t.status !== "done");

  return (
    <div id="tk">
      <h2>TASKS AND OPEN QUESTIONS</h2>
      <div className="sub">{open.filter((t) => t.kind === "task").length} tasks and {open.filter((t) => t.kind === "question").length} open questions still to do.</div>
      <div className="tkform">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a task or an open question..." />
        <select value={kind} onChange={(e) => setKind(e.target.value as Task["kind"])}><option value="task">Task</option><option value="question">Open question</option></select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as Task["priority"])}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner" style={{ maxWidth: 130 }} />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <button onClick={add}>Add</button>
      </div>
      <div className="kan">
        {COLS.map((c) => (
          <div className="kcol" key={c.key}><h3>{c.name} <span>{tasks.filter((t) => t.status === c.key).length}</span></h3>
            {tasks.filter((t) => t.status === c.key).map((t) => (
              <div className={`tcard ${t.kind}`} key={t.id}>
                <div className="tt"><i className={`pr ${t.priority}`} title={`${t.priority} priority`} />{t.kind === "question" && <b className="qm">?</b>}{t.title}</div>
                <div className="tm">{t.owner || "No owner"}{t.due ? ` · due ${t.due}` : ""}{t.from ? " · from Checks" : ""}</div>
                <div className="ta"><button disabled={t.status === "todo"} onClick={() => move(t.id, -1)}>◀</button>
                  <button disabled={t.status === "done"} onClick={() => move(t.id, 1)}>▶</button>
                  <button title="Delete" onClick={() => setTasks((l) => l.filter((x) => x.id !== t.id))}>✕</button></div>
              </div>))}
          </div>))}
      </div>
    </div>
  );
}