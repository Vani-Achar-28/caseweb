"""
CaseWeb database layer (SQLite, standard library only).

What this file does:
  1. Defines the tables (the "schema").
  2. Fills them the first time with the fake case from generate_case.py.
  3. Gives functions to read a case, add people / evidence / clues / links,
     compare DNA, and write an audit log of every change.

main.py (the web API) only calls the functions in this file.
"""
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "caseweb.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    incident_start TEXT NOT NULL,
    incident_end TEXT NOT NULL,
    scene_name TEXT NOT NULL,
    scene_tower TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS persons (
    id TEXT NOT NULL,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (case_id, id)
);
CREATE TABLE IF NOT EXISTS relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    a TEXT NOT NULL, b TEXT NOT NULL, type TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS phones (
    number TEXT NOT NULL,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    owner TEXT NOT NULL,
    PRIMARY KEY (case_id, number)
);
CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    from_number TEXT NOT NULL, to_number TEXT NOT NULL,
    time TEXT NOT NULL, secs INTEGER NOT NULL, tower TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dna_profiles (
    person_id TEXT NOT NULL,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    profile_json TEXT NOT NULL,
    PRIMARY KEY (case_id, person_id)
);
CREATE TABLE IF NOT EXISTS evidence (
    id TEXT NOT NULL,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    type TEXT NOT NULL,
    found_at TEXT NOT NULL,
    collected_by TEXT NOT NULL,
    collected_at TEXT NOT NULL,
    dna_json TEXT,
    PRIMARY KEY (case_id, id)
);
CREATE TABLE IF NOT EXISTS custody (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    evidence_id TEXT NOT NULL,
    to_party TEXT NOT NULL,
    at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS statements (
    id TEXT NOT NULL,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    person_id TEXT NOT NULL,
    text TEXT NOT NULL,
    PRIMARY KEY (case_id, id)
);
CREATE TABLE IF NOT EXISTS medical (
    case_id INTEGER PRIMARY KEY REFERENCES cases(id),
    victim TEXT NOT NULL,
    cause TEXT NOT NULL,
    tod_start TEXT NOT NULL, tod_end TEXT NOT NULL,
    injuries_json TEXT NOT NULL,
    toxicology TEXT NOT NULL,
    note TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clues (
    id TEXT NOT NULL,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL DEFAULT '{}',
    PRIMARY KEY (case_id, id)
);
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    a TEXT NOT NULL, b TEXT NOT NULL,
    kind TEXT NOT NULL, label TEXT NOT NULL, dashed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS manual_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL REFERENCES cases(id),
    sev TEXT NOT NULL, title TEXT NOT NULL,
    why_json TEXT NOT NULL, nodes_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS board_positions (
    case_id INTEGER NOT NULL REFERENCES cases(id),
    item_id TEXT NOT NULL,
    x REAL NOT NULL, y REAL NOT NULL, r REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (case_id, item_id)
);
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    case_id INTEGER,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT ''
);
"""

ROLES = ("victim", "suspect", "witness", "family", "unknown")
CLUE_TYPES = ("ig", "news", "letter", "ransom", "bank", "sticky")
LINK_KINDS = ("red", "black", "gold", "white")


# ------------------------------------------------------------------ connection
@contextmanager
def connect(path=None):
    con = sqlite3.connect(path or DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def audit(con, case_id, action, target, detail=""):
    con.execute("INSERT INTO audit_log (case_id, action, target, detail) VALUES (?,?,?,?)",
                (case_id, action, target, detail))


# ------------------------------------------------------------------ seed data
SEED_CLUE_ITEMS = [
    {"id": "NEWS", "type": "news", "name": "Newspaper clipping: partners' dispute", "paper": "THE DECCAN COURIER", "date": "Mon, 2 Feb 2026",
     "head": "Shop partners trade charges over Rs 12 lakh stock payments",
     "body": "Ravi Shetty and Suresh Rao, partners in an electronics shop on 100 Feet Road, Indiranagar, have accused each other of hiding stock payments. The shop stayed shut for a week. Both men told this paper the matter would be settled privately.",
     "meaning": "A money dispute between Ravi and Suresh about six weeks before the murder. It is a possible motive, not proof."},
    {"id": "IGM", "type": "ig", "name": "Instagram post: @manoj_k_official", "handle": "manoj_k_official", "loc": "Indiranagar, Bengaluru", "when": "14 Mar 2026, 9:40 PM",
     "caption": "late night vibes \U0001F37B #indiranagar", "likes": 112, "comments": 9, "art": "night",
     "meaning": "The post is tagged Indiranagar at 9:40 pm, inside the incident window. His statement says he stayed at home in Koramangala all evening. It also fits his phone being on the scene tower at 10:15 pm. A location tag can be added later, so check when the photo was really taken."},
    {"id": "IGD", "type": "ig", "name": "Instagram post: @deepak.rides", "handle": "deepak.rides", "loc": "Bengaluru", "when": "12 Mar 2026, 6:15 PM",
     "caption": "new wheels, white beast \U0001F3CD\uFE0F", "likes": 64, "comments": 5, "art": "bike",
     "meaning": "Shows Deepak's white motorbike with the number plate KA 01 HJ 4471, two days before the murder. The CCTV clip from 1st Main shows a white bike with a plate ending in 4471."},
    {"id": "L1", "type": "letter", "name": "Letter: Ravi to Manoj", "text": "Manoj, it has been two months. Rs 4,00,000 by the 10th or I tell your father. - Ravi",
     "found": "Drawer of Ravi's shop, collected 15 Mar",
     "meaning": "Ravi was pressing Manoj to repay Rs 4 lakh and threatening to tell his father. That gives Manoj a possible reason to be angry with Ravi. It does not show he acted on it."},
    {"id": "L2", "type": "ransom", "name": "Anonymous threat letter", "text": "STOP ASKING ABOUT THE STOCK MONEY. LAST WARNING.", "found": "Pushed under the door of Ravi's shop, 9 Mar",
     "meaning": "The words 'stock money' match the dispute in the newspaper clipping between Ravi and Suresh. The sender is unknown. A handwriting or paper test could narrow it down."},
    {"id": "BANK", "type": "bank", "name": "Bank statement: Ravi", "acct": "A/c ending 4417",
     "lines": [["12 Jan", "UPI to MANOJ KUMAR", "-4,00,000"], ["15 Jan", "Shop rent", "-35,000"], ["03 Feb", "Sales credit", "+1,12,000"], ["01 Mar", "Sales credit", "+98,500"]],
     "meaning": "Ravi sent Manoj Rs 4 lakh on 12 January. No money from Manoj back to Ravi appears in this statement."},
    {"id": "N1", "type": "sticky", "name": "Sticky note", "text": "Why was the knife hidden behind the plant pot?", "color": "#fff08a"},
    {"id": "N2", "type": "sticky", "name": "Sticky note", "text": "Who is Deepak? Not in any statement.", "color": "#ffc4d4"},
    {"id": "N3", "type": "sticky", "name": "Sticky note", "text": "Manoj says home all evening. CHECK!", "color": "#bfe6ff"},
    {"id": "CDR", "type": "cdr", "name": "Phone records (CDR)"},
    {"id": "LAB", "type": "lab", "name": "DNA lab report"},
    {"id": "PM", "type": "pm", "name": "Post-mortem report"},
    {"id": "MAP", "type": "map", "name": "Scene map"},
]

# [a, b, colour of string, label, dashed (1 = not confirmed yet)]
SEED_LINKS = [
    ["PM", "P1", "red", "post-mortem", 0], ["MAP", "P1", "red", "scene of death", 0],
    ["P5", "P1", "white", "neighbour, heard shouting", 1], ["P5", "P4", "white", "says a voice sounded like Manoj", 1],
    ["IGM", "P4", "black", "post tagged Indiranagar 9:40 pm", 0], ["IGD", "P6", "black", "his bike", 0], ["IGD", "E4", "black", "plate matches CCTV?", 1],
    ["NEWS", "P3", "gold", "business dispute", 0], ["NEWS", "P1", "gold", "business dispute", 0],
    ["BANK", "P1", "gold", "Ravi's account", 0], ["BANK", "P4", "gold", "Rs 4 lakh sent to Manoj", 0],
    ["L1", "P1", "gold", "written by Ravi", 0], ["L1", "P4", "gold", "addressed to Manoj", 0],
    ["L2", "P1", "gold", "threat to Ravi", 0], ["L2", "NEWS", "gold", "same 'stock money' issue", 1],
    ["N1", "E2", "white", "?", 1], ["N2", "P6", "white", "?", 1], ["N3", "P4", "white", "check", 1],
]

SEED_LEADS = [
    {"sev": "high", "title": "Manoj's Instagram post contradicts his alibi", "nodes": ["IGM", "P4", "CDR"],
     "why": ["His public post is tagged Indiranagar at 9:40 pm on 14 March, inside the incident window (9:30 to 11:00 pm).",
             "His statement says he was at home in Koramangala all evening.",
             "His phone also used the tower covering the scene at 10:15 pm.",
             "A tag can be edited later. Confirm the real upload time with the platform."]},
    {"sev": "high", "title": "A white bike on CCTV may be Deepak's bike", "nodes": ["E4", "IGD", "P6"],
     "why": ["CCTV on 1st Main shows a white bike at 9:48 pm with a plate ending in 4471.",
             "Deepak's post from 12 March shows his white bike with the plate KA 01 HJ 4471.",
             "Deepak's phone used the scene tower at 9:20 pm, ten minutes before the window.",
             "Only part of the plate is visible, so check it against vehicle records."]},
    {"sev": "medium", "title": "Money trouble connects three people to Ravi", "nodes": ["BANK", "NEWS", "L1", "P1", "P3", "P4"],
     "why": ["Bank statement: Ravi sent Manoj Rs 4 lakh on 12 January and nothing came back.",
             "Ravi's letter to Manoj demands repayment.",
             "A newspaper clipping shows a Rs 12 lakh dispute between Ravi and Suresh.",
             "Motive is a reason to look closer. It is not evidence that someone did it."]},
    {"sev": "medium", "title": "The threat letter mentions 'stock money'", "nodes": ["L2", "NEWS", "P3"],
     "why": ["The anonymous letter was pushed under Ravi's shop door on 9 March.",
             "'Stock money' is the same issue as the Ravi and Suresh dispute in the newspaper.",
             "The sender is unknown. Handwriting or paper tests could help."]},
    {"sev": "medium", "title": "A witness thought one voice sounded like Manoj", "nodes": ["P5", "P4"],
     "why": ["Kiran, the neighbour, heard two men shouting around 10 pm.",
             "He said one voice sounded like Manoj.",
             "Voice recognition through a wall is weak evidence. Treat it as a pointer only."]},
]

# where each thing sits on the board: id -> [x, y, tilt in degrees]
SEED_PLACE = {
    "P1": [720, 330, -1], "P2": [430, 340, 2], "P3": [430, 115, -3], "P4": [1160, 120, 2], "P5": [1010, 360, -2], "P6": [1130, 560, 3],
    "E1": [290, 520, -3], "E2": [1250, 300, 3], "E3": [1325, 480, -2], "E4": [1010, 710, 2],
    "NEWS": [175, 105, -3], "MAP": [690, 85, 1.5], "IGM": [930, 125, -2], "BANK": [1345, 110, 3],
    "N1": [260, 290, -4], "L1": [110, 330, 3], "L2": [110, 520, -2],
    "LAB": [720, 560, 1], "PM": [545, 520, -2], "CDR": [900, 560, 2], "IGD": [1340, 660, -2], "N2": [800, 712, 3], "N3": [600, 712, -3],
}


def init_db(path=None):
    """Create the tables, and fill them with the fake case the first time."""
    with connect(path) as con:
        con.executescript(SCHEMA)
        if con.execute("SELECT COUNT(*) FROM cases").fetchone()[0] == 0:
            seed(con)


def seed(con):
    from generate_case import case  # the fake case we made in Step 1

    cur = con.execute(
        "INSERT INTO cases (code, title, incident_start, incident_end, scene_name, scene_tower) VALUES (?,?,?,?,?,?)",
        (case["case_id"], case["title"], case["incident_time_window"][0], case["incident_time_window"][1],
         case["scene"]["name"], case["scene"]["tower"]))
    cid = cur.lastrowid

    for p in case["persons"]:
        con.execute("INSERT INTO persons (id, case_id, name, role, note) VALUES (?,?,?,?,?)", (p["id"], cid, p["name"], p["role"], p["note"]))
    for r in case["relations"]:
        con.execute("INSERT INTO relations (case_id, a, b, type) VALUES (?,?,?,?)", (cid, r["a"], r["b"], r["type"]))
    for ph in case["phones"]:
        con.execute("INSERT INTO phones (number, case_id, owner) VALUES (?,?,?)", (ph["number"], cid, ph["owner"]))
    for c in case["calls"]:
        con.execute("INSERT INTO calls (case_id, from_number, to_number, time, secs, tower) VALUES (?,?,?,?,?,?)",
                    (cid, c["from"], c["to"], c["time"], c["secs"], c["tower"]))
    for pid, prof in case["dna_profiles"].items():
        con.execute("INSERT INTO dna_profiles (person_id, case_id, profile_json) VALUES (?,?,?)", (pid, cid, json.dumps(prof)))
    for e in case["evidence"]:
        con.execute("INSERT INTO evidence (id, case_id, type, found_at, collected_by, collected_at, dna_json) VALUES (?,?,?,?,?,?,?)",
                    (e["id"], cid, e["type"], e["found_at"], e["collected_by"], e["collected_at"], json.dumps(e["dna"]) if e["dna"] else None))
        for c in e["custody"]:
            con.execute("INSERT INTO custody (case_id, evidence_id, to_party, at) VALUES (?,?,?,?)", (cid, e["id"], c["to"], c["at"]))
    for s in case["statements"]:
        con.execute("INSERT INTO statements (id, case_id, person_id, text) VALUES (?,?,?,?)", (s["id"], cid, s["person"], s["text"]))
    m = case["medical"]
    con.execute("INSERT INTO medical (case_id, victim, cause, tod_start, tod_end, injuries_json, toxicology, note) VALUES (?,?,?,?,?,?,?,?)",
                (cid, m["victim"], m["cause"], m["time_of_death_window"][0], m["time_of_death_window"][1], json.dumps(m["injuries"]), m["toxicology"], m["note"]))

    for item in SEED_CLUE_ITEMS:
        rest = {k: v for k, v in item.items() if k not in ("id", "type", "name")}
        con.execute("INSERT INTO clues (id, case_id, type, name, data_json) VALUES (?,?,?,?,?)", (item["id"], cid, item["type"], item["name"], json.dumps(rest)))
    for a, b, kind, label, dashed in SEED_LINKS:
        con.execute("INSERT INTO links (case_id, a, b, kind, label, dashed) VALUES (?,?,?,?,?,?)", (cid, a, b, kind, label, dashed))
    for l in SEED_LEADS:
        con.execute("INSERT INTO manual_leads (case_id, sev, title, why_json, nodes_json) VALUES (?,?,?,?,?)",
                    (cid, l["sev"], l["title"], json.dumps(l["why"]), json.dumps(l["nodes"])))
    for item_id, (x, y, r) in SEED_PLACE.items():
        con.execute("INSERT INTO board_positions (case_id, item_id, x, y, r) VALUES (?,?,?,?,?)", (cid, item_id, x, y, r))
    audit(con, cid, "seed", case["case_id"], "Loaded the synthetic demo case")


# ------------------------------------------------------------------ reading
def list_cases(con):
    return [dict(r) for r in con.execute("SELECT id, code, title FROM cases ORDER BY id")]


def case_exists(con, case_id):
    return con.execute("SELECT 1 FROM cases WHERE id = ?", (case_id,)).fetchone() is not None


def get_case(con, case_id):
    """The whole case as one dictionary (same shape the web pages already use)."""
    c = con.execute("SELECT * FROM cases WHERE id = ?", (case_id,)).fetchone()
    if c is None:
        raise LookupError(f"Case {case_id} not found")
    q = lambda sql, *a: con.execute(sql, (case_id, *a)).fetchall()

    evidence = []
    for e in q("SELECT * FROM evidence WHERE case_id = ? ORDER BY rowid"):
        cust = [{"to": r["to_party"], "at": r["at"]} for r in q("SELECT * FROM custody WHERE case_id = ? AND evidence_id = ? ORDER BY id", e["id"])]
        evidence.append({"id": e["id"], "type": e["type"], "found_at": e["found_at"], "collected_by": e["collected_by"],
                         "collected_at": e["collected_at"], "custody": cust, "dna": json.loads(e["dna_json"]) if e["dna_json"] else None})
    m = con.execute("SELECT * FROM medical WHERE case_id = ?", (case_id,)).fetchone()
    return {
        "case_id": c["code"],
        "title": c["title"],
        "incident_time_window": [c["incident_start"], c["incident_end"]],
        "scene": {"name": c["scene_name"], "tower": c["scene_tower"]},
        "persons": [{"id": r["id"], "name": r["name"], "role": r["role"], "note": r["note"]} for r in q("SELECT * FROM persons WHERE case_id = ? ORDER BY rowid")],
        "relations": [{"a": r["a"], "b": r["b"], "type": r["type"]} for r in q("SELECT * FROM relations WHERE case_id = ? ORDER BY id")],
        "phones": [{"number": r["number"], "owner": r["owner"]} for r in q("SELECT * FROM phones WHERE case_id = ? ORDER BY rowid")],
        "calls": [{"from": r["from_number"], "to": r["to_number"], "time": r["time"], "secs": r["secs"], "tower": r["tower"]} for r in q("SELECT * FROM calls WHERE case_id = ? ORDER BY id")],
        "dna_profiles": {r["person_id"]: json.loads(r["profile_json"]) for r in q("SELECT * FROM dna_profiles WHERE case_id = ? ORDER BY rowid")},
        "evidence": evidence,
        "medical": {"victim": m["victim"], "cause": m["cause"], "time_of_death_window": [m["tod_start"], m["tod_end"]],
                    "injuries": json.loads(m["injuries_json"]), "toxicology": m["toxicology"], "note": m["note"]} if m else None,
        "statements": [{"id": r["id"], "person": r["person_id"], "text": r["text"]} for r in q("SELECT * FROM statements WHERE case_id = ? ORDER BY rowid")],
    }


def compare_dna(a, b):
    """Toy DNA comparison (simplified, not real forensic statistics).
    Returns 'full', 'partial-family' or 'none'."""
    full = sum(sorted(a[l]) == sorted(b[l]) for l in a if l in b)
    shared = sum(len(set(a[l]) & set(b[l])) >= 1 for l in a if l in b)
    n = len(a)
    if n and full == n and set(a) == set(b):
        return "full"
    if n and shared == n and set(a) == set(b):
        return "partial-family"
    return "none"


def dna_matches(case):
    """Compare every evidence DNA sample with every person's DNA profile."""
    out = []
    for e in case["evidence"]:
        if not e["dna"]:
            continue
        for pid, prof in case["dna_profiles"].items():
            verdict = compare_dna(e["dna"], prof)
            if verdict != "none":
                out.append({"evidence": e["id"], "person": pid, "match": verdict})
    return out


def build_graph(case):
    """People, phones and evidence as nodes; calls, relations and DNA as links."""
    nodes, edges = [], []
    for p in case["persons"]:
        nodes.append({"id": p["id"], "kind": "person", "label": p["name"], "role": p["role"]})
    for ph in case["phones"]:
        nodes.append({"id": ph["number"], "kind": "phone", "label": ph["number"]})
        edges.append({"source": ph["owner"], "target": ph["number"], "rel": "owns", "key": 0})
    for e in case["evidence"]:
        nodes.append({"id": e["id"], "kind": "evidence", "label": f'{e["id"]} {e["type"]}'})
    for r in case["relations"]:
        edges.append({"source": r["a"], "target": r["b"], "rel": r["type"], "key": 0})
        edges.append({"source": r["b"], "target": r["a"], "rel": r["type"], "key": 0})
    for c in case["calls"]:
        edges.append({"source": c["from"], "target": c["to"], "rel": "called", "time": c["time"], "tower": c["tower"], "secs": c["secs"], "key": 0})
    for m in dna_matches(case):
        edges.append({"source": m["evidence"], "target": m["person"], "rel": "dna-" + m["match"], "key": 0})
    return {"nodes": nodes, "edges": edges}


def get_clues(con, case_id):
    """Pinned extras (Instagram, letters, newspaper...), strings, notes and board positions."""
    items = []
    for r in con.execute("SELECT * FROM clues WHERE case_id = ? ORDER BY rowid", (case_id,)):
        item = {"id": r["id"], "type": r["type"], "name": r["name"]}
        item.update(json.loads(r["data_json"]))
        items.append(item)
    links = [[r["a"], r["b"], r["kind"], r["label"], r["dashed"]] for r in con.execute("SELECT * FROM links WHERE case_id = ? ORDER BY id", (case_id,))]
    leads = [{"sev": r["sev"], "title": r["title"], "why": json.loads(r["why_json"]), "nodes": json.loads(r["nodes_json"])}
             for r in con.execute("SELECT * FROM manual_leads WHERE case_id = ? ORDER BY id", (case_id,))]
    place = {r["item_id"]: [r["x"], r["y"], r["r"]] for r in con.execute("SELECT * FROM board_positions WHERE case_id = ?", (case_id,))}
    return {"items": items, "links": links, "leads": leads, "place": place}


def list_audit(con, case_id=None, limit=50):
    if case_id is None:
        rows = con.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?", (limit,))
    else:
        rows = con.execute("SELECT * FROM audit_log WHERE case_id = ? ORDER BY id DESC LIMIT ?", (case_id, limit))
    return [dict(r) for r in rows]


# ------------------------------------------------------------------ writing
def _next_id(con, table, case_id, prefix):
    nums = [int(r[0][len(prefix):]) for r in con.execute(f"SELECT id FROM {table} WHERE case_id = ?", (case_id,)) if r[0].startswith(prefix) and r[0][len(prefix):].isdigit()]
    return f"{prefix}{max(nums, default=0) + 1}"


def all_item_ids(con, case_id):
    ids = set()
    for table in ("persons", "evidence", "clues"):
        ids.update(r[0] for r in con.execute(f"SELECT id FROM {table} WHERE case_id = ?", (case_id,)))
    return ids


def _default_position(con, case_id, item_id):
    # new things land in the middle of the board; the investigator drags them where they belong
    con.execute("INSERT OR IGNORE INTO board_positions (case_id, item_id, x, y, r) VALUES (?,?,?,?,?)", (case_id, item_id, 720, 400, 0))


def add_person(con, case_id, name, role="unknown", note=""):
    if role not in ROLES:
        raise ValueError(f"role must be one of {ROLES}")
    pid = _next_id(con, "persons", case_id, "P")
    con.execute("INSERT INTO persons (id, case_id, name, role, note) VALUES (?,?,?,?,?)", (pid, case_id, name.strip(), role, note))
    _default_position(con, case_id, pid)
    audit(con, case_id, "add_person", pid, f"{name} ({role})")
    return pid


def add_evidence(con, case_id, type, found_at, collected_by, collected_at, custody=None, dna=None):
    eid = _next_id(con, "evidence", case_id, "E")
    con.execute("INSERT INTO evidence (id, case_id, type, found_at, collected_by, collected_at, dna_json) VALUES (?,?,?,?,?,?,?)",
                (eid, case_id, type, found_at, collected_by, collected_at, json.dumps(dna) if dna else None))
    for c in custody or []:
        con.execute("INSERT INTO custody (case_id, evidence_id, to_party, at) VALUES (?,?,?,?)", (case_id, eid, c["to"], c["at"]))
    _default_position(con, case_id, eid)
    audit(con, case_id, "add_evidence", eid, type)
    return eid


def add_statement(con, case_id, person_id, text):
    if con.execute("SELECT 1 FROM persons WHERE case_id = ? AND id = ?", (case_id, person_id)).fetchone() is None:
        raise ValueError(f"Unknown person {person_id}")
    sid = _next_id(con, "statements", case_id, "S")
    con.execute("INSERT INTO statements (id, case_id, person_id, text) VALUES (?,?,?,?)", (sid, case_id, person_id, text))
    audit(con, case_id, "add_statement", sid, f"by {person_id}")
    return sid


def add_clue(con, case_id, type, name, data=None):
    if type not in CLUE_TYPES:
        raise ValueError(f"clue type must be one of {CLUE_TYPES}")
    cid = _next_id(con, "clues", case_id, "C")
    con.execute("INSERT INTO clues (id, case_id, type, name, data_json) VALUES (?,?,?,?,?)", (cid, case_id, type, name, json.dumps(data or {})))
    _default_position(con, case_id, cid)
    audit(con, case_id, "add_clue", cid, f"{type}: {name}")
    return cid


def add_link(con, case_id, a, b, kind, label, dashed=False):
    if kind not in LINK_KINDS:
        raise ValueError(f"kind must be one of {LINK_KINDS}")
    ids = all_item_ids(con, case_id)
    for x in (a, b):
        if x not in ids:
            raise ValueError(f"Unknown item {x}")
    if a == b:
        raise ValueError("A string needs two different items")
    cur = con.execute("INSERT INTO links (case_id, a, b, kind, label, dashed) VALUES (?,?,?,?,?,?)", (case_id, a, b, kind, label, 1 if dashed else 0))
    audit(con, case_id, "add_link", f"{a}-{b}", label)
    return cur.lastrowid


def set_position(con, case_id, item_id, x, y, r=None):
    if item_id not in all_item_ids(con, case_id):
        raise ValueError(f"Unknown item {item_id}")
    old = con.execute("SELECT r FROM board_positions WHERE case_id = ? AND item_id = ?", (case_id, item_id)).fetchone()
    rot = r if r is not None else (old["r"] if old else 0)
    con.execute("INSERT INTO board_positions (case_id, item_id, x, y, r) VALUES (?,?,?,?,?) "
                "ON CONFLICT(case_id, item_id) DO UPDATE SET x = excluded.x, y = excluded.y, r = excluded.r", (case_id, item_id, x, y, rot))