import { useEffect, useRef, useState } from "react";
import type { PointerEvent as RPE } from "react";
import type { NodeData, Pos } from "../types";
import { LINKS, NODES } from "../data/caseData";
import { BY_ID as byId } from "../data/store";
import CardFace from "./CardFace";

const pinOf = (n: NodeData, p: Pos[string]) => ({ x: p.x, y: p.y - n.h / 2 + 6 });

interface Props {
  pos: Pos; setPos: (f: (p: Pos) => Pos) => void;
  lit: Set<string> | null; hot: Set<number>; hidden: Set<string>; sel: string | null;
  onHover: (id: string | null) => void; onOpen: (id: string, rect: DOMRect) => void; onBackground: () => void;
}
interface Drag { id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean }

export default function Board({ pos, setPos, lit, hot, hidden, sel, onHover, onOpen, onBackground }: Props) {
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [lifted, setLifted] = useState<string | null>(null);
  const [z, setZ] = useState<Record<string, number>>({});
  const drag = useRef<Drag | null>(null);
  const zTop = useRef(10);
  const at = (id: string) => pos[id] ?? { x: byId[id].x, y: byId[id].y };

  useEffect(() => {
    const fit = () => {
      const s = Math.max(0.45, Math.min(innerWidth / 1400, (innerHeight - 110) / 760));
      setView({ s, x: (innerWidth - 1400 * s) / 2, y: 52 + (innerHeight - 110 - 760 * s) / 2 });
    };
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  const down = (e: RPE<HTMLDivElement>, n: NodeData) => {
    drag.current = { id: n.id, sx: e.clientX, sy: e.clientY, ox: at(n.id).x, oy: at(n.id).y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    const top = ++zTop.current;
    setZ((o) => ({ ...o, [n.id]: top }));
    e.preventDefault();
  };
  const move = (e: RPE<HTMLDivElement>, n: NodeData) => {
    const d = drag.current;
    if (!d || d.id !== n.id) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) { d.moved = true; setLifted(n.id); }
    const x = Math.max(n.w / 2, Math.min(1400 - n.w / 2, d.ox + dx / view.s));
    const y = Math.max(n.h / 2, Math.min(760 - n.h / 2, d.oy + dy / view.s));
    setPos((p) => ({ ...p, [n.id]: { x, y } }));
  };
  const up = (e: RPE<HTMLDivElement>, n: NodeData) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null; setLifted(null);
    if (!d.moved) onOpen(n.id, e.currentTarget.getBoundingClientRect());
  };
  const curve = (l: (typeof LINKS)[number]) => {
    const a = pinOf(byId[l[0]], at(l[0])), b = pinOf(byId[l[1]], at(l[1]));
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + Math.min(40, 8 + d * 0.06);
    return { a, b, mx, my };
  };

  return (
    <div id="slate" onClick={(e) => { if (!(e.target as HTMLElement).closest(".card")) onBackground(); }}>
      <div id="stage" style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.s})` }}>
        <svg id="strings">
          {LINKS.map((l, i) => {
            if (!byId[l[0]] || !byId[l[1]]) return null;
            const { a, b, mx, my } = curve(l);
            const cls = "th" + (l[3] ? " dash" : "") + (hot.has(i) ? " hot" : lit ? " dim" : "");
            return <path key={i} className={cls} d={`M${a.x},${a.y}Q${mx},${my} ${b.x},${b.y}`} />;
          })}
        </svg>
        <div id="cards">
          {NODES.map((n) => {
            const p = at(n.id);
            const dim = hidden.has(n.id) || (!!lit && !lit.has(n.id));
            const cls = `card${lifted === n.id ? " lift" : ""}${dim ? " dim" : ""}${sel === n.id ? " sel" : ""}`;
            return (
              <div key={n.id} className={cls} data-id={n.id}
                style={{ left: p.x - n.w / 2, top: p.y - n.h / 2, width: n.w, height: n.h, transform: `rotate(${n.r}deg)`, zIndex: z[n.id] }}
                onPointerDown={(e) => down(e, n)} onPointerMove={(e) => move(e, n)} onPointerUp={(e) => up(e, n)}
                onMouseEnter={() => onHover(n.id)} onMouseLeave={() => onHover(null)}>
                <CardFace n={n} />
              </div>
            );
          })}
          {NODES.map((n) => { const q = pinOf(n, at(n.id)); return <div key={"p" + n.id} className="pin" style={{ left: q.x, top: q.y }} />; })}
        </div>
        <div id="labs">
          {LINKS.map((l, i) => {
            if (!byId[l[0]] || !byId[l[1]]) return null;
            const { a, b, mx, my } = curve(l);
            return <div key={i} className={"lab" + (hot.has(i) ? " on" : "")} style={{ left: 0.25 * a.x + 0.5 * mx + 0.25 * b.x, top: 0.25 * a.y + 0.5 * my + 0.25 * b.y }}>{l[2]}</div>;
          })}
        </div>
      </div>
    </div>
  );
}