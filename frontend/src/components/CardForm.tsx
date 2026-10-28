import { useEffect, useRef, useState } from "react";
import type { Confidence, Grade, NodeData, NodeType, Status } from "../types";
import { TYPE_LABEL } from "../data/caseData";
import { blobToPhoto, fileToPhoto } from "../lib/photo";

const SIZES: Record<NodeType, [number, number]> = { person: [118, 150], media: [158, 128], location: [150, 96], event: [150, 96], evidence: [140, 108], doc: [140, 104], note: [128, 100] };
const ROLES = ["VICTIM", "SUSPECT", "WITNESS", "FAMILY", "UNKNOWN"];
const COLORS = ["#e8d98a", "#e5b7c4", "#b8d9ea", "#c8e6b0"];
const HINTS = ["Alias", "Phone", "Address", "Statement", "Background", "Source", "Found at", "Collected by", "Custody", "Date"];
type Meta = NonNullable<NodeData["photoMeta"]>;

/** True on phones and tablets (touch screens), false on a normal laptop or desktop. */
const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

interface Props { initial?: NodeData; canDelete?: boolean; onSave: (n: NodeData) => void; onDelete?: () => void; onClose: () => void }

export default function CardForm({ initial, canDelete, onSave, onDelete, onClose }: Props) {
  const [type, setType] = useState<NodeType>(initial?.type ?? "person");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [role, setRole] = useState(initial?.role ?? "UNKNOWN");
  const [status, setStatus] = useState<Status>(initial?.status ?? "pending");
  const [confidence, setConfidence] = useState<Confidence>(initial?.confidence ?? "medium");
  const [grade, setGrade] = useState<Grade>(initial?.grade ?? "B");
  const [color, setColor] = useState(initial?.c ?? COLORS[0]);
  const [rows, setRows] = useState<[string, string][]>(initial?.rows.length ? initial.rows.map((r) => [r[0], r[1]]) : [["", ""]]);
  const [url, setUrl] = useState<string | undefined>(initial?.photo ?? initial?.thumb);
  const [meta, setMeta] = useState<Meta | undefined>(initial?.photoMeta);
  const [err, setErr] = useState("");
  const [cam, setCam] = useState(false);
  const [camCount, setCamCount] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => { if (cam && video.current && stream.current) video.current.srcObject = stream.current; }, [cam]);
  useEffect(() => () => { stream.current?.getTracks().forEach((t) => t.stop()); }, []);

  const setPhoto = (p: { url: string; hash: string; name: string; at: string }) => { setUrl(p.url); setMeta({ hash: p.hash, name: p.name, at: p.at }); };
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try { setPhoto(await fileToPhoto(f)); setErr(""); } catch { setErr("Could not read that image."); }
  };
  const startCam = async (facing: "environment" | "user" = "environment") => {
    setErr("");
    stream.current?.getTracks().forEach((t) => t.stop());
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
      setCam(true);
      if (video.current) video.current.srcObject = stream.current;
      const all = await navigator.mediaDevices.enumerateDevices();
      setCamCount(all.filter((d) => d.kind === "videoinput").length);
    } catch { setErr("Camera not available. Allow camera access in the browser, or use Upload photo."); }
  };
  const flip = () => {
    const now = stream.current?.getVideoTracks()[0]?.getSettings().facingMode;
    startCam(now === "environment" ? "user" : "environment");
  };
  const stopCam = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setCam(false); };
  const snap = async () => {
    const v = video.current!, c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9));
    if (blob) setPhoto(await blobToPhoto(blob, `camera-${Date.now()}.jpg`));
    stopCam();
  };

  const isNote = type === "note", hasPhoto = type === "person" || type === "media";
  const setRow = (i: number, j: 0 | 1, v: string) => setRows((r) => r.map((x, k) => (k === i ? (j === 0 ? [v, x[1]] : [x[0], v]) : x)) as [string, string][]);
  const save = () => {
    if (!title.trim()) { setErr("Please give the card a title."); return; }
    const [w, h] = type === "person" && role === "VICTIM" ? [130, 168] : SIZES[type];
    onSave({
      id: initial?.id ?? "C" + Date.now(), type, title: title.trim(), w, h,
      x: initial?.x ?? 700 + Math.round(Math.random() * 160 - 80), y: initial?.y ?? 340 + Math.round(Math.random() * 120 - 60),
      r: initial?.r ?? Math.round((Math.random() * 6 - 3) * 10) / 10, art: initial?.art,
      rows: isNote ? [] : rows.filter((r) => r[0].trim() && r[1].trim()),
      ...(type === "person" ? { role, photo: url, photoMeta: meta } : {}),
      ...(type === "media" ? { thumb: url, photoMeta: meta } : {}),
      ...(isNote ? { c: color } : { status, confidence, grade }),
    });
  };

  return (
    <div id="cf" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cfbox">
        <h2>{initial ? "EDIT CARD" : "ADD A CARD"}</h2>
        <label>Type<select value={type} onChange={(e) => setType(e.target.value as NodeType)}>
          {(Object.keys(TYPE_LABEL) as NodeType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></label>
        <label>{isNote ? "Note text" : "Title / name"}
          {isNote ? <textarea value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Write the note..." />
            : <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === "person" ? "Full name" : "Short title"} />}</label>
        {type === "person" && <label>Role in the case<select value={role} onChange={(e) => setRole(e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>}
        {isNote ? <label>Colour<div className="sw">{COLORS.map((c) => <button key={c} type="button" className={c === color ? "on" : ""} style={{ background: c }} onClick={() => setColor(c)} />)}</div></label> : (
          <div className="cf3">
            <label>Verified status<select value={status} onChange={(e) => setStatus(e.target.value as Status)}><option value="verified">Verified</option><option value="pending">Pending</option><option value="unverified">Unverified</option></select></label>
            <label>Confidence<select value={confidence} onChange={(e) => setConfidence(e.target.value as Confidence)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></label>
            <label>Source grade<select value={grade} onChange={(e) => setGrade(e.target.value as Grade)}><option value="A">A reliable</option><option value="B">B usually reliable</option><option value="C">C unproven</option></select></label>
          </div>)}
        {hasPhoto && (<div className="ph2"><div className="phh">PHOTO</div>
          {cam ? (<div><video ref={video} autoPlay playsInline muted /><div className="cfrow"><button type="button" onClick={snap}>Take the photo</button>
            {camCount > 1 && <button type="button" onClick={flip}>Switch camera</button>}<button type="button" onClick={stopCam}>Close camera</button></div></div>) : (
            <div className="cfrow">
              {url ? <img src={url} alt="" /> : <div className="noimg">No photo</div>}
              <div className="phb"><label className="up">Upload photo<input type="file" accept="image/*" onChange={pick} hidden /></label>
                <button type="button" onClick={() => startCam()}>{isTouch ? "Use camera" : "Use webcam"}</button>
                {isTouch && <label className="up">Phone camera (back)<input type="file" accept="image/*" capture="environment" onChange={pick} hidden /></label>}
                {url && <button type="button" onClick={() => { setUrl(undefined); setMeta(undefined); }}>Remove photo</button>}</div>
            </div>)}
          {meta && <div className="fp">Fingerprint (SHA-256): {meta.hash ? meta.hash.slice(0, 24) + "..." : "not available"}<br />Added: {new Date(meta.at).toLocaleString()}</div>}
        </div>)}
        {!isNote && (<div><div className="phh">DETAILS</div>
          <datalist id="hints">{HINTS.map((h) => <option key={h} value={h} />)}</datalist>
          {rows.map((r, i) => (<div className="cfrow" key={i}>
            <input list="hints" value={r[0]} onChange={(e) => setRow(i, 0, e.target.value)} placeholder="Label" style={{ maxWidth: 150 }} />
            <input value={r[1]} onChange={(e) => setRow(i, 1, e.target.value)} placeholder="Value" />
            <button type="button" title="Remove" onClick={() => setRows((l) => (l.length > 1 ? l.filter((_, k) => k !== i) : [["", ""]]))}>✕</button></div>))}
          <button type="button" className="lnk2" onClick={() => setRows((l) => [...l, ["", ""]])}>＋ Add a detail</button></div>)}
        {err && <div className="cferr">{err}</div>}
        <div className="cfrow cfend">
          <button type="button" className="save" onClick={save}>Save card</button><button type="button" onClick={onClose}>Cancel</button>
          {canDelete && <button type="button" className="del" onClick={onDelete}>Delete card</button>}
        </div>
      </div>
    </div>
  );
}