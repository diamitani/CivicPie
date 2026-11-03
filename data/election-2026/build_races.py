#!/usr/bin/env python3
"""Build data/seed/election_2026_races.json from the raw Wikipedia snapshots.

Sources (scraped 2026-11-03 via Firecrawl, saved verbatim in ./raw):
  raw/senate.md    https://en.wikipedia.org/wiki/2026_United_States_Senate_elections
  raw/governor.md  https://en.wikipedia.org/wiki/2026_United_States_gubernatorial_elections
  raw/house.md     https://en.wikipedia.org/wiki/2026_United_States_House_of_Representatives_elections

Run:  python3 data/election-2026/build_races.py
The script is deterministic: same raw files in -> same JSON out. It fails loudly
if race counts don't match the known totals (35 Senate, 36 governor, 435 House).
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
RAW = HERE / "raw"
OUT = HERE.parent / "seed" / "election_2026_races.json"

STATES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH",
    "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC",
    "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA",
    "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN",
    "Texas": "TX", "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
}
STATE_NAMES = sorted(STATES, key=len, reverse=True)  # longest first: "West Virginia" before "Virginia"

LINK = re.compile(r'\[([^\]]*)\]\((https?://[^\s()]+(?:\([^\s()]*\)[^\s()]*)*)(?:\s+"[^"]*")?\)(?:\s*"[^"]*"\))?')
FOOTNOTE = re.compile(r'\[\\\[[^\]]*\\\]\]\([^)]*\)')


def strip_md(s: str) -> str:
    s = FOOTNOTE.sub("", s)
    s = LINK.sub(lambda m: m.group(1), s)
    s = s.replace("\\", "")
    return re.sub(r"\s+", " ", s).strip()


def parse_candidates(cell: str):
    """'- ▌ [Name](url) (Party)<br>- ▌Name (Party)' -> [{name, party, wiki}]"""
    out = []
    for part in cell.split("<br>"):
        part = part.strip()
        if "▌" not in part:
            continue
        part = FOOTNOTE.sub("", part.split("▌", 1)[1].lstrip("▌ ")).strip()  # fusion states draw several ▌ bars
        wiki = None
        m = LINK.match(part)
        if m:
            name = m.group(1).strip()
            if "en.wikipedia.org/wiki/" in m.group(2):
                wiki = m.group(2)
            rest = part[m.end():]
        else:
            pm = re.match(r"(.+?)\s*(\([^()]*\))\s*$", part)
            name, rest = (pm.group(1), pm.group(2)) if pm else (part, "")
        name = strip_md(name)
        parties = re.findall(r"\(([^()]*)\)", strip_md(rest))
        party = parties[-1].strip() if parties else None
        if party and party.lower() == "write-in":
            party = "Write-in"
        if not name:
            continue
        out.append({"name": name, "party": party, "wiki": wiki})
    return out


def rows(md: str):
    for line in md.split("\n"):
        if line.startswith("| ") and "▌" in line:
            yield [c.strip() for c in line.strip().strip("|").split(" | ")]


def leading_state(cell: str):
    txt = strip_md(cell)
    for n in STATE_NAMES:
        if txt.startswith(n):
            return n, txt[len(n):].strip()
    return None, txt


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


def cell_wiki(cell: str):
    m = LINK.search(FOOTNOTE.sub("", cell))
    return m.group(2) if m and "en.wikipedia.org/wiki/" in m.group(2) else None


def mark_incumbent(cands, incumbent_name, incumbent_wiki=None):
    """Flag the sitting officeholder among the candidates.

    1. If a candidate links to the same Wikipedia article as the incumbent, that is the
       incumbent (and nobody else) - this handles same-name candidates such as
       Alaska's two Dan Sullivans.
    2. Otherwise fall back to the name: exact (accent-insensitive) match, or same
       first + last token ("Frank J. Mrvan" == "Frank Mrvan").
    """
    for c in cands:
        c["incumbent"] = False
    if not incumbent_name:
        return
    if incumbent_wiki:
        linked = [c for c in cands if c.get("wiki") == incumbent_wiki]
        if linked:
            for c in linked:
                c["incumbent"] = True
            return
    inc = norm(incumbent_name)
    ic = incumbent_name.split()
    for c in cands:
        cn = c["name"].split()
        c["incumbent"] = norm(c["name"]) == inc or (
            len(cn) > 1 and len(ic) > 1 and norm(cn[0]) == norm(ic[0]) and norm(cn[-1]) == norm(ic[-1]))


def statewide(md: str, office: str, header_marker: str):
    races = []
    start = md.find(header_marker)
    if start < 0:
        sys.exit(f"{office}: header not found")
    for cells in rows(md[start:]):
        st, extra = leading_state(cells[0])
        if not st:
            continue
        cands = parse_candidates(cells[-1])
        if not cands:
            continue
        # Incumbent column: Senate tables have PVI in col 1; governor tables don't.
        inc_cell = cells[2] if office == "senate" else cells[1]
        incumbent = strip_md(inc_cell)
        status = strip_md(cells[-2])
        mark_incumbent(cands, incumbent, cell_wiki(inc_cell))
        special = "Class 3" in cells[0] and office == "senate"
        races.append({
            "state": STATES[st],
            "office": "U.S. Senate" if office == "senate" else "Governor",
            "special": special,
            "incumbent": incumbent,
            "status": status,
            "candidates": cands,
        })
    return races


def house(md: str):
    races = []
    start = md.find("| District | Incumbent | Candidates")
    for cells in rows(md[start:]):
        st, rest = leading_state(cells[0])
        if not st:
            continue
        rest = rest.lower()
        if "at-large" in rest or "atlarge" in rest:
            dist = 0
        else:
            dm = re.match(r"(\d+)", rest)
            if not dm:
                continue
            dist = int(dm.group(1))
        cands = parse_candidates(cells[-1])
        incumbent = strip_md(cells[2]) if len(cells) >= 7 else None
        if incumbent and incumbent.lower().startswith("none"):
            incumbent = None
        status = strip_md(cells[-2])
        mark_incumbent(cands, incumbent, cell_wiki(cells[2]) if incumbent else None)
        races.append({
            "state": STATES[st],
            "district": dist,
            "office": "U.S. House",
            "incumbent": incumbent,
            "status": status,
            "candidates": cands,
        })
    return races


def main():
    senate = statewide((RAW / "senate.md").read_text(), "senate", "| Constituency | Incumbent | Status | Candidates")
    gov = statewide((RAW / "governor.md").read_text(), "governor", "| State | Governor | Party")
    hs = house((RAW / "house.md").read_text())

    # Dedupe House (the page ends with a "This race" summary table that repeats some rows).
    seen, hs2 = set(), []
    for r in hs:
        k = (r["state"], r["district"])
        if k in seen:
            continue
        seen.add(k)
        hs2.append(r)
    hs = hs2

    problems = []
    if len(senate) != 35:
        problems.append(f"senate races = {len(senate)} (expected 35)")
    if len(gov) != 36:
        problems.append(f"governor races = {len(gov)} (expected 36)")
    if len(hs) != 435:
        problems.append(f"house races = {len(hs)} (expected 435)")
    for r in senate + gov + hs:
        for c in r["candidates"]:
            if not c["party"]:
                problems.append(f"no party: {r['state']} {r['office']} {r.get('district','')} {c['name']}")
    if problems:
        print("\n".join(problems))
        if any("expected" in p for p in problems):
            sys.exit(1)

    out = {
        "meta": {
            "election_date": "2026-11-03",
            "generated": "2026-11-03",
            "sources": [
                {"office": "U.S. Senate", "url": "https://en.wikipedia.org/wiki/2026_United_States_Senate_elections"},
                {"office": "Governor", "url": "https://en.wikipedia.org/wiki/2026_United_States_gubernatorial_elections"},
                {"office": "U.S. House", "url": "https://en.wikipedia.org/wiki/2026_United_States_House_of_Representatives_elections"},
            ],
            "note": "General-election candidates as listed on Wikipedia on Nov 3, 2026 (CC BY-SA 4.0). "
                    "Official ballots are certified by each state; always confirm with your sample ballot.",
            "counts": {"senate": len(senate), "governor": len(gov), "house": len(hs),
                       "candidates": sum(len(r["candidates"]) for r in senate + gov + hs)},
        },
        "senate": senate,
        "governor": gov,
        "house": hs,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(json.dumps(out["meta"]["counts"]))


if __name__ == "__main__":
    main()
