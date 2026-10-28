import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { KINDS, MAP_PINS, TOWER } from "../data/mapData";
import type { MapPin, PinKind } from "../data/mapData";
import { STATES } from "../data/states";
import { FACTS, STATEMENTS } from "../data/statements";
import { alibiFar, km2 } from "../logic/checks";
import type { Confidence, Grade, Status } from "../types";

interface Props {
  sample: boolean; custom: MapPin[]; rev: number; onPick: (id: string, rect: DOMRect) => void; onBackground: () => void;
  onAdd: (p: MapPin) => void; onRemove: (id: string) => void;
}
interface Hit { lat: number; lng: number; name: string }
interface Draft { lat: number; lng: number; title: string; kind: PinKind; note: string; status: Status; confidence: Confidence; grade: Grade }
type Raw = { lat: string; lon: string; display_name: string; address?: { state?: string } }[];

const store = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const save1 = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
const FACT_LABEL: Record<string, string> = { call: "c", tower: "T", cctv: "C", post: "P", record: "R", incident: "!", other: "o" };
const icon = (label: string, status: string) =>
  L.divIcon({ className: "", iconSize: [30, 30], iconAnchor: [15, 30], html: `<div class="mpin ${status}"><span>${label}</span></div>` });

export default function MapView({ sample, custom, rev, onPick, onBackground, onAdd, onRemove }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const draftMk = useRef<L.Marker | null>(null);
  const osm = useRef<L.TileLayer | null>(null);
  const sat = useRef<L.TileLayer | null>(null);
  const cb = useRef({ onPick, onBackground });
  cb.current = { onPick, onBackground };

  const [showSample, setShowSample] = useState(sample);
  const [satellite, setSatellite] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const addRef = useRef(false);
  addRef.current = addMode;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [q, setQ] = useState("");
  const [state, setState] = useState(() => store("caseweb.state", "Karnataka"));
  const [area, setArea] = useState(() => store("caseweb.area", ""));
  const [hits, setHits] = useState<Hit[]>([]);
  const [msg, setMsg] = useState("");
  const [none, setNone] = useState(false);

  const blank = (lat: number, lng: number, title = ""): Draft =>
    ({ lat, lng, title, kind: "place", note: "", status: "pending", confidence: "medium", grade: "B" });

  /* create the map once */
  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true, maxZoom: 19 });
    map.current = m;
    osm.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { className: "osm", attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(m);
    sat.current = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "Tiles © Esri", maxZoom: 19 });
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e) => {
      if (addRef.current) { setDraft(blank(e.latlng.lat, e.latlng.lng)); setAddMode(false); } else cb.current.onBackground();
    });
    const all: [number, number][] = [...(sample ? MAP_PINS : []), ...custom].map((p) => [p.lat, p.lng] as [number, number]);
    FACTS.forEach((f) => { if (f.lat !== undefined && f.lng !== undefined) all.push([f.lat, f.lng]); });
    STATEMENTS.forEach((st) => st.claims.forEach((c) => { if (c.type === "alibi") all.push([c.lat, c.lng]); }));
    if (all.length) m.fitBounds(L.latLngBounds(all), { padding: [70, 70] });
    else m.setView([12.9716, 77.5946], 11);
    return () => { m.remove(); };
  }, []);

  /* street map or satellite */
  useEffect(() => {
    const m = map.current!;
    if (satellite) { osm.current!.remove(); sat.current!.addTo(m); } else { sat.current!.remove(); osm.current!.addTo(m); }
  }, [satellite]);

  /* draw pins whenever they change */
  useEffect(() => {
    const g = layer.current!;
    g.clearLayers();
    const click = (id: string) => (e: L.LeafletMouseEvent) => {
      const o = e.originalEvent as MouseEvent;
      cb.current.onPick(id, new DOMRect(o.clientX, o.clientY, 1, 1));
    };
    const add = (p: MapPin) => L.marker([p.lat, p.lng], { icon: icon(p.label, p.status), title: p.title }).addTo(g).on("click", click(p.id));
    if (showSample) {
      L.circle([TOWER.lat, TOWER.lng], { radius: TOWER.radius, color: "#e8c15a", weight: 2, dashArray: "6 6", fillColor: "#e8c15a", fillOpacity: 0.07 })
        .bindTooltip(`Tower ${TOWER.name} coverage (sample)`, { sticky: true }).addTo(g);
      MAP_PINS.forEach(add);
    }
    custom.forEach(add);
    /* pins made from the evidence and statements you entered */
    FACTS.forEach((f) => {
      if (f.lat === undefined || f.lng === undefined) return;
      L.marker([f.lat, f.lng], { icon: icon(FACT_LABEL[f.kind] ?? "o", f.status), title: f.title }).addTo(g).on("click", click(f.id));
    });
    STATEMENTS.forEach((st) => st.claims.forEach((c, i) => {
      if (c.type !== "alibi") return;
      L.marker([c.lat, c.lng], { icon: icon("A", "claim"), title: `Says: ${c.place}` }).addTo(g).on("click", click(`${st.id}-${i}`));
      alibiFar(st.person, c).forEach((f) => {
        L.polyline([[c.lat, c.lng], [f.lat!, f.lng!]], { color: "#c0392b", weight: 2.5, dashArray: "8 8" })
          .bindTooltip(`Claimed place to this evidence: about ${km2(f, c).toFixed(1)} km`, { sticky: true }).addTo(g);
      });
    }));
  }, [custom, showSample, rev]);

  /* temporary marker while the form is open */
  useEffect(() => {
    draftMk.current?.remove(); draftMk.current = null;
    if (draft && map.current) draftMk.current = L.marker([draft.lat, draft.lng], { icon: icon("?", "draft") }).addTo(map.current);
  }, [draft?.lat, draft?.lng]);

  const ask = async (text: string): Promise<Raw> => {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=20&countrycodes=in&q=${encodeURIComponent(text)}`);
    return r.json();
  };
  const search = async (all = false) => {
    if (!q.trim()) return;
    setMsg("Searching..."); setHits([]); setNone(false);
    const s = all ? "All India" : state, a = area.trim(), st = s === "All India" ? "" : s;
    const keep = (x: Raw[number]) => s === "All India" || (x.address?.state ?? "").toLowerCase() === s.toLowerCase();
    try {
      let j = (await ask([q, a, st].filter(Boolean).join(", "))).filter(keep);
      if (!j.length && a) j = (await ask([q, st].filter(Boolean).join(", "))).filter(keep);
      setHits(j.slice(0, 8).map((x) => ({ lat: +x.lat, lng: +x.lon, name: x.display_name })));
      if (j.length) setMsg(all ? "Matches from all over India. Check the address before saving." : "");
      else { setMsg(`Nothing found in ${s}. Try another spelling, or zoom in and drop a pin by clicking.`); setNone(!all); }
    } catch { setMsg("Search failed. Check your internet."); }
  };
  const changeState = (v: string) => { setState(v); save1("caseweb.state", v); };
  const changeArea = (v: string) => { setArea(v); save1("caseweb.area", v); };
  const choose = (h: Hit) => { setHits([]); map.current?.flyTo([h.lat, h.lng], 18); setDraft(blank(h.lat, h.lng, h.name.split(",")[0])); };
  const save = () => {
    if (!draft || !draft.title.trim()) return;
    onAdd({ id: "U" + Date.now(), custom: true, kind: draft.kind, lat: draft.lat, lng: draft.lng, label: KINDS[draft.kind].label, title: draft.title.trim(),
      status: draft.status, confidence: draft.confidence, grade: draft.grade, rows: [["Type", KINDS[draft.kind].name], ["Note", draft.note || "None"]] });
    setDraft(null);
  };
  const up = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDraft((d) => (d ? { ...d, [k]: e.target.value } : d));

  return (
    <div id="map">
      <div ref={el} className={"mapel" + (addMode ? " add" : "")} />
      <div id="mpanel">
        <b>FIND A REAL PLACE</b>
        <select value={state} onChange={(e) => changeState(e.target.value)} title="Search only inside this state">
          {STATES.map((s) => <option key={s} value={s}>{s === "All India" ? "All India (no state filter)" : s}</option>)}</select>
        <input value={area} onChange={(e) => changeArea(e.target.value)} placeholder="Optional: district only, e.g. Bengaluru (leave empty if unsure)" />
        <div className="mrow"><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="area, address, shop, landmark..." />
          <button onClick={() => search()}>Search</button></div>
        {msg && <div className="mmsg">{msg}</div>}
        {none && <button className="hit" onClick={() => search(true)}>Search all India instead</button>}
        {hits.map((h, i) => <button key={i} className="hit" onClick={() => choose(h)}>{h.name}</button>)}
        <div className="mrow"><button className={"tog" + (!satellite ? " on" : "")} onClick={() => setSatellite(false)}>Street map</button>
          <button className={"tog" + (satellite ? " on" : "")} onClick={() => setSatellite(true)}>Satellite</button></div>
        <button className={"tog" + (addMode ? " on" : "")} onClick={() => { setAddMode(!addMode); setDraft(null); }}>
          {addMode ? "Click the map to drop the pin (click here to cancel)" : "＋ Drop a pin by clicking the map"}</button>
        {draft && (<div className="mform">
          <b>NEW PIN</b><div className="mmsg">{draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}</div>
          <input value={draft.title} onChange={up("title")} placeholder="Title, e.g. Pawn shop" />
          <select value={draft.kind} onChange={up("kind")}>{(Object.keys(KINDS) as PinKind[]).map((k) => <option key={k} value={k}>{KINDS[k].name}</option>)}</select>
          <div className="mrow"><select value={draft.status} onChange={up("status")}><option value="verified">Verified</option><option value="pending">Pending</option><option value="unverified">Unverified</option></select>
            <select value={draft.confidence} onChange={up("confidence")}><option value="high">High conf.</option><option value="medium">Medium conf.</option><option value="low">Low conf.</option></select>
            <select value={draft.grade} onChange={up("grade")}><option value="A">Grade A</option><option value="B">Grade B</option><option value="C">Grade C</option></select></div>
          <textarea value={draft.note} onChange={up("note")} placeholder="What happened here?" />
          <div className="mrow"><button className="save" onClick={save}>Save pin</button><button onClick={() => setDraft(null)}>Cancel</button></div>
        </div>)}
        {sample && <label><input type="checkbox" checked={showSample} onChange={(e) => setShowSample(e.target.checked)} />Show the sample case pins</label>}
        {custom.length > 0 && <><b>MY PINS</b>{custom.map((p) => (
          <div className="mrow mine" key={p.id}><button className="hit" onClick={() => map.current?.flyTo([p.lat, p.lng], 18)}>{p.label} · {p.title}</button>
            <button title="Remove" onClick={() => onRemove(p.id)}>✕</button></div>))}</>}
      </div>
      <div id="mlegend">
        <b>MAP</b>
        <span><i className="dot verified" /> Verified</span><span><i className="dot pending" /> Pending</span><span><i className="dot unverified" /> Unverified</span>
        <span>A = where someone says they were</span>
      </div>
    </div>
  );
}