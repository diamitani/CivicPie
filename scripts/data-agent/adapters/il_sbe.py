"""Illinois State Board of Elections adapter.

SOURCE_ID: il-sbe
Feeds: upcoming election dates + offices on the ballot.
Auth: none. Official source: https://www.elections.il.gov

Strategy (all official pages):
  1. Homepage -> "Next Election" link (ElectionInformation.aspx?ElectionID=...)
     gives the upcoming election name + date.
  2. Election information page -> OfficesUpForElection.aspx lists every
     office group and office on that ballot.
  3. Main/CalendarEventsAll.aspx lists upcoming dated election events
     (early voting, mail-ballot deadlines, registration deadlines...).

SCHEMA EXTENSION: the PRD record_type enum is
"official | meeting | district | committee". Elections are none of those,
so this adapter emits record_type "election" with:
  - election_name, election_date (YYYY-MM-DD), election_type
  - offices: [{group, offices:[...]}] on the election record
  - calendar events as separate "election" records with
    subtype="calendar_event", event_date, event_title, event_location,
    event_description.
Report this extension in the run report; nothing is fabricated.
"""

import html
import logging
import re
import time
from datetime import datetime, timezone

log = logging.getLogger(__name__)

SOURCE_ID = "il-sbe"
ENABLED = True

SBE_HOME = "https://www.elections.il.gov/"
SBE_BASE = "https://www.elections.il.gov/ElectionOperations/"
CALENDAR_ALL = "https://www.elections.il.gov/Main/CalendarEventsAll.aspx"

_UA = "CivicPieDataAgent/1.0 (civicpie.com; public-records research)"
_last_req = [0.0]


def _polite_get(url, timeout=30, min_gap=0.8):
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
    resp = requests.get(url, headers={"User-Agent": _UA}, timeout=timeout)
    _last_req[0] = time.time()
    resp.raise_for_status()
    return resp.text


SBE_ORIGIN = "https://www.elections.il.gov"


def _abs(base, href):
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return SBE_ORIGIN + href
    return base.rstrip("/") + "/" + href.lstrip("/")


def _text(html_blob):
    t = html.unescape(re.sub(r"<[^>]+>", "\n", html_blob or ""))
    return [l.strip() for l in t.split("\n") if l.strip()]


def fetch_payload(ctx=None):
    """{'home': html, 'election_page': (title, html, url),
    'offices_page': (url, html), 'calendar_page': html}."""
    home = _polite_get(SBE_HOME)
    m = re.search(r'href="([^"]*ElectionInformation\.aspx\?ElectionID=[^"]*)"[^>]*>'
                  r'\s*Next Election\s*([^<]{2,80})', home, re.I | re.S)
    election_url, election_label = None, ""
    if m:
        election_url = _abs(SBE_BASE, html.unescape(m.group(1)))
        election_label = html.unescape(m.group(2)).strip()
    else:  # fallback: any ElectionInformation link
        m2 = re.search(r'href="([^"]*ElectionInformation\.aspx\?ElectionID=[^"]*)"',
                       home)
        if m2:
            election_url = _abs(SBE_BASE, html.unescape(m2.group(1)))
    election_page, offices_page = ("", ""), (None, "")
    if election_url:
        ehtml = _polite_get(election_url)
        lines = _text(ehtml)
        title = ""
        for i, l in enumerate(lines):
            if re.match(r"\d{1,2}/\d{1,2}/\d{4}\s+\S+", l):
                title = l
                break
        election_page = (title or election_label, ehtml, election_url)
        m3 = re.search(r'href="([^"]*OfficesUpForElection\.aspx[^"]*)"', ehtml)
        if m3:
            ourl = _abs(SBE_BASE, html.unescape(m3.group(1)))
            offices_page = (ourl, _polite_get(ourl))
    calendar_page = _polite_get(CALENDAR_ALL)
    return {"home": home, "election_page": election_page,
            "offices_page": offices_page, "calendar_page": calendar_page}


# ---------------------------------------------------------------- parse
def _scraped_at():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _iso(mdY):
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", mdY)
    return f"{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}" if m \
        else None


def _base_record(source_url):
    return {
        "record_type": "election",  # schema extension (see module docstring)
        "office_id": None,
        "district_id": None,
        "full_name": None,
        "first_name": None, "last_name": None,
        "party": None,
        "is_incumbent": None,
        "term_start": None, "term_end": None,
        "contact": {"email": None, "phone": None, "website": None},
        "external_ids": {},
        "source_id": SOURCE_ID,
        "source_key": "",
        "source_url": source_url,
        "scraped_at": _scraped_at(),
        "conflicts": [],
    }


def _election_id_from_url(url):
    m = re.search(r"ElectionID=([^&]+)", url or "")
    return m.group(1) if m else "unknown"


def _parse_office_groups(page_html):
    """[(group_title, [office, ...])] from OfficesUpForElection page.

    Page shape: "GENERAL ELECTION - 11/3/2026", then per group:
        <GROUP TITLE IN CAPS>
        Please select an office
        <office 1> ... <office N>
    A group header is an ALL-CAPS line directly followed by
    "Please select an office"."""
    lines = _text(page_html)
    groups = []
    started, i = False, 0
    footer = ("Springfield Office", "Illinois State Board of Elections",
              "External Links", "Contact Us")
    while i < len(lines):
        l = lines[i]
        if not started:
            if re.match(r"(GENERAL|PRIMARY|CONSOLIDATED).*ELECTION",
                        l, re.I) and re.search(r"\d{4}", l):
                started = True
            i += 1
            continue
        if any(l.startswith(f) for f in footer) or l.startswith("Tab"):
            break
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if (l == l.upper() and len(l) > 4 and
                nxt.strip().lower() == "please select an office"):
            group, offices = l.title(), []
            i += 2
            while i < len(lines):
                l2 = lines[i]
                nxt2 = lines[i + 1] if i + 1 < len(lines) else ""
                if (l2 == l2.upper() and len(l2) > 4 and
                        nxt2.strip().lower() == "please select an office"):
                    break
                if any(l2.startswith(f) for f in footer):
                    break
                if l2.strip().lower() != "please select an office" and \
                        len(l2) > 2:
                    offices.append(l2)
                i += 1
            groups.append((group, offices))
            continue
        i += 1
    return groups


def _parse_calendar_events(page_html):
    """[(date, title, location, description)] from CalendarEventsAll page 1."""
    lines = _text(page_html)
    try:
        start = lines.index("Description") + 1
    except ValueError:
        return []
    lines = lines[start:]
    events = []
    i = 0
    while i < len(lines):
        if re.match(r"^\d{1,2}/\d{1,2}/\d{4}$", lines[i]):
            date = lines[i]
            title = lines[i + 1] if i + 1 < len(lines) else ""
            loc = lines[i + 2] if i + 2 < len(lines) else ""
            desc = lines[i + 3] if i + 3 < len(lines) else ""
            events.append((date, title, loc, desc))
            i += 4
        else:
            i += 1
    return events


def _election_type(name):
    n = (name or "").upper()
    if "GENERAL" in n:
        return "general"
    if "PRIMARY" in n:
        return "primary"
    if "CONSOLIDATED" in n:
        return "consolidated"
    return "other"


def parse(payload, ctx=None):
    records = []
    title, _ehtml, eurl = payload.get("election_page", ("", "", ""))
    eid = _election_id_from_url(eurl)
    m = re.match(r"(\d{1,2}/\d{1,2}/\d{4})\s+(.*)", title or "")
    edate, ename = (m.group(1), m.group(2)) if m else (None, title)

    office_groups = []
    ourl, ohtml = payload.get("offices_page", (None, ""))
    if ohtml:
        office_groups = _parse_office_groups(ohtml)

    rec = _base_record(eurl or SBE_HOME)
    rec.update({
        "full_name": ename or "Illinois election",
        "source_key": f"{SOURCE_ID}:election:{eid}",
        "election_name": ename,
        "election_date": _iso(edate) if edate else None,
        "election_type": _election_type(ename),
        "offices": [{"group": g, "offices": o} for g, o in office_groups],
    })
    records.append(rec)

    for date, etitle, loc, desc in _parse_calendar_events(
            payload.get("calendar_page", "")):
        erec = _base_record(CALENDAR_ALL)
        slug = re.sub(r"[^a-z0-9]+", "-", etitle.lower()).strip("-")[:60]
        erec.update({
            "record_type": "election",
            "full_name": f"{etitle} ({date})",
            "source_key": f"{SOURCE_ID}:event:{_iso(date)}:{slug}",
            "subtype": "calendar_event",
            "election_name": ename,
            "event_date": _iso(date),
            "event_title": etitle,
            "event_location": loc or None,
            "event_description": desc or None,
        })
        records.append(erec)
    return records


if __name__ == "__main__":
    recs = parse(fetch_payload())
    print(f"records: {len(recs)}")
    import json
    print(json.dumps(recs[:3], indent=1, default=str))
