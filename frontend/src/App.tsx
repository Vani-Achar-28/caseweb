import { useState } from "react";
import Dashboard from "./components/Dashboard";
import NewCaseForm from "./components/NewCaseForm";
import Workspace from "./Workspace";
import { createCase, deleteCase, loadCases, nextNumber } from "./data/cases";
import type { CaseInfo, NewCase } from "./data/cases";
import { openCase } from "./data/store";

/** The app opens on the dashboard. Opening a case loads that case's own data into the board, timeline, map, checks and tasks. */
export default function App() {
  const [cases, setCases] = useState<CaseInfo[]>(() => loadCases());
  const [active, setActive] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [creating, setCreating] = useState(false);
  const info = cases.find((c) => c.id === active);

  const open = (c: CaseInfo) => {
    openCase(c.id, c.sample);
    try { if (c.state) localStorage.setItem("caseweb.state", c.state); localStorage.setItem("caseweb.area", c.city || ""); } catch { /* ignore */ }
    setActive(c.id);
  };
  const create = (f: NewCase) => { const c = createCase(f, cases); setCases(loadCases()); setCreating(false); open(c); };

  if (info) {
    return <Workspace key={info.id + epoch} info={info} onHome={() => { setActive(null); setCases(loadCases()); }}
      onReset={() => { openCase(info.id, info.sample); setEpoch((e) => e + 1); }} />;
  }
  return (<>
    <Dashboard cases={cases} onOpen={(id) => open(cases.find((c) => c.id === id)!)} onNew={() => setCreating(true)}
      onDelete={(id) => { deleteCase(id); setCases(loadCases()); }} />
    {creating && <NewCaseForm number={nextNumber(cases)} onSave={create} onClose={() => setCreating(false)} />}
  </>);
}