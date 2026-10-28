import type { TimelineEntry } from "../types";
import type { Tl } from "../logic/timeline";
import { BY_ID as byId } from "../data/store";
import { clock, day } from "../data/timeline";
import Conf from "./Conf";

interface Props { tl: Tl; sel: string | null; onPick: (id: string, rect: DOMRect) => void; onBackground: () => void; onAdd: () => void }
const dayOf = (iso: string) => iso.slice(0, 10);

export default function Timeline({ tl, sel, onPick, onBackground, onAdd }: Props) {
  const { entries, date, lanes, base, start, span, incident } = tl;
  const m = (iso: string) => new Date(iso).getTime() / 60000 - base;
  const pct = (iso: string) => `${((m(iso) - start) / span) * 100}%`;
  const pick = (e: TimelineEntry) => (ev: React.MouseEvent<HTMLElement>) => onPick(e.id, ev.currentTarget.getBoundingClientRect());
  const rest = entries.filter((e) => !e.lane && !e.claim).sort((a, b) => a.when.localeCompare(b.when));
  const before = rest.filter((e) => !date || dayOf(e.when) < date), after = rest.filter((e) => date && dayOf(e.when) >= date);
  const hours: number[] = [];
  for (let h = start; h <= start + span; h += 60) hours.push(h);

  const list = (title: string, items: TimelineEntry[]) => (
    <div className="col"><h3>{title}</h3>
      {items.length === 0 && <div className="empty">Nothing here yet.</div>}
      {items.map((e) => (
        <button key={e.id} className={"item" + (sel === e.id ? " sel" : "")} onClick={pick(e)}>
          <i className={`dot ${e.status}`} /><span className="d">{day(e.when).slice(0, -5)}{e.when.length > 10 ? ` ${clock(e.when)}` : ""}</span><span className="tt">{e.title}</span>
          {e.flag && <i className="fl">!</i>}<Conf level={e.confidence} />
        </button>
      ))}
    </div>
  );

  return (
    <div id="tl" onClick={(e) => { if (!(e.target as HTMLElement).closest(".ev,.item,.bar,button")) onBackground(); }}>
      <div className="tlbar"><div><h2>{date ? `EVENTS ON ${day(date).toUpperCase()}` : "TIMELINE"}</h2>
        <div className="sub">Built automatically from the evidence and statements. Click a dot to open its notepad. A red "!" marks a clue that conflicts with a statement or needs a check. Dashed marks are what someone says.</div></div>
        <button className="addbtn" onClick={onAdd}>＋ Add evidence</button></div>
      {lanes.length === 0 ? <div className="empty big">Nothing with a time of day on one date yet. Add evidence (a call, a tower ping, a CCTV sighting) and it will appear here.</div> : (
        <div className="plot">
          <div className="axis">
            {hours.map((h) => <span key={h} className="tick" style={{ left: `${((h - start) / span) * 100}%` }}>{(h / 60) % 12 || 12} {(h / 60) % 24 >= 12 ? "pm" : "am"}</span>)}
          </div>
          {hours.map((h) => <i key={h} className="grid" style={{ left: `${((h - start) / span) * 100}%` }} />)}
          {incident && <div className="shade" style={{ left: `${((incident.from - start) / span) * 100}%`, width: `${((incident.until - incident.from) / span) * 100}%` }}><span>Incident window</span></div>}
          {lanes.map((id) => (
            <div className="lane" key={id}>
              <div className="lname">{id === "_" ? "Scene and general" : byId[id]?.title}<small>{id === "_" ? "" : byId[id]?.role}</small></div>
              {entries.filter((e) => e.lane === id).map((e) => e.until ? (
                <button key={e.id} className={"bar" + (e.claim ? " claim" : "") + (sel === e.id ? " sel" : "")} style={{ left: pct(e.when), width: `${((m(e.until) - m(e.when)) / span) * 100}%` }} onClick={pick(e)} title={e.title}>{e.title}</button>
              ) : (
                <button key={e.id} className={"ev" + (e.claim ? " claim" : "") + (sel === e.id ? " sel" : "")} style={{ left: pct(e.when) }} onClick={pick(e)} title={e.title}>
                  <span className={`dot ${e.status}`} />{e.flag && <i className="fl">!</i>}
                  <b>{clock(e.when)}</b><span className="t">{e.title}</span>
                </button>
              ))}
            </div>
          ))}
        </div>)}
      <div className="tlcols">{list("BEFORE", before)}{list("AFTER, AND RECORDS", after)}</div>
      <div className="legend">
        <span><i className="dot verified" /> Verified</span><span><i className="dot pending" /> Pending</span><span><i className="dot unverified" /> Unverified</span>
        <span><Conf level="high" /> Confidence in the clue</span><span><i className="fl">!</i> Conflict or check needed</span>
      </div>
    </div>
  );
}