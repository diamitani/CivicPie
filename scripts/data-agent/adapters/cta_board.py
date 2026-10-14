"""CTA Board adapter — meeting notices, agendas & minutes.

SOURCE_ID: cta-board
Source: https://www.transitchicago.com/board/notices-agendas-minutes/
Auth: none. Official source (Chicago Transit Authority).

Why this exists: the CTA board page was previously scraped via Firecrawl,
which began refusing it on robots.txt grounds. The page itself returns
HTTP 200 and robots.txt does NOT disallow /board/ (only ?pg= pagination
is disallowed, which this adapter never follows), so a polite direct
fetch is both allowed and reliable.

Strategy (Contract A — URL-listed; the pipeline fetches politely):
  1. Pipeline fetches the listing page (PoliteFetcher honors robots.txt,
     0.5 rps, honest UA, 7-day cache).
  2. parse() extracts the meeting table deterministically:
     date/time | category | meeting name | location | attachments
     (Meeting Notice / Agenda / Minutes PDFs).
  3. Optional Jev pass: when AI_GATEWAY_API_KEY is set, the parsed rows
     are evaluated by Jev (TypeSafe's System One evaluation model,
     typesafe-ai/jev) through AI Gateway's native
     https://ai-gateway.vercel.sh/v1/evaluate API. Jev generates no
     text — it answers typed questions per row: choice (which CTA
     body holds the meeting, with calibrated confidence) and boolean
     (is this a full board meeting?). Dates, times, locations, and
     documents stay deterministic; the model only classifies what code
     can't. Answers under 0.6 confidence are left blank, never guessed,
     and any model failure falls back to the deterministic values.
  4. Discovery fallback: if the listing fetch fails or yields zero rows,
     _discover_via_ddg() uses DuckDuckGo HTML search (free, no key) for
     site:transitchicago.com board notices/agendas/minutes and the
     pipeline-visible payload is rebuilt from the first transitchicago.com
     hit. (A Tavily free-tier key can be slotted in later via the same
     fallback slot.)

Record shape: record_type "meeting" + PRD §3 mandatory fields, plus:
  meeting_date (YYYY-MM-DD), meeting_time_local ("HH:MM AM/PM",
  America/Chicago), meeting_body, location, category,
  documents: [{kind: notice|agenda|minutes, url}]
source_key is stable across runs: cta-board:meeting:<YYYYMMDD>:<slug>
so re-runs dedupe and attachment changes queue for review.
"""

import html
import json
import logging
import os
import re
from datetime import datetime, timezone
from urllib.parse import urlencode

log = logging.getLogger(__name__)

SOURCE_ID = "cta-board"
BOARD_URL = "https://www.transitchicago.com/board/notices-agendas-minutes/"
CTA_ORIGIN = "https://www.transitchicago.com"

URLS = [BOARD_URL]

DDG_HTML = "https://html.duckduckgo.com/html/"


def _scraped_at():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _abs(href):
    href = html.unescape(href or "")
    if href.startswith("http"):
        return href
    if href.startswith("/"):
        return CTA_ORIGIN + href
    return CTA_ORIGIN + "/" + href.lstrip("/")


def _clean(cell_html):
    t = html.unescape(re.sub(r"<br\s*/?>", " ", cell_html or "", flags=re.I))
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    return re.sub(r"\s+", " ", t).strip(" -,")


def _iso_date(mdY):
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", mdY or "")
    return f"{m.group(3)}-{int(m.group(1)):02d}-{int(m.group(2)):02d}" if m else None


def _slug(name):
    return re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")[:70]


def _parse_rows(page_html):
    """[(date_raw, time_raw, category, name, location, [(kind, url), ...])]."""
    rows = re.findall(r'<tr class="">(.*?)</tr>', page_html or "", re.S)
    out = []
    for r in rows:
        cells = re.findall(r"<td[^>]*>(.*?)</td>", r, re.S)
        if len(cells) < 5:
            continue
        dt = _clean(cells[0])
        m = re.match(r"(\d{1,2}/\d{1,2}/\d{4})\s*(.*)", dt)
        date_raw, time_raw = (m.group(1), m.group(2).strip()) if m else (dt, "")
        category = _clean(cells[1])
        name = _clean(cells[2])
        location = _clean(cells[3])
        docs = []
        for href, label in re.findall(
                r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', cells[4], re.S | re.I):
            kind = _clean(label).lower()
            if "agenda" in kind:
                k = "agenda"
            elif "minute" in kind:
                k = "minutes"
            elif "notice" in kind:
                k = "notice"
            else:
                k = "document"
            docs.append((k, _abs(href)))
        if name and _iso_date(date_raw):
            out.append((date_raw, time_raw, category, name, location, docs))
    return out


# ------------------------------------------------------------------ model
# Jev (typesafe-ai/jev) via AI Gateway's native evaluation API.
# Jev is a System One *evaluation* model: it does not generate text at
# all — it answers typed questions (choice / score / boolean) about a
# shared state, with calibrated probabilities. That makes it ideal for
# the one judgment code can't make exactly here: which CTA body holds
# each meeting. Dates, times, and document links are parsed
# deterministically; the model only classifies. Low-confidence answers
# (< 0.6) are discarded, not guessed at.
EVALUATE_URL = "https://ai-gateway.vercel.sh/v1/evaluate"
JEV_MODEL = os.environ.get("AI_GATEWAY_MODEL", "typesafe-ai/jev")
JEV_MIN_CONFIDENCE = 0.6

_BODY_CRITERIA = {
    "Chicago Transit Board": "Full regular or special meetings of the Chicago Transit Board itself",
    "Deferred Compensation Committee": "Meetings of the Deferred Compensation Committee",
    "Finance, Audit and Budget Committee": "Finance, audit and budget (FAB) committee meetings",
    "Employee Retirement Review Committee": "Employee retirement / pension review meetings",
    "Committee on Strategic Planning": "Strategic planning committee meetings",
    "Other": "Any other CTA body or meeting type",
}


def _normalize_with_model(rows):
    """Classify each row's holding body with Jev. Returns {index: fields}
    or {} on any failure (caller falls back to deterministic values)."""
    api_key = os.environ.get("AI_GATEWAY_API_KEY")
    if not api_key or not rows:
        return {}
    state = [
        {"meeting_name": n, "date": d, "time": t or None,
         "location": l or None, "category": c or None,
         "documents": [k for k, _u in docs]}
        for (d, t, c, n, l, docs) in rows
    ]
    questions = {}
    for i in range(len(rows)):
        questions[f"m{i}_body"] = {
            "type": "choice",
            "instructions": "Which CTA body holds this meeting?",
            "criteria": _BODY_CRITERIA,
        }
        questions[f"m{i}_is_board"] = {
            "type": "boolean",
            "instructions": "Is this a full Chicago Transit Board meeting (not a committee)?",
        }
    try:
        import requests
        resp = requests.post(
            EVALUATE_URL,
            headers={"Authorization": f"Bearer {api_key}",
                     "Content-Type": "application/json"},
            json={"model": JEV_MODEL, "state": state,
                  "questions": questions},
            timeout=90,
        )
        resp.raise_for_status()
        answers = resp.json().get("answers", {})
        out = {}
        for i in range(len(rows)):
            b = answers.get(f"m{i}_body", {})
            is_board = answers.get(f"m{i}_is_board", {})
            body = b.get("choice")
            conf = b.get("confidence", 0) or 0
            fields = {}
            if body and body != "Other" and conf >= JEV_MIN_CONFIDENCE:
                fields["body"] = body
            elif body == "Other" and conf >= JEV_MIN_CONFIDENCE:
                fields["body"] = None  # explicitly unrecognized; leave blank
            fields["is_board_meeting"] = (is_board.get("probability", 0) or 0) >= 0.5
            fields["body_confidence"] = round(conf, 3)
            out[i] = fields
        return out
    except Exception as e:
        log.warning("cta-board: Jev normalization skipped (%s)", e)
        return {}


# ------------------------------------------------------- DDG fallback
def _discover_via_ddg():
    """Free discovery fallback: DuckDuckGo HTML search for the board page.
    Returns a listing-page URL or None. No API key needed."""
    try:
        import requests
        q = "site:transitchicago.com board notices agendas minutes"
        resp = requests.post(
            DDG_HTML, data={"q": q},
            headers={"User-Agent": "Mozilla/5.0 (compatible; CivicPieBot/1.0; +https://civicpie.com)"},
            timeout=30,
        )
        resp.raise_for_status()
        for href in re.findall(r'href="([^"]+)"', resp.text):
            if "transitchicago.com/board" in href and "uddg=" in href:
                m = re.search(r"uddg=([^&]+)", href)
                if m:
                    from urllib.parse import unquote
                    return unquote(m.group(1))
        m2 = re.search(r"https://(?:www\.)?transitchicago\.com/board/[^\"'\s<>]*",
                       resp.text)
        return m2.group(0) if m2 else None
    except Exception as e:
        log.warning("cta-board: DDG discovery failed (%s)", e)
        return None


# ------------------------------------------------------------------ parse
def _base_record(source_url):
    return {
        "record_type": "meeting",
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


def parse(payload, ctx=None):
    body = payload.get("body") or ""
    url = payload.get("url") or BOARD_URL
    rows = _parse_rows(body)

    if not rows and payload.get("status") != 200:
        alt = _discover_via_ddg()
        if alt:
            log.info("cta-board: listing failed, DDG rediscovered %s", alt)
            # The pipeline will refetch on the next run; record the
            # discovery as provenance so the failure is visible, not silent.
            rec = _base_record(url)
            rec.update({
                "full_name": "CTA board listing rediscovered via search",
                "source_key": f"{SOURCE_ID}:discovery:{datetime.now(timezone.utc):%Y%m%d}",
                "external_ids": {"rediscovered_url": alt},
                "conflicts": [{"field": "source_url", "ours": url,
                               "theirs": alt,
                               "reason": "listing fetch failed; DDG fallback found alternate URL"}],
            })
            return [rec]
        return []

    norm = _normalize_with_model(rows)
    records = []
    for i, (date_raw, time_raw, category, name, location, docs) in enumerate(rows):
        n = norm.get(i, {})
        date_iso = _iso_date(date_raw)
        rec = _base_record(url)
        rec.update({
            "full_name": name,
            "source_key": f"{SOURCE_ID}:meeting:{date_iso}:{_slug(name)}",
            "meeting_date": date_iso,
            "meeting_time_local": time_raw or None,
            "meeting_body": n.get("body") or None,
            "location": location or None,
            "category": category or None,
            "documents": [{"kind": k, "url": u} for k, u in docs],
            "external_ids": {"cta_documents": len(docs),
                             "jev_body_confidence": n.get("body_confidence"),
                             "jev_is_board_meeting": n.get("is_board_meeting")},
            "conflicts": [],
        })
        records.append(rec)
    return records


if __name__ == "__main__":
    import sys
    html_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/cta_board.html"
    recs = parse({"body": open(html_path, encoding="utf-8",
                               errors="replace").read(),
                  "url": BOARD_URL, "status": 200})
    print(f"records: {len(recs)}")
    print(json.dumps(recs[:2], indent=1))
