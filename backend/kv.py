"""
Workspace storage.

The React app keeps each case as a few JSON documents (cards, threads, statements,
map pins, tasks). This file stores those documents in the database, so a case is no
longer stuck inside one browser.

It is a simple key -> value table. The keys all start with "caseweb." and look like
    caseweb.c.<case id>.data        caseweb.c.<case id>.records   ...
"""
from db import connect

SCHEMA = """
CREATE TABLE IF NOT EXISTS workspace_kv (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

PREFIX = "caseweb."
MAX_KEY = 200
MAX_VALUE = 8_000_000      # about 8 MB per document (photos can make documents big)


def init():
    """Create the table if it is not there yet. Safe to call every time the server starts."""
    with connect() as con:
        con.executescript(SCHEMA)


def check(key, value=""):
    if not key.startswith(PREFIX) or len(key) > MAX_KEY:
        raise ValueError(f'Keys must start with "{PREFIX}" and be at most {MAX_KEY} characters')
    if len(value) > MAX_VALUE:
        raise OverflowError("That document is too large")


def list_all(con):
    """Every stored document as {key: value}."""
    return {r["key"]: r["value"] for r in con.execute("SELECT key, value FROM workspace_kv ORDER BY key")}


def put(con, key, value):
    check(key, value)
    con.execute(
        "INSERT INTO workspace_kv (key, value, updated_at) VALUES (?, ?, datetime('now')) "
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        (key, value),
    )


def delete(con, key):
    check(key)
    cur = con.execute("DELETE FROM workspace_kv WHERE key = ?", (key,))
    return cur.rowcount > 0