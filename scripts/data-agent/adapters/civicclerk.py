"""North Liberty (Iowa) CivicClerk meetings adapter — STUB.

SOURCE_ID: north-liberty-civicclerk
Status: DISABLED until Patrick confirms the North Liberty CivicClerk
feed URL / tenant subdomain.

Known-good CivicClerk public API shape (observed on live public tenants,
e.g. hamdenct.api.civicclerk.com — document endpoints, agenda PDFs):
  - Public portal:  https://{tenant}.portal.civicclerk.com/
  - File stream:    GET https://{tenant}.api.civicclerk.com/v1/Meetings/
                    GetMeetingFileStream(fileId={id},plainText=false)
  North Liberty's tenant subdomain has NOT been confirmed, and the task
  explicitly forbids guessing it. Candidates seen in the wild follow the
  pattern "<city><state>.api.civicclerk.com" (e.g. wataugatx, clovisca,
  dalycityca, forsythcoga, hamdenct), but North Liberty may use a
  different portal entirely — do NOT assume.

TODO (needs Patrick's tap):
  1. Confirm the North Liberty CivicClerk portal URL
     (their city website's Agendas/Minutes link).
  2. Set CIVICCLERK_TENANT below (e.g. "northlibertyia" — only after
     confirmation) or pass ctx={'tenant': ...}.
  3. Set ENABLED = True and run QA: fetch meetings list, verify parse().

Until then this adapter returns zero records with a logged warning, so
the pipeline can include it safely without inventing meetings.
"""

import logging
from datetime import datetime, timezone

log = logging.getLogger(__name__)

SOURCE_ID = "north-liberty-civicclerk"
ENABLED = False  # flip only after the feed URL is confirmed (see TODO)

# Fill in ONLY with a confirmed tenant subdomain. None = disabled.
CIVICCLERK_TENANT = None

API_BASE = "https://{tenant}.api.civicclerk.com"
PORTAL_BASE = "https://{tenant}.portal.civicclerk.com/"

# Documented from live tenants; exact meetings-list route to confirm
# against North Liberty's tenant during enablement QA.
MEETINGS_LIST_PATH = "/v1/Meetings"          # TODO: verify OData route
FILE_STREAM_TMPL = ("/v1/Meetings/GetMeetingFileStream"
                    "(fileId={file_id},plainText=false)")


def _polite_get(url, timeout=30):
    try:
        from .. import fetcher as _fw  # scripts/data-agent/fetcher.py
        if hasattr(_fw, "get"):
            return _fw.get(url, source_id=SOURCE_ID)
    except Exception:
        pass
    import requests
    resp = requests.get(
        url,
        headers={"User-Agent": "CivicPieDataAgent/1.0 (civicpie.com)"},
        timeout=timeout)
    resp.raise_for_status()
    return resp.text


def fetch_payload(ctx=None):
    """Raises RuntimeError while disabled; otherwise returns
    {'meetings': [...], 'tenant': ...}."""
    ctx = ctx or {}
    tenant = ctx.get("tenant") or CIVICCLERK_TENANT
    if not ENABLED or not tenant:
        raise RuntimeError(
            f"{SOURCE_ID}: disabled — North Liberty CivicClerk feed URL "
            "not confirmed (see module TODO). No requests made.")
    base = API_BASE.format(tenant=tenant)
    import json
    meetings = json.loads(_polite_get(base + MEETINGS_LIST_PATH))
    return {"meetings": meetings, "tenant": tenant}


def _scraped_at():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def parse(payload, ctx=None):
    """payload from fetch_payload(); emits record_type 'meeting' per the
    PRD schema. CivicClerk OData meetings carry (typical fields):
      MeetingId/Id, MeetingDate, MeetingType/Body name, Title,
      AgendaUrl/PacketUrl, MinutesUrl, Location, Status."""
    ctx = ctx or {}
    tenant = payload.get("tenant", "")
    meetings = payload.get("meetings", [])
    rows = meetings.get("value", meetings) if isinstance(meetings, dict) \
        else meetings
    records = []
    for m in rows or []:
        if not isinstance(m, dict):
            continue
        mid = m.get("MeetingId") or m.get("Id") or m.get("id")
        date = m.get("MeetingDate") or m.get("meetingDate")
        title = (m.get("Title") or m.get("title") or
                 m.get("MeetingType") or m.get("meetingType") or
                 "City meeting")
        agenda = m.get("AgendaUrl") or m.get("agendaUrl")
        if not agenda and m.get("AgendaFileId") is not None:
            agenda = (API_BASE.format(tenant=tenant) +
                      FILE_STREAM_TMPL.format(
                          file_id=m.get("AgendaFileId")))
        records.append({
            "record_type": "meeting",
            "office_id": "ia-north-liberty-council",
            "district_id": "ia-north-liberty-city",
            "full_name": title,
            "first_name": None, "last_name": None,
            "party": None,
            "is_incumbent": None,
            "term_start": date, "term_end": None,
            "contact": {"email": None, "phone": None, "website":
                         PORTAL_BASE.format(tenant=tenant)},
            "external_ids": {"civicclerk_meeting_id": mid,
                             "agenda_url": agenda,
                             "minutes_url": m.get("MinutesUrl")},
            "source_id": SOURCE_ID,
            "source_key": f"{SOURCE_ID}:meeting:{mid}",
            "source_url": PORTAL_BASE.format(tenant=tenant),
            "scraped_at": _scraped_at(),
            "conflicts": [],
        })
    return records


def self_check():
    """QA entry: demonstrates the disabled stub cleanly does nothing."""
    try:
        fetch_payload()
    except RuntimeError as exc:
        log.warning("stub self-check: %s", exc)
        return {"enabled": False, "records": 0, "note": str(exc)}
    raise AssertionError("stub unexpectedly enabled")


if __name__ == "__main__":
    print(self_check())
