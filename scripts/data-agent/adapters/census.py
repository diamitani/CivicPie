"""US Census Bureau API adapter.

SOURCE_ID: census
Feeds: population refresh for districts (states, congressional districts,
state legislative districts, counties, places).
Auth: CENSUS_API_KEY env var. As of 2026 the Census Data API REQUIRES a
key on every request (verified live 2026-09-18: keyless calls return a
"Missing Key" page instead of JSON). WITHOUT a key the adapter skips
cleanly with a logged warning — zero records, no fabrication.

Datasets used (with key):
  - 2020 Decennial PL (P1_001N total population) — congressional
    districts, state legislative districts (upper/lower), states, counties.
  - ACS 5-year (B01003_001E total population) — latest vintage for places
    and counties.

SCHEMA EXTENSION: district records gain a "population" field plus
"population_vintage" (e.g. "2020-dec-pl" / "acs5-2024") and
"population_source". record_type stays "district" per the PRD.

ctx targets (list of dicts): {'kind': 'state'|'congressional_district'|
'state_senate'|'state_house'|'county'|'place', 'state_fips': '17', ...}.
Defaults: all US states + Illinois congressional districts (cheap, keyed).
Chicago wards are NOT native census geographies — the adapter does not
invent ward populations; wards are skipped with a logged note.
"""

import logging
import os
import re
import time
from datetime import datetime, timezone

log = logging.getLogger(__name__)

SOURCE_ID = "census"
ENABLED = True
API_BASE = "https://api.census.gov/data"

DEC_PL_2020 = f"{API_BASE}/2020/dec/pl"
ACS5_LATEST = f"{API_BASE}/2024/acs/acs5"   # bump vintage when newer ships

STATE_FIPS = {
    "AL": "01", "AK": "02", "AZ": "04", "AR": "05", "CA": "06", "CO": "08",
    "CT": "09", "DE": "10", "DC": "11", "FL": "12", "GA": "13", "HI": "15",
    "ID": "16", "IL": "17", "IN": "18", "IA": "19", "KS": "20", "KY": "21",
    "LA": "22", "ME": "23", "MD": "24", "MA": "25", "MI": "26", "MN": "27",
    "MS": "28", "MO": "29", "MT": "30", "NE": "31", "NV": "32", "NH": "33",
    "NJ": "34", "NM": "35", "NY": "36", "NC": "37", "ND": "38", "OH": "39",
    "OK": "40", "OR": "41", "PA": "42", "RI": "44", "SC": "45", "SD": "46",
    "TN": "47", "TX": "48", "UT": "49", "VT": "50", "VA": "51", "WA": "53",
    "WV": "54", "WI": "55", "WY": "56", "PR": "72",
}

_UA = "CivicPieDataAgent/1.0 (civicpie.com; public-records research)"
_last_req = [0.0]


def _api_key(ctx):
    return (ctx or {}).get("census_api_key") or os.environ.get("CENSUS_API_KEY")


def _looks_like_key_error(body):
    return isinstance(body, str) and "Missing Key" in body


def _polite_get_json(url, params, timeout=30, min_gap=0.5):
    try:
        from .. import fetcher as _fw  # scripts/data-agent/fetcher.py
        if hasattr(_fw, "get_json"):
            return _fw.get_json(url, params=params, source_id=SOURCE_ID)
    except Exception:
        pass
    import requests
    gap = time.time() - _last_req[0]
    if gap < min_gap:
        time.sleep(min_gap - gap)
    resp = requests.get(url, params=params,
                        headers={"User-Agent": _UA}, timeout=timeout)
    _last_req[0] = time.time()
    ctype = resp.headers.get("Content-Type", "")
    if "json" not in ctype and _looks_like_key_error(resp.text):
        raise RuntimeError(
            f"{SOURCE_ID}: Census API now requires a key (got 'Missing Key' "
            "page). Set CENSUS_API_KEY to enable. Zero records emitted.")
    resp.raise_for_status()
    return resp.json()


def _rows(data):
    """Census JSON: [header, row, ...] -> [dict, ...]."""
    if not isinstance(data, list) or len(data) < 2:
        return []
    header, out = data[0], []
    for r in data[1:]:
        out.append(dict(zip(header, r)))
    return out


def _default_targets():
    t = [{"kind": "state", "state_abbr": abbr}
         for abbr in sorted(STATE_FIPS)]
    t.append({"kind": "congressional_district", "state_abbr": "IL"})
    t.append({"kind": "county", "state_abbr": "IL", "county_fips": "031"})
    t.append({"kind": "place", "state_abbr": "IL", "place_fips": "14000"})
    return t


def fetch_payload(ctx=None):
    """Returns {'rows': [{'target':..., 'name':..., 'population':int,
    'vintage':...}], 'vintage': ...}. Raises RuntimeError (skip) with no
    key."""
    ctx = ctx or {}
    key = _api_key(ctx)
    if not key:
        log.warning(
            "%s: CENSUS_API_KEY not set — Census API requires a key as of "
            "2026 (verified 'Missing Key' response). Skipping; zero records "
            "emitted.", SOURCE_ID)
        return {"rows": [], "skipped": "CENSUS_API_KEY not set"}
    targets = ctx.get("targets") or _default_targets()
    rows = []
    for t in targets:
        kind = t["kind"]
        fips = STATE_FIPS.get(t.get("state_abbr", "").upper())
        if not fips:
            log.warning("unknown state %r, skipping", t.get("state_abbr"))
            continue
        q = {"key": key}
        vintage = "2020-dec-pl"
        if kind == "state":
            url, q["get"] = DEC_PL_2020, "NAME,P1_001N"
            q.update({"for": f"state:{fips}"})
        elif kind == "congressional_district":
            url, q["get"] = DEC_PL_2020, "NAME,P1_001N"
            q.update({"for": "congressional district:*",
                      "in": f"state:{fips}"})
        elif kind == "state_senate":
            url, q["get"] = DEC_PL_2020, "NAME,P1_001N"
            q.update({"for": "state legislative district (upper chamber):*",
                      "in": f"state:{fips}"})
        elif kind == "state_house":
            url, q["get"] = DEC_PL_2020, "NAME,P1_001N"
            q.update({"for": "state legislative district (lower chamber):*",
                      "in": f"state:{fips}"})
        elif kind == "county":
            url, q["get"] = DEC_PL_2020, "NAME,P1_001N"
            if t.get("county_fips"):
                q.update({"for": f"county:{t['county_fips']}",
                          "in": f"state:{fips}"})
            else:
                q.update({"for": "county:*", "in": f"state:{fips}"})
        elif kind == "place":
            url, q["get"] = ACS5_LATEST, "NAME,B01003_001E"
            vintage = "acs5-2024"
            q.update({"for": f"place:{t['place_fips']}",
                      "in": f"state:{fips}"})
        elif kind == "ward":
            log.warning("wards are not native census geographies — "
                        "skipping %r (no invented data)", t)
            continue
        else:
            log.warning("unknown census target kind %r", kind)
            continue
        try:
            data = _polite_get_json(url, q)
        except Exception as exc:
            log.warning("census query failed for %r: %s", t, exc)
            continue
        pop_field = "P1_001N" if "P1_001N" in q["get"] else "B01003_001E"
        for r in _rows(data):
            try:
                pop = int(str(r.get(pop_field) or "").replace(",", ""))
            except ValueError:
                continue
            rows.append({"target": t, "name": r.get("NAME"),
                         "population": pop, "vintage": vintage,
                         "raw": r, "url": url})
    return {"rows": rows}


# ---------------------------------------------------------------- parse
def _scraped_at():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _district_id_for(t, raw):
    abbr = t.get("state_abbr", "").upper()
    kind = t["kind"]
    if kind == "state":
        return f"us-state-{abbr.lower()}"
    if kind == "congressional_district":
        cd = (raw.get("congressional district") or "").zfill(2)
        return f"us-{abbr.lower()}-cd-{cd}"
    if kind == "state_senate":
        d = re.sub(r"\D", "", raw.get(
            "state legislative district (upper chamber)", "") or "")
        return f"il-senate-{int(d):02d}" if d else None
    if kind == "state_house":
        d = re.sub(r"\D", "", raw.get(
            "state legislative district (lower chamber)", "") or "")
        return f"il-house-{int(d):03d}" if d else None
    if kind == "county":
        return f"us-{abbr.lower()}-county-{t.get('county_fips')}"
    if kind == "place":
        return None  # caller may map place->city externally
    return None


def parse(payload, ctx=None):
    records = []
    for r in payload.get("rows", []):
        t = r["target"]
        district_id = _district_id_for(t, r["raw"])
        slug = re.sub(r"[^a-z0-9]+", "-", (r["name"] or "").lower()
                      ).strip("-")[:50]
        records.append({
            "record_type": "district",
            "office_id": None,
            "district_id": district_id,
            "full_name": r["name"],
            "first_name": None, "last_name": None,
            "party": None,
            "is_incumbent": None,
            "term_start": None, "term_end": None,
            "contact": {"email": None, "phone": None, "website": None},
            "external_ids": {},
            # schema extension: census population refresh
            "population": r["population"],
            "population_vintage": r["vintage"],
            "population_source": "US Census Bureau",
            "source_id": SOURCE_ID,
            "source_key": f"{SOURCE_ID}:{r['vintage']}:{slug}",
            "source_url": r["url"],
            "scraped_at": _scraped_at(),
            "conflicts": [],
        })
    return records


def self_check():
    if _api_key({}):
        return {"skipped": False,
                "note": "CENSUS_API_KEY present; run fetch_payload"}
    try:
        fetch_payload({})
    except RuntimeError as exc:
        log.warning("skip check: %s", exc)
        return {"skipped": True, "records": 0, "note": str(exc)}
    raise AssertionError("expected skip without key")


if __name__ == "__main__":
    print(self_check())
