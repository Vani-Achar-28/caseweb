/**
 * Keeps the data this app saves in the browser (the localStorage keys that start with "caseweb.")
 * in step with the backend database.
 *
 *  - When the app starts, it loads the saved cases from the database.
 *    (The very first time, it uploads what this browser already has.)
 *  - After that, every save or delete is sent to the database too.
 *  - If the backend is not running, the app keeps working from the browser
 *    and sends the changes later.
 *
 * Documents live in a WORKSPACE on the backend:
 *  - on your own computer (localhost) the workspace is "local", shared by all your browsers
 *  - on the public website every visitor gets a private workspace, so visitors never
 *    see or change each other's cases. Everyone starts with the sample case.
 */
const API = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ?? "http://127.0.0.1:8000";
const PREFIX = "caseweb.";
const DIRTY = "caseweb-sync.dirty";       // keys changed here but not yet saved in the database
const MIGRATED = "caseweb-sync.migrated"; // set after the first sync with the database
const WS_KEY = "caseweb-sync.ws";         // this visitor's private workspace id

// the browser's own save / delete, kept before we wrap them
const rawSet = Storage.prototype.setItem;
const rawRemove = Storage.prototype.removeItem;

/** Which workspace on the backend this browser uses. */
function workspaceId(): string {
  const fixed = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_WORKSPACE;
  if (fixed) return fixed;
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "local";
  let id = localStorage.getItem(WS_KEY);
  if (!id) {
    id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
    rawSet.call(localStorage, WS_KEY, id);
  }
  return id;
}
const WS = workspaceId();

let dirty = new Set<string>();
let flushing = false;
let timer: ReturnType<typeof setTimeout> | undefined;

/* ---------- small status badge, so you can see it working ---------- */
type Status = "syncing" | "online" | "offline";
let badge: HTMLDivElement | null = null;
function show(status: Status) {
  if (typeof document === "undefined" || !document.body) return;
  if (!badge) {
    badge = document.createElement("div");
    Object.assign(badge.style, {
      position: "fixed", left: "12px", bottom: "12px", zIndex: "9999", padding: "4px 10px", borderRadius: "999px",
      font: "12px system-ui, sans-serif", background: "rgba(20,20,24,.85)", border: "1px solid #555", pointerEvents: "none",
    });
    document.body.appendChild(badge);
  }
  const look = {
    syncing: ["#e6c36a", "Saving..."],
    online: ["#6fcf97", "Saved to the database"],
    offline: ["#f2994a", "Backend offline: saved in this browser, will sync later"],
  }[status];
  badge.style.color = look[0];
  badge.textContent = "\u25CF " + look[1];
}

/* ---------- talking to the backend ---------- */
async function call(path: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const stop = setTimeout(() => ctrl.abort(), 5000);
  try {
    return await fetch(API + path, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(stop);
  }
}

async function send(key: string, value: string | null): Promise<boolean> {
  try {
    const r = value === null
      ? await call(`/api/kv?ws=${encodeURIComponent(WS)}&key=${encodeURIComponent(key)}`, { method: "DELETE" })
      : await call("/api/kv", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ws: WS, key, value }) });
    return r.ok;
  } catch {
    return false;
  }
}

/* ---------- remembering what still has to be sent ---------- */
function loadDirty(): Set<string> {
  try {
    const a = JSON.parse(localStorage.getItem(DIRTY) || "[]");
    return new Set(Array.isArray(a) ? (a as string[]) : []);
  } catch {
    return new Set();
  }
}
function saveDirty() {
  try { localStorage.setItem(DIRTY, JSON.stringify([...dirty])); } catch { /* ignore */ }
}

/** Sends every changed document to the database. Stops and tries again later if the backend is not reachable. */
async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  let failed = false;
  try {
    while (dirty.size > 0 && !failed) {
      for (const key of [...dirty]) {
        const value = localStorage.getItem(key);
        if (!(await send(key, value))) { failed = true; break; }
        if (localStorage.getItem(key) === value) { dirty.delete(key); saveDirty(); }
      }
    }
  } finally {
    flushing = false;
  }
  if (failed) {
    show("offline");
    clearTimeout(timer);
    timer = setTimeout(() => { void flush(); }, 8000);
  } else {
    show("online");
  }
}

function scheduleFlush() {
  show("syncing");
  clearTimeout(timer);
  timer = setTimeout(() => { void flush(); }, 300);
}

/** From now on, every save or delete of a "caseweb." key is also queued for the database. */
function installHooks() {
  const mirror = (key: string) => {
    if (!key.startsWith(PREFIX)) return;
    dirty.add(key);
    saveDirty();
    scheduleFlush();
  };
  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    rawSet.call(this, key, value);
    if (this === localStorage) mirror(key);
  };
  Storage.prototype.removeItem = function (this: Storage, key: string) {
    rawRemove.call(this, key);
    if (this === localStorage) mirror(key);
  };
  window.addEventListener("online", () => { void flush(); });
}

/**
 * Call this once, before the app starts. It never throws:
 * if the backend is not running, the app simply works from the browser as before.
 */
export async function startSync(): Promise<void> {
  dirty = loadDirty();
  installHooks();
  show("syncing");

  let server: Record<string, string>;
  try {
    const r = await call(`/api/kv?ws=${encodeURIComponent(WS)}`);
    if (!r.ok) throw new Error("bad status " + r.status);
    server = (await r.json()) as Record<string, string>;
  } catch {
    show("offline");
    if (dirty.size > 0) scheduleFlush();
    return;
  }

  const firstTime = localStorage.getItem(MIGRATED) !== "1";
  const here = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));

  // 1. documents from the database replace the browser's copy (unless this browser has unsent changes to them)
  for (const [key, value] of Object.entries(server)) {
    if (!dirty.has(key)) rawSet.call(localStorage, key, value);
  }
  // 2. documents that only exist in this browser: upload them the first time, or when the database is empty
  //    (it was reset), otherwise they were deleted from another browser
  const databaseEmpty = Object.keys(server).length === 0;
  for (const key of here) {
    if (key in server || dirty.has(key)) continue;
    if (firstTime || databaseEmpty) dirty.add(key);
    else rawRemove.call(localStorage, key);
  }
  rawSet.call(localStorage, MIGRATED, "1");
  saveDirty();
  await flush();
}