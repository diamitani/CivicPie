"""OpenStates API adapter.

SOURCE_ID: openstates
Feeds: state legislators (Illinois by default) — official legislative
records via the OpenStates v3 API.
Auth: OPENSTATES_API_KEY env var, sent as ?apikey or X-API-KEY.
SKIPPED CLEANLY (logged warning, zero records) when the key is absent —
per PRD. (OPENSTATES_API_KEY was not present in the Drive api-keys
sheet as of 2026-09-18.)

Docs: https://openstates.org/api/ (v3.openstates.org)
Rate limit: 5 req/sec on paid tiers; this adapter stays well under that.
"""

import logging
import os
import time
from datetime import datetime, timezone

log = logging.getLogger(__name__)

SOURCE_ID = "openstates"
ENABLED = True
API_BASE = "https://v3.openstates.org"

_UA = "CivicPieDataAgent/1.0 (civicpie.com; public-records research)"
_last_req = [0.0]


def _api_key(ctx):
    return (ctx or {}).get("openstates_api_key") or \
        os.environ.get("OPENSTATES_API_KEY")


def _polite_get_json(url, params, key, timeout=30, min_gap=0.5):
    try:
        from .. import fetcher as _fw  # scripts/data-agent/fetcher.py
        if hasattr(_fw, "get_json"):
            return _fw.get_json(url, params={**params, "apikey": key},
                                source_id=SOURCE_ID)
    except Exception:
        pass
    import requests
    gap = time.time() - _last_req[0]
    if gap < min_gap:
        time.sleep(min_gap - gap)
    resp = requests.get(url, params={**params, "apikey": key},
                        headers={"User-Agent": _UA}, timeout=timeout)
    _last_req[0] = time.time()
    if resp.status_code == 403:
        raise RuntimeError(
            f"{SOURCE_ID}: API key rejected (403) — check OPENSTATES_API_KEY")
    resp.raise_for_status()
    return resp.json()


def fetch_payload(ctx=None):
    """ctx: jurisdiction (default 'Illinois'), chamber ('upper'|'lower'),
    per_page (default 50), max_pages (default 20).

    Returns {'people': [...]}. Raises RuntimeError when no key (skip)."""
    ctx = ctx or {}
    key = _api_key(ctx)
    if not key:
        raise RuntimeError(
            f"{SOURCE_ID}: OPENSTATES_API_KEY not set — skipping (no key "
            "in env; not present in the api-keys sheet). Zero records.")
    params = {"jurisdiction": ctx.get("jurisdiction", "Illinois"),
              "per_page": int(ctx.get("per_page", 50))}
    if ctx.get("chamber"):
        params["chamber"] = ctx["chamber"]
    people, page, max_pages = [], 1, int(ctx.get("max_pages", 20))
    while page <= max_pages:
        params["page"] = page
        data = _polite_get_json(f"{API_BASE}/people", params, key)
        results = data.get("results", [])
        people.extend(results)
        if len(results) < params["per_page"] or not results:
            break
        page += 1
    return {"people": people, "jurisdiction": params["jurisdiction"]}


# ---------------------------------------------------------------- parse
def _scraped_at():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _office_and_district(p):
    chamber = (p.get("current_role") or {}).get("chamber") or \
        (p.get("current_role") or {}).get("org_classification")
    district = (p.get("current_role") or {}).get("district") or ""
    chamber = (chamber or "").lower()
    dnum = "".join(ch for ch in str(district) if ch.isdigit())
    if "upper" in chamber or "senate" in chamber:
        return "il-senator", (f"il-senate-{int(dnum):02d}" if dnum else None)
    if "lower" in chamber or "house" in chamber:
        return "il-representative", (f"il-house-{int(dnum):03d}"
                                     if dnum else None)
    return "il-legislator", None


def parse(payload, ctx=None):
    records = []
    for p in payload.get("people", []):
        if not isinstance(p, dict) or not p.get("id"):
            continue
        office_id, district_id = _office_and_district(p)
        name = p.get("name") or ""
        parts = name.split()
        party = (p.get("party") or "").strip() or None
        records.append({
            "record_type": "official",
            "office_id": office_id,
            "district_id": district_id,
            "full_name": name,
            "first_name": parts[0] if parts else None,
            "last_name": parts[-1] if len(parts) > 1 else None,
            "party": party,  # OpenStates official record; allowed
            "is_incumbent": True,
            "term_start": None, "term_end": None,
            "contact": {"email": None, "phone": None, "website": None},
            "external_ids": {"openstates_person_id": p.get("id")},
            "source_id": SOURCE_ID,
            "source_key": f"{SOURCE_ID}:person:{p['id']}",
            "source_url": (f"https://openstates.org/person/{p['id']}/"
                           if p.get("id") else API_BASE),
            "scraped_at": _scraped_at(),
            "conflicts": [],
        })
    return records


def self_check():
    if _api_key({}):
        return {"skipped": False,
                "note": "OPENSTATES_API_KEY present; run fetch_payload"}
    try:
        fetch_payload({})
    except RuntimeError as exc:
        log.warning("skip check: %s", exc)
        return {"skipped": True, "records": 0, "note": str(exc)}
    raise AssertionError("expected skip without key")


if __name__ == "__main__":
    print(self_check())
