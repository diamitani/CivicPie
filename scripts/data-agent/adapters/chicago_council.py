"""Chicago City Council official adapter.

SOURCE_ID: chicago-council-official
Feeds: 50 aldermen (names, wards, photos, contact) + committee rosters.
Auth: none. Official sources:
  - City Clerk eLMS public API (api.chicityclerkelms.chicago.gov) for
    people (isActive + numeric ward => sitting aldermen) and bodies
    (committees with embedded members). This is the authoritative,
    machine-readable City of Chicago source.
  - chicago.gov ward pages (city/en/about/wards/NN.html) for ward-office
    contact detail; cross-checked against eLMS, differences land in
    `conflicts`, never silently resolved.

Contract: parse(payload, ctx) -> list[dict] in the PRD section-3 record
schema. Every record carries source_url + scraped_at; stable source_key.
"""

import html
import json
import logging
import re
import time
from datetime import datetime, timezone

log = logging.getLogger(__name__)

SOURCE_ID = "chicago-council-official"
ENABLED = True
OFFICE_ID = "chi-alderman"

ELMS_PERSON_URL = "https://api.chicityclerkelms.chicago.gov/person?top=200"
ELMS_BODY_URL = "https://api.chicityclerkelms.chicago.gov/body?top=200"
WARD_PAGE_URL = "https://www.chicago.gov/city/en/about/wards/{ward:02d}.html"

_UA = "CivicPieDataAgent/1.0 (civicpie.com; public-records research)"
_last_req = [0.0]


# ---------------------------------------------------------------- fetch
def _polite_get(url, timeout=30, min_gap=0.6):
    """Plain-requests fallback with rate limiting. Framework fetcher is
    preferred when importable (sibling-owned); this keeps the adapter
    self-contained."""
    try:
        from .. import fetcher as _fw  # scripts/data-agent/fetcher.py
        if hasattr(_fw, "get"):
            return _fw.get(url, source_id=SOURCE_ID)
    except Exception:
        pass
    import requests
    gap = time.time() - _last_req[0]
    if gap < min_gap:
        time.sleep(min_gap - gap)
    resp = requests.get(url, headers={"User-Agent": _UA, "Accept": "*/*"},
                        timeout=timeout)
    _last_req[0] = time.time()
    resp.raise_for_status()
    return resp.text


def fetch_payload(ctx=None):
    """Return {'persons': [...], 'bodies': [...], 'ward_pages': {nn: html}}.

    ward_pages fetched for all 50 wards by default; pass
    ctx={'ward_sample': [1, 48]} to limit (faster QA runs).
    """
    ctx = ctx or {}
    persons = json.loads(_polite_get(ELMS_PERSON_URL))
    bodies = json.loads(_polite_get(ELMS_BODY_URL))
    wards = ctx.get("ward_sample") or list(range(1, 51))
    ward_pages = {}
    for nn in wards:
        try:
            ward_pages[nn] = _polite_get(WARD_PAGE_URL.format(ward=nn))
        except Exception as exc:  # keep going; ward pages are supplemental
            log.warning("ward page %02d fetch failed: %s", nn, exc)
    return {"persons": persons, "bodies": bodies, "ward_pages": ward_pages}


# ---------------------------------------------------------------- helpers
def _scraped_at():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _strip(text):
    text = html.unescape(re.sub(r"<[^>]+>", " ", text or ""))
    return re.sub(r"\s+", " ", text).strip()


def _split_name(display):
    """'La Spata, Daniel' -> (Daniel, La Spata, ''); 'Cardona, Jr., Felix'
    -> (Felix, Cardona, Jr.). eLMS displayName is 'Last[, Suffix], First'."""
    parts = [p.strip() for p in (display or "").split(",")]
    first, last, suffix = "", "", ""
    if len(parts) == 2:
        last, first = parts
    elif len(parts) >= 3:
        last, suffix, first = parts[0], parts[1], parts[2]
    elif parts:
        first = parts[0]
    return first, last, suffix


def _parse_ward_page(page_html):
    """Extract name/contact from a chicago.gov ward page. Returns dict."""
    if not page_html:
        return {}
    main = re.search(r"<main[^>]*>(.*?)</main>", page_html, re.S | re.I)
    blob = main.group(1) if main else page_html
    text = _strip(blob)
    out = {}
    m = re.search(r"Alder(?:man|person)\s+([A-Z][A-Za-z'’.\- ]+?)(?:\s{2,}|Office:|$)",
                  text)
    if m:
        out["full_name"] = m.group(1).strip()
    for label, key in (("Email:", "email"), ("Phone:", "phone")):
        m = re.search(re.escape(label) + r"\s*([^\s]+@[^\s]+|\d{3}[.\-]\d{3}[.\-]\d{4})",
                      text)
        if m:
            out[key] = m.group(1)
    mails = set(re.findall(r'href="mailto:([^"]+)"', blob, re.I))
    if mails:
        out["email"] = sorted(mails)[0]
    sites = re.findall(r'<a[^>]+href="(https?://[^"]+)"[^>]*>([^<]{2,60})</a>', blob)
    for href, label in sites:
        if re.search(r"ward", label, re.I) and "chicagoelections" not in href \
                and "chicityclerk" not in href and "cps.edu" not in href:
            out["website"] = href
            break
    addr = re.search(r"Office:\s*([0-9][^E]{5,80}?Chicago, IL\s*\d{5})", text)
    if addr:
        out["office_address"] = re.sub(r"\s+", " ", addr.group(1)).strip()
    return out


def _diff_against_seed(record, seed_by_district):
    """Compare one parsed record to an existing seed official; return
    conflict dicts {field, ours, theirs, reason}. Never auto-corrects."""
    conflicts = []
    seed = seed_by_district.get(record["district_id"])
    if not seed:
        return conflicts
    for field in ("full_name", "first_name", "last_name"):
        ours, theirs = record.get(field) or "", seed.get(field) or ""
        if ours.strip().lower() != theirs.strip().lower():
            conflicts.append({
                "field": field, "ours": ours, "theirs": theirs,
                "reason": ("live official source differs from seeded value; "
                           "human review required"),
            })
    ours_p = ((record.get("external_ids") or {}).get("photo_url")) or ""
    theirs_p = ((seed.get("external_ids") or {}).get("photo_url")) or ""
    if ours_p and theirs_p and ours_p != theirs_p:
        conflicts.append({"field": "external_ids.photo_url", "ours": ours_p,
                          "theirs": theirs_p,
                          "reason": "photo URL changed in official source"})
    return conflicts


# ---------------------------------------------------------------- parse
def _parse_officials(persons, ward_pages, ctx):
    seed = ctx.get("seed_officials") or []
    seed_by_district = {s.get("district_id"): s for s in seed
                        if s.get("district_id")}
    records = []
    rows = persons.get("data", []) if isinstance(persons, dict) else []
    for p in rows:
        if not p.get("isActive"):
            continue
        ward = (p.get("ward") or "").strip()
        if not ward.isdigit():
            continue  # Mayor/Clerk and historical rows are not aldermen
        nn = int(ward)
        first, last, suffix = _split_name(p.get("displayName") or "")
        full = f"{first} {last}".strip() + (f" {suffix}" if suffix else "")
        wp = _parse_ward_page(ward_pages.get(nn))
        contact = {
            "email": p.get("email") or None,
            "phone": p.get("phone") or None,
            "website": p.get("site") or None,
        }
        rec = {
            "record_type": "official",
            "office_id": OFFICE_ID,
            "district_id": f"il-chicago-ward-{nn:02d}",
            "full_name": full,
            "first_name": first or None,
            "last_name": last or None,
            "party": None,  # eLMS does not state party; nonpartisan rule
            "is_incumbent": True,
            "term_start": None,
            "term_end": None,
            "contact": contact,
            "external_ids": {"photo_url": p.get("photo") or None,
                             "elms_person_id": p.get("personId")},
            "source_id": SOURCE_ID,
            "source_key": f"{SOURCE_ID}:alderman:{nn:02d}",
            "source_url": ELMS_PERSON_URL,
            "scraped_at": _scraped_at(),
            "conflicts": [],
        }
        # ward-page cross-check: chicago.gov contact info sometimes differs
        # from the Clerk's record (e.g. ward-site email). Flag, don't merge.
        for field in ("email", "phone", "website"):
            wp_val, elms_val = wp.get(field), contact[field]
            if not (wp_val and elms_val):
                continue
            same = (wp_val.strip().lower() == elms_val.strip().lower())
            if field == "phone":  # compare digit-normalized (773.784.5277 == (773) 784-5277)
                same = (re.sub(r"\D", "", wp_val) ==
                        re.sub(r"\D", "", elms_val))
            if not same:
                rec["conflicts"].append({
                    "field": f"contact.{field}",
                    "ours": elms_val, "theirs": wp_val,
                    "reason": ("chicago.gov ward page lists different "
                               "contact than City Clerk eLMS"),
                })
        rec["conflicts"].extend(_diff_against_seed(rec, seed_by_district))
        if wp.get("office_address"):
            rec.setdefault("external_ids", {})["ward_office_address"] = \
                wp["office_address"]
        records.append(rec)
    return records


def _slug(name):
    s = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return s or "committee"


def _parse_committees(bodies):
    records = []
    rows = bodies.get("data", []) if isinstance(bodies, dict) else []
    for b in rows:
        if not b.get("isActive"):
            continue
        btype = (b.get("bodyType") or "").strip()
        if btype not in ("Committee", "Sub-Committee", "Joint Committee",
                         "Full City Council"):
            continue
        name = (b.get("body") or "").strip()
        members = []
        for m in b.get("members") or []:
            if not m.get("isActive"):
                continue
            first, last, suffix = _split_name(m.get("displayName") or "")
            ward = (m.get("ward") or "").strip()
            members.append({
                "full_name": f"{first} {last}".strip()
                + (f" {suffix}" if suffix else ""),
                "district_id": (f"il-chicago-ward-{int(ward):02d}"
                                if ward.isdigit() else None),
                "role": m.get("memberType") or "Member",
            })
        records.append({
            "record_type": "committee",
            "office_id": "chi-committee",
            "district_id": None,
            "full_name": name,
            "first_name": None, "last_name": None,
            "party": None,
            "is_incumbent": None,
            "term_start": None, "term_end": None,
            "contact": {"email": None, "phone": None, "website": None},
            "external_ids": {"elms_body_id": b.get("bodyId"),
                             "body_type": btype},
            "members": members,  # schema extension: committee membership
            "source_id": SOURCE_ID,
            "source_key": f"{SOURCE_ID}:committee:{_slug(name)}",
            "source_url": ELMS_BODY_URL,
            "scraped_at": _scraped_at(),
            "conflicts": [],
        })
    return records


def parse(payload, ctx=None):
    """payload from fetch_payload(); ctx may carry 'seed_officials' for
    conflict detection. Returns PRD-schema records."""
    ctx = ctx or {}
    recs = _parse_officials(payload.get("persons", {}),
                            payload.get("ward_pages", {}), ctx)
    recs.extend(_parse_committees(payload.get("bodies", {})))
    return recs


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--wards", nargs="*", type=int,
                    help="limit ward-page fetch to these wards")
    ap.add_argument("--seed", help="path to seed officials JSON for conflicts")
    args = ap.parse_args()
    ctx = {}
    if args.wards:
        ctx["ward_sample"] = args.wards
    if args.seed:
        ctx["seed_officials"] = json.load(open(args.seed))
    recs = parse(fetch_payload(ctx), ctx)
    print(json.dumps({"count": len(recs),
                      "records": recs[:5]}, indent=1, default=str))
