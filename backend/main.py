"""
CaseWeb API (FastAPI).

Run it (from inside the backend folder) with:   uvicorn main:app --reload
Then open:     http://127.0.0.1:8000/docs     (automatic API page where you can try every endpoint)
"""
import os
from contextlib import asynccontextmanager
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

import db
import kv


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()          # create tables and load the demo case the first time
    kv.init()             # table for the React app's saved cases
    yield


app = FastAPI(
    title="CaseWeb API",
    description="Evidence board backend: people, evidence, clues, strings and an audit log.",
    version="0.1.0",
    lifespan=lifespan,
)

# The React app runs on another address (localhost:5173), so the browser needs permission to call this API.
# When we deploy, set the CORS_ORIGINS environment variable to the real website address.
ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(CORSMiddleware, allow_origins=ORIGINS, allow_methods=["*"], allow_headers=["*"])


# ---------------------------------------------------------------- request shapes
class PersonIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    role: Literal["victim", "suspect", "witness", "family", "unknown"] = "unknown"
    note: str = Field(default="", max_length=300)


class CustodyIn(BaseModel):
    to: str = Field(min_length=1)
    at: str = Field(description="Date and time, for example 2026-03-15T09:00")


class EvidenceIn(BaseModel):
    type: str = Field(min_length=1, max_length=120)
    found_at: str = Field(min_length=1, max_length=200)
    collected_by: str = Field(min_length=1, max_length=80)
    collected_at: str = Field(description="For example 2026-03-15T02:10")
    custody: list[CustodyIn] = []
    dna: Optional[dict[str, list[int]]] = Field(default=None, description='For example {"L1": [12, 14], "L2": [8, 9]}')


class StatementIn(BaseModel):
    person: str = Field(description="Person id, for example P4")
    text: str = Field(min_length=1, max_length=1000)


class ClueIn(BaseModel):
    type: Literal["ig", "news", "letter", "ransom", "bank", "sticky"]
    name: str = Field(min_length=1, max_length=120)
    data: dict = Field(default_factory=dict, description="Extra fields for this clue type, for example caption, text, head, body")


class LinkIn(BaseModel):
    a: str
    b: str
    kind: Literal["red", "black", "gold", "white"]
    label: str = Field(min_length=1, max_length=80)
    dashed: bool = False


class KvIn(BaseModel):
    key: str = Field(min_length=1, max_length=200, description='For example "caseweb.c.demo.data"')
    value: str = Field(description="The saved document, as text (JSON)")


class PositionIn(BaseModel):
    x: float = Field(ge=0, le=1440)
    y: float = Field(ge=0, le=800)
    r: Optional[float] = Field(default=None, ge=-30, le=30)


def need_case(con, case_id: int):
    if not db.case_exists(con, case_id):
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")


def bad(e: Exception):
    return HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------- reading
@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok"}


@app.get("/api/cases", tags=["cases"])
def cases():
    with db.connect() as con:
        return db.list_cases(con)


@app.get("/api/cases/{case_id}", tags=["cases"])
def case_document(case_id: int):
    """Everything about one case: people, phones, calls, DNA, evidence, statements, post-mortem."""
    with db.connect() as con:
        need_case(con, case_id)
        return db.get_case(con, case_id)


@app.get("/api/cases/{case_id}/graph", tags=["cases"])
def case_graph(case_id: int):
    """Nodes and links, with DNA matches worked out by the backend."""
    with db.connect() as con:
        need_case(con, case_id)
        return db.build_graph(db.get_case(con, case_id))


@app.get("/api/cases/{case_id}/dna", tags=["cases"])
def case_dna(case_id: int):
    """Which evidence matches which person, fully or as a relative."""
    with db.connect() as con:
        need_case(con, case_id)
        return db.dna_matches(db.get_case(con, case_id))


@app.get("/api/cases/{case_id}/clues", tags=["cases"])
def case_clues(case_id: int):
    """Instagram posts, letters, newspaper clippings, strings, notes and where things sit on the board."""
    with db.connect() as con:
        need_case(con, case_id)
        return db.get_clues(con, case_id)


@app.get("/api/cases/{case_id}/board", tags=["cases"])
def case_board(case_id: int):
    """One call with everything the corkboard page needs."""
    with db.connect() as con:
        need_case(con, case_id)
        case = db.get_case(con, case_id)
        return {"case": case, "graph": db.build_graph(case), "dna": db.dna_matches(case), "clues": db.get_clues(con, case_id)}


@app.get("/api/audit", tags=["audit"])
def audit_log(case_id: Optional[int] = None, limit: int = 50):
    """Who changed what, newest first."""
    with db.connect() as con:
        return db.list_audit(con, case_id, min(max(limit, 1), 500))


# ---------------------------------------------------------------- writing
@app.post("/api/cases/{case_id}/persons", status_code=201, tags=["add"])
def add_person(case_id: int, body: PersonIn):
    with db.connect() as con:
        need_case(con, case_id)
        return {"id": db.add_person(con, case_id, body.name, body.role, body.note)}


@app.post("/api/cases/{case_id}/evidence", status_code=201, tags=["add"])
def add_evidence(case_id: int, body: EvidenceIn):
    with db.connect() as con:
        need_case(con, case_id)
        eid = db.add_evidence(con, case_id, body.type, body.found_at, body.collected_by, body.collected_at,
                              [c.model_dump() for c in body.custody], body.dna)
        return {"id": eid, "dna": db.dna_matches(db.get_case(con, case_id))}


@app.post("/api/cases/{case_id}/statements", status_code=201, tags=["add"])
def add_statement(case_id: int, body: StatementIn):
    with db.connect() as con:
        need_case(con, case_id)
        try:
            return {"id": db.add_statement(con, case_id, body.person, body.text)}
        except ValueError as e:
            raise bad(e)


@app.post("/api/cases/{case_id}/clues", status_code=201, tags=["add"])
def add_clue(case_id: int, body: ClueIn):
    with db.connect() as con:
        need_case(con, case_id)
        try:
            return {"id": db.add_clue(con, case_id, body.type, body.name, body.data)}
        except ValueError as e:
            raise bad(e)


@app.post("/api/cases/{case_id}/links", status_code=201, tags=["add"])
def add_link(case_id: int, body: LinkIn):
    """Tie a string between two pinned items."""
    with db.connect() as con:
        need_case(con, case_id)
        try:
            return {"id": db.add_link(con, case_id, body.a, body.b, body.kind, body.label, body.dashed)}
        except ValueError as e:
            raise bad(e)


@app.put("/api/cases/{case_id}/positions/{item_id}", tags=["board"])
def move_item(case_id: int, item_id: str, body: PositionIn):
    """Remember where an item was dragged to on the board."""
    with db.connect() as con:
        need_case(con, case_id)
        try:
            db.set_position(con, case_id, item_id, body.x, body.y, body.r)
        except ValueError as e:
            raise bad(e)
        return {"ok": True}


# ---------------------------------------------------------------- saved cases of the React app
@app.get("/api/kv", tags=["workspace"])
def workspace_all():
    """Every saved document, as {key: value}. The React app loads this when it starts."""
    with db.connect() as con:
        return kv.list_all(con)


@app.put("/api/kv", tags=["workspace"])
def workspace_put(body: KvIn):
    """Save (or replace) one document."""
    with db.connect() as con:
        try:
            kv.put(con, body.key, body.value)
        except ValueError as e:
            raise bad(e)
        except OverflowError as e:
            raise HTTPException(status_code=413, detail=str(e))
        return {"ok": True}


@app.delete("/api/kv", tags=["workspace"])
def workspace_delete(key: str):
    """Forget one document."""
    with db.connect() as con:
        try:
            return {"deleted": kv.delete(con, key)}
        except ValueError as e:
            raise bad(e)


# ---------------------------------------------------------------- home
@app.get("/", include_in_schema=False)
def home():
    """Opening the plain address sends you to the API page."""
    return RedirectResponse("/docs")