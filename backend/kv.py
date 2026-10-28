"""
Workspace storage.

The React app keeps each case as a few JSON documents (cards, threads, statements,
map pins, tasks). This file stores those documents in the database, so a case is no
longer stuck inside one browser.

Documents are grouped into WORKSPACES:
  - on your own computer the app uses the workspace called "local" (shared by all your browsers)
  - on the public website every visitor gets a private workspace of their own, so nobody
    can change or delete what another visitor sees. Each one starts with the sample case.

It is a simple (workspace, key) -> value table. Keys look like
    caseweb.c.<case id>.data        caseweb.c.<case id>.records   ...
"""
import re

from db import connect

SCHEMA = """
CREATE TABLE IF NOT EXISTS kv_ws (
    ws TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (ws, key)
);
"""

PREFIX = "caseweb."
KEEP = "local"                          # your own workspace is never cleaned up
WS_RE = re.compile(r"^[A-Za-z0-9_-]{3,64}$")
MAX_KEY = 200
MAX_VALUE = 3_000_000                   # about 3 MB per document
MAX_KEYS = 300                          # documents per workspace
MAX_WORKSPACES = 2000                   # visitors kept at the same time
EXPIRE_DAYS = 3                         # visitor workspaces not used for this long are deleted


def init():
    """Create the table, copy data from the older single-workspace table, remove old visitors."""
    with connect() as con:
        con.executescript(SCHEMA)
        old = con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='workspace_kv'").fetchone()
        if old:
            con.execute("INSERT OR IGNORE INTO kv_ws (ws, key, value, updated_at) SELECT ?, key, value, updated_at FROM workspace_kv", (KEEP,))
            con.execute("DROP TABLE workspace_kv")
        purge(con)


def purge(con):
    """Delete visitor workspaces that have not been used for a few days, and keep the total number small."""
    con.execute("DELETE FROM kv_ws WHERE ws != ? AND updated_at < datetime('now', ?)", (KEEP, f"-{EXPIRE_DAYS} days"))
    extra = con.execute(
        "SELECT ws FROM kv_ws WHERE ws != ? GROUP BY ws ORDER BY MAX(updated_at) DESC LIMIT -1 OFFSET ?", (KEEP, MAX_WORKSPACES)
    ).fetchall()
    for (ws,) in extra:
        con.execute("DELETE FROM kv_ws WHERE ws = ?", (ws,))


def check(ws, key=None, value=""):
    if not WS_RE.match(ws or ""):
        raise ValueError("Workspace id must be 3 to 64 letters, digits, - or _")
    if key is not None and (not key.startswith(PREFIX) or len(key) > MAX_KEY):
        raise ValueError(f'Keys must start with "{PREFIX}" and be at most {MAX_KEY} characters')
    if len(value) > MAX_VALUE:
        raise OverflowError("That document is too large")


def list_all(con, ws):
    """Every stored document of one workspace as {key: value}."""
    check(ws)
    return {r["key"]: r["value"] for r in con.execute("SELECT key, value FROM kv_ws WHERE ws = ? ORDER BY key", (ws,))}


def put(con, ws, key, value):
    check(ws, key, value)
    exists = con.execute("SELECT 1 FROM kv_ws WHERE ws = ? AND key = ?", (ws, key)).fetchone()
    if not exists:
        if con.execute("SELECT COUNT(*) FROM kv_ws WHERE ws = ?", (ws,)).fetchone()[0] >= MAX_KEYS:
            raise OverflowError("This workspace has too many documents")
        if con.execute("SELECT 1 FROM kv_ws WHERE ws = ? LIMIT 1", (ws,)).fetchone() is None:
            purge(con)                  # a new visitor: tidy up old ones first
    con.execute(
        "INSERT INTO kv_ws (ws, key, value, updated_at) VALUES (?, ?, ?, datetime('now')) "
        "ON CONFLICT(ws, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        (ws, key, value),
    )


def delete(con, ws, key):
    check(ws, key)
    cur = con.execute("DELETE FROM kv_ws WHERE ws = ? AND key = ?", (ws, key))
    return cur.rowcount > 0