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
  3. Optional model pass: when AI_GATEWAY_API_KEY is set, the parsed rows
     are sent to Vercel AI Gateway (OpenAI-compatible
     https://ai-gateway.vercel.sh/v1/chat/completions) for normalization
     — ISO dates, canonical body names, document classification.
     Any model failure falls back to the deterministic values; the model
     never invents meetings.
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

AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions"
AI_GATEWAY_MODEL = os.environ.get("AI_GATEWAY_MODEL", "gpt-4o-mini")
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
def _normalize_with_model(rows):
    """Ask the model to normalize parsed rows. Returns dict keyed by index
    with {title, date_iso, time_local, body, location, category} or {} on
    any failure (caller falls back to deterministic values)."""
    api_key = os.environ.get("AI_GATEWAY_API_KEY")
    if not api_key or not rows:
        return {}
    compact = [
        {"i": i, "date": d, "time": t, "category": c, "name": n, "loc": l}
        for i, (d, t, c, n, l, _docs) in enumerate(rows)
    ]
    prompt = (
        "You normalize public transit board meeting listings. "
        "For each item, return JSON array of {\"i\": <int>, \"title\": <clean meeting title>, "
        "\"date_iso\": \"YYYY-MM-DD\", \"time_local\": \"HH:MM AM/PM (America/Chicago)\", "
        "\"body\": <canonical body, e.g. 'Chicago Transit Board' or 'Deferred Compensation Committee'>, "
        "\"location\": <clean location>, \"category\": <as given>}. "
        "Normalize only what is present; never invent meetings, dates, or locations. "
        "Reply with ONLY the JSON array.\n\n"
        + json.dumps(compact)
    )
    try:
        import requests
        resp = requests.post(
            AI_GATEWAY_URL,
            headers={"Authorization": f"Bearer {api_key}",
                     "Content-Type": "application/json"},
            json={"model": AI_GATEWAY_MODEL, "temperature": 0,
                  "max_tokens": 4000,
                  "messages": [{"role": "user", "content": prompt}]},
            timeout=60,
        )
        resp.raise_for_status()
        text = resp.json()["choices"][0]["message"]["content"]
        m = re.search(r"\[.*\]", text, re.S)
        items = json.loads(m.group(0)) if m else []
        return {it["i"]: it for it in items if isinstance(it, dict)
                and "i" in it}
    except Exception as e:
        log.warning("cta-board: model normalization skipped (%s)", e)
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
        date_iso = n.get("date_iso") or _iso_date(date_raw)
        rec = _base_record(url)
        rec.update({
            "full_name": n.get("title") or name,
            "source_key": f"{SOURCE_ID}:meeting:{date_iso}:{_slug(n.get('title') or name)}",
            "meeting_date": date_iso,
            "meeting_time_local": n.get("time_local") or (time_raw or None),
            "meeting_body": n.get("body") or None,
            "location": n.get("location") or (location or None),
            "category": n.get("category") or (category or None),
            "documents": [{"kind": k, "url": u} for k, u in docs],
            "external_ids": {"cta_documents": len(docs)},
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
