"""FEC (Federal Election Commission) API adapter.

SOURCE_ID: fec
Feeds: federal candidates/committees (official FEC records).
Auth: FEC_API_KEY env var. SKIPPED CLEANLY (logged warning, zero records)
when the key is absent — per PRD. (FEC_API_KEY was not present in the
Drive api-keys sheet as of 2026-09-18.)

Docs: https://api.open.fec.gov/developers/
Rate limit: 1000 requests/hour per key. This adapter pages politely
(~1s between pages) and stops at ctx['max_pages'] (default 10).

Party affiliation: emitted only because the FEC, an official source,
states it per candidate (allowed under the nonpartisan rule).
"""

import logging
import os
import time
from datetime import datetime, timezone

log = logging.getLogger(__name__)

SOURCE_ID = "fec"
ENABLED = True
API_BASE = "https://api.open.fec.gov/v1"

OFFICE_MAP = {"H": "us-house", "S": "us-senate", "P": "us-president"}

_UA = "CivicPieDataAgent/1.0 (civicpie.com; public-records research)"
_last_req = [0.0]


def _api_key(ctx):
    return (ctx or {}).get("fec_api_key") or os.environ.get("FEC_API_KEY")


def _polite_get_json(url, params, timeout=30, min_gap=1.0):
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
    resp.raise_for_status()
    return resp.json()


def fetch_payload(ctx=None):
    """ctx filters: office ('H'|'S'|'P'), state (e.g. 'IL'), district,
    cycle (e.g. 2026), q (name search), candidate_id, max_pages.

    Returns {'candidates': [...], 'query': {...}}.
    Raises RuntimeError when no API key is available (adapter skips)."""
    ctx = ctx or {}
    key = _api_key(ctx)
    if not key:
        raise RuntimeError(
            f"{SOURCE_ID}: FEC_API_KEY not set — skipping (no key in env; "
            "not present in the api-keys sheet). Zero records emitted.")

    query = {"api_key": key, "per_page": 100}
    if ctx.get("candidate_id"):
        path, query = f"/candidate/{ctx['candidate_id']}/", query
        data = _polite_get_json(API_BASE + path, query)
        cands = data.get("results", [])
    else:
        for f in ("office", "state", "district", "cycle", "q", "party"):
            if ctx.get(f):
                query[f] = ctx[f]
        cands, page, max_pages = [], 1, int(ctx.get("max_pages", 10))
        while page <= max_pages:
            query["page"] = page
            data = _polite_get_json(API_BASE + "/candidates/", query)
            results = data.get("results", [])
            cands.extend(results)
            pages = (data.get("pagination") or {}).get("pages", 1)
            if page >= pages or not results:
                break
            page += 1
    return {"candidates": cands, "query": {k: v for k, v in query.items()
                                           if k != "api_key"}}


# ---------------------------------------------------------------- parse
def _scraped_at():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _district_id(c):
    office, state = c.get("office"), c.get("state")
    dist = str(c.get("district") or "").zfill(2)
    if office == "H" and state and dist and dist != "00":
        return f"us-{state.lower()}-cd-{dist}"
    if office == "S" and state:
        return f"us-{state.lower()}-senate"
    if office == "P":
        return "us-president"
    return None


def parse(payload, ctx=None):
    records = []
    for c in payload.get("candidates", []):
        if not isinstance(c, dict):
            continue
        cid = c.get("candidate_id")
        if not cid:
            continue
        office = c.get("office")
        party = (c.get("party") or "").strip() or None
        records.append({
            "record_type": "official",
            "office_id": OFFICE_MAP.get(office, "us-federal"),
            "district_id": _district_id(c),
            "full_name": c.get("name"),
            "first_name": None, "last_name": None,
            "party": party,  # official FEC record; allowed by nonpartisan rule
            "is_incumbent": {"I": True, "C": False, "O": None}.get(
                c.get("incumbent_challenge")),
            "term_start": None, "term_end": None,
            "contact": {"email": None, "phone": None, "website": None},
            "external_ids": {"fec_candidate_id": cid,
                             "fec_cycles": c.get("cycles")},
            "source_id": SOURCE_ID,
            "source_key": f"{SOURCE_ID}:candidate:{cid}",
            "source_url": (f"https://www.fec.gov/data/candidate/{cid}/"
                           f"?cycle={c.get('election_years', [''])[-1]}"
                           if c.get("election_years") else
                           f"https://www.fec.gov/data/candidate/{cid}/"),
            "scraped_at": _scraped_at(),
            "conflicts": [],
        })
    return records


def self_check():
    """Proves the skip path when no key is configured."""
    if _api_key({}):
        return {"skipped": False,
                "note": "FEC_API_KEY present; run fetch_payload to QA live"}
    try:
        fetch_payload({})
    except RuntimeError as exc:
        log.warning("skip check: %s", exc)
        return {"skipped": True, "records": 0, "note": str(exc)}
    raise AssertionError("expected skip without key")


if __name__ == "__main__":
    print(self_check())
