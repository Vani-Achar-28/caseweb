"""
Step 1A: create a FAKE (synthetic) murder case and save it as JSON.
Nothing here is real data. All names, numbers and DNA values are invented.

Run:  python generate_case.py
Output: data/case_001.json
"""
import json
from pathlib import Path

case = {
    "case_id": "CASE-001",
    "title": "Murder of Ravi Shetty, Indiranagar, Bengaluru (SYNTHETIC)",
    "incident_time_window": ["2026-03-14T21:30", "2026-03-14T23:00"],
    "scene": {"name": "Ravi's flat, Indiranagar", "tower": "TWR-INDIRA"},

    # ---------- PEOPLE ----------
    "persons": [
        {"id": "P1", "name": "Ravi Shetty",   "role": "victim",  "note": "Owner of a small electronics shop"},
        {"id": "P2", "name": "Anita Shetty",  "role": "family",  "note": "Wife of Ravi"},
        {"id": "P3", "name": "Suresh Rao",    "role": "suspect", "note": "Business partner, money dispute with Ravi"},
        {"id": "P4", "name": "Manoj Kumar",   "role": "suspect", "note": "Friend, owed Ravi Rs 4 lakh"},
        {"id": "P5", "name": "Kiran Gowda",   "role": "witness", "note": "Neighbour, heard shouting"},
        {"id": "P6", "name": "Deepak Naik",   "role": "unknown", "note": "Appears only in phone records"},
    ],
    # family / known relationships (kinship matters for partial DNA matches)
    "relations": [
        {"a": "P1", "b": "P2", "type": "spouse"},
        {"a": "P3", "b": "P6", "type": "brother"},
        {"a": "P4", "b": "P3", "type": "friend"},
    ],

    # ---------- PHONES ----------
    "phones": [
        {"number": "98450-11111", "owner": "P1"},
        {"number": "98450-22222", "owner": "P2"},
        {"number": "98450-33333", "owner": "P3"},
        {"number": "98450-44444", "owner": "P4"},
        {"number": "98450-55555", "owner": "P5"},
        {"number": "98450-66666", "owner": "P6"},
    ],
    # call detail records: who called whom, when, how long, tower of the caller
    "calls": [
        {"from": "98450-44444", "to": "98450-11111", "time": "2026-03-14T20:05", "secs": 240, "tower": "TWR-KORAMANGALA"},
        {"from": "98450-33333", "to": "98450-11111", "time": "2026-03-14T20:40", "secs": 610, "tower": "TWR-WHITEFIELD"},
        {"from": "98450-44444", "to": "98450-66666", "time": "2026-03-14T21:10", "secs": 95,  "tower": "TWR-KORAMANGALA"},
        {"from": "98450-66666", "to": "98450-33333", "time": "2026-03-14T21:20", "secs": 120, "tower": "TWR-INDIRA"},
        {"from": "98450-44444", "to": "98450-11111", "time": "2026-03-14T22:15", "secs": 20,  "tower": "TWR-INDIRA"},
        {"from": "98450-33333", "to": "98450-66666", "time": "2026-03-14T23:20", "secs": 300, "tower": "TWR-WHITEFIELD"},
        {"from": "98450-22222", "to": "98450-11111", "time": "2026-03-14T23:45", "secs": 0,   "tower": "TWR-JAYANAGAR"},
    ],

    # ---------- DNA PROFILES (toy: 5 loci, 2 alleles each) ----------
    "dna_profiles": {
        "P1": {"L1": [12, 14], "L2": [8, 9],  "L3": [15, 17], "L4": [21, 22], "L5": [6, 7]},
        "P3": {"L1": [11, 13], "L2": [9, 10], "L3": [16, 18], "L4": [20, 23], "L5": [7, 9]},
        "P4": {"L1": [10, 16], "L2": [8, 11], "L3": [15, 19], "L4": [22, 24], "L5": [6, 8]},
        # Deepak is Suresh's brother, so he shares at least one allele at every locus
        "P6": {"L1": [11, 15], "L2": [10, 12], "L3": [16, 20], "L4": [23, 25], "L5": [7, 10]},
    },

    # ---------- EVIDENCE (with chain of custody) ----------
    "evidence": [
        {"id": "E1", "type": "blood stain", "found_at": "living room floor",
         "collected_by": "SI Prakash", "collected_at": "2026-03-15T02:10",
         "custody": [{"to": "FSL Bengaluru", "at": "2026-03-15T09:00"}],
         "dna": {"L1": [12, 14], "L2": [8, 9], "L3": [15, 17], "L4": [21, 22], "L5": [6, 7]}},
        {"id": "E2", "type": "kitchen knife (handle swab)", "found_at": "balcony, behind plant pot",
         "collected_by": "SI Prakash", "collected_at": "2026-03-15T02:40",
         "custody": [{"to": "FSL Bengaluru", "at": "2026-03-15T09:00"}],
         "dna": {"L1": [10, 16], "L2": [8, 11], "L3": [15, 19], "L4": [22, 24], "L5": [6, 8]}},
        {"id": "E3", "type": "hair strand", "found_at": "victim's hand",
         "collected_by": "SI Prakash", "collected_at": "2026-03-15T02:55",
         "custody": [],   # <-- chain of custody gap, on purpose (a future feature will flag this)
         "dna": {"L1": [11, 15], "L2": [10, 12], "L3": [16, 20], "L4": [23, 25], "L5": [7, 10]}},
        {"id": "E4", "type": "CCTV clip (street camera)", "found_at": "Indiranagar 1st Main",
         "collected_by": "HC Latha", "collected_at": "2026-03-15T11:00",
         "custody": [{"to": "Cyber cell", "at": "2026-03-15T15:00"}], "dna": None},
    ],

    # ---------- MEDICAL / POST-MORTEM ----------
    "medical": {
        "victim": "P1",
        "cause": "Multiple stab wounds to chest and abdomen",
        "time_of_death_window": ["2026-03-14T21:30", "2026-03-14T23:00"],
        "injuries": ["3 stab wounds, chest", "1 stab wound, abdomen", "defensive cut, left palm"],
        "toxicology": "No alcohol or drugs detected",
        "note": "Defensive wound suggests victim struggled with attacker.",
    },

    # ---------- STATEMENTS / SITE VISIT NOTES ----------
    "statements": [
        {"id": "S1", "person": "P4", "text": "I was at home in Koramangala all evening. I did not go to Ravi's flat."},
        {"id": "S2", "person": "P3", "text": "I was at my Whitefield office until midnight."},
        {"id": "S3", "person": "P5", "text": "Around 10 pm I heard two men shouting in Ravi's flat. One voice sounded like Manoj."},
        {"id": "S4", "person": "P2", "text": "I was at my mother's house in Jayanagar. I called Ravi at 11:45 pm and he did not answer."},
    ],
}

if __name__ == "__main__":
    out = Path("data")
    out.mkdir(exist_ok=True)
    (out / "case_001.json").write_text(json.dumps(case, indent=2))
    print("Created data/case_001.json")