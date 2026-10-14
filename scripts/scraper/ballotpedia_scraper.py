"""
Ballotpedia Scraper — Local Candidates & Ballot Measures
========================================================
Scrapes Ballotpedia for local election data: mayoral races, city council,
school board, ballot measures, and judicial elections.

Strategy:
  - Ballotpedia has structured pages: ballotpedia.org/{State}_elections,_2026
  - We scrape the HTML and extract candidate lists, election dates, ballot measures
  - Falls back to cached JSON when scraping is blocked

Approach: HTML parsing with regex (stdlib only — no BeautifulSoup dependency).
"""

import json
import os
import re
import sys
import time
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
from html import unescape

# --- Config ---
BALLOTPEDIA_BASE = "https://ballotpedia.org"
CACHE_DIR = Path.home() / ".civicpie" / "pipeline_cache"
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "data" / "elections"
USER_AGENT = "CivicPie/2.0 (civic-engagement-platform; contact@civicpie.com)"
REQUEST_DELAY = 3.0  # Be respectful — Ballotpedia is a nonprofit

# Target pages for 2026
STATE_ELECTION_PAGES = {
    "AL": f"{BALLOTPEDIA_BASE}/Alabama_elections,_2026",
    "AK": f"{BALLOTPEDIA_BASE}/Alaska_elections,_2026",
    "AZ": f"{BALLOTPEDIA_BASE}/Arizona_elections,_2026",
    "AR": f"{BALLOTPEDIA_BASE}/Arkansas_elections,_2026",
    "CA": f"{BALLOTPEDIA_BASE}/California_elections,_2026",
    "CO": f"{BALLOTPEDIA_BASE}/Colorado_elections,_2026",
    "CT": f"{BALLOTPEDIA_BASE}/Connecticut_elections,_2026",
    "DE": f"{BALLOTPEDIA_BASE}/Delaware_elections,_2026",
    "FL": f"{BALLOTPEDIA_BASE}/Florida_elections,_2026",
    "GA": f"{BALLOTPEDIA_BASE}/Georgia_elections,_2026",
    "HI": f"{BALLOTPEDIA_BASE}/Hawaii_elections,_2026",
    "ID": f"{BALLOTPEDIA_BASE}/Idaho_elections,_2026",
    "IL": f"{BALLOTPEDIA_BASE}/Illinois_elections,_2026",
    "IN": f"{BALLOTPEDIA_BASE}/Indiana_elections,_2026",
    "IA": f"{BALLOTPEDIA_BASE}/Iowa_elections,_2026",
    "KS": f"{BALLOTPEDIA_BASE}/Kansas_elections,_2026",
    "KY": f"{BALLOTPEDIA_BASE}/Kentucky_elections,_2026",
    "LA": f"{BALLOTPEDIA_BASE}/Louisiana_elections,_2026",
    "ME": f"{BALLOTPEDIA_BASE}/Maine_elections,_2026",
    "MD": f"{BALLOTPEDIA_BASE}/Maryland_elections,_2026",
    "MA": f"{BALLOTPEDIA_BASE}/Massachusetts_elections,_2026",
    "MI": f"{BALLOTPEDIA_BASE}/Michigan_elections,_2026",
    "MN": f"{BALLOTPEDIA_BASE}/Minnesota_elections,_2026",
    "MS": f"{BALLOTPEDIA_BASE}/Mississippi_elections,_2026",
    "MO": f"{BALLOTPEDIA_BASE}/Missouri_elections,_2026",
    "MT": f"{BALLOTPEDIA_BASE}/Montana_elections,_2026",
    "NE": f"{BALLOTPEDIA_BASE}/Nebraska_elections,_2026",
    "NV": f"{BALLOTPEDIA_BASE}/Nevada_elections,_2026",
    "NH": f"{BALLOTPEDIA_BASE}/New_Hampshire_elections,_2026",
    "NJ": f"{BALLOTPEDIA_BASE}/New_Jersey_elections,_2026",
    "NM": f"{BALLOTPEDIA_BASE}/New_Mexico_elections,_2026",
    "NY": f"{BALLOTPEDIA_BASE}/New_York_elections,_2026",
    "NC": f"{BALLOTPEDIA_BASE}/North_Carolina_elections,_2026",
    "ND": f"{BALLOTPEDIA_BASE}/North_Dakota_elections,_2026",
    "OH": f"{BALLOTPEDIA_BASE}/Ohio_elections,_2026",
    "OK": f"{BALLOTPEDIA_BASE}/Oklahoma_elections,_2026",
    "OR": f"{BALLOTPEDIA_BASE}/Oregon_elections,_2026",
    "PA": f"{BALLOTPEDIA_BASE}/Pennsylvania_elections,_2026",
    "RI": f"{BALLOTPEDIA_BASE}/Rhode_Island_elections,_2026",
    "SC": f"{BALLOTPEDIA_BASE}/South_Carolina_elections,_2026",
    "SD": f"{BALLOTPEDIA_BASE}/South_Dakota_elections,_2026",
    "TN": f"{BALLOTPEDIA_BASE}/Tennessee_elections,_2026",
    "TX": f"{BALLOTPEDIA_BASE}/Texas_elections,_2026",
    "UT": f"{BALLOTPEDIA_BASE}/Utah_elections,_2026",
    "VT": f"{BALLOTPEDIA_BASE}/Vermont_elections,_2026",
    "VA": f"{BALLOTPEDIA_BASE}/Virginia_elections,_2026",
    "WA": f"{BALLOTPEDIA_BASE}/Washington_elections,_2026",
    "WV": f"{BALLOTPEDIA_BASE}/West_Virginia_elections,_2026",
    "WI": f"{BALLOTPEDIA_BASE}/Wisconsin_elections,_2026",
    "WY": f"{BALLOTPEDIA_BASE}/Wyoming_elections,_2026",
}


def ensure_dirs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_path(url: str) -> Path:
    h = hashlib.md5(url.encode()).hexdigest()
    return CACHE_DIR / f"bp_{h}.html"


def _fetch_page(url: str, ttl: int = 86400) -> Optional[str]:  # 24h TTL
    """Fetch and cache HTML page."""
    cache_path = _cache_path(url)

    if cache_path.exists():
        age = time.time() - cache_path.stat().st_mtime
        if age < ttl:
            with open(cache_path) as f:
                return f.read()

    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
    try:
        with urlopen(req, timeout=30) as resp:
            html = resp.read().decode("utf-8", errors="replace")
            with open(cache_path, "w") as f:
                f.write(html)
            time.sleep(REQUEST_DELAY)
            return html
    except (URLError, HTTPError) as e:
        print(f"  ⚠ Ballotpedia fetch failed: {url[:100]} — {e}", file=sys.stderr)
        if cache_path.exists():
            with open(cache_path) as f:
                return f.read()
        return None


def _extract_html_text(html: str, start_tag: str, end_tag: str) -> str:
    """Extract text between HTML markers."""
    start = html.find(start_tag)
    if start == -1:
        return ""
    start += len(start_tag)
    end = html.find(end_tag, start)
    if end == -1:
        return html[start:]
    return html[start:end]


def _strip_tags(text: str) -> str:
    """Remove HTML tags from text."""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return unescape(text.strip())


def _extract_candidates_from_html(html: str, office_name: str) -> list:
    """Extract candidate names and parties from Ballotpedia election HTML."""
    candidates = []
    # Look for table rows with candidate data
    # Ballotpedia typically uses wikitable class
    table_pattern = re.compile(
        r'<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>(.*?)</table>',
        re.DOTALL | re.IGNORECASE
    )
    row_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    cell_pattern = re.compile(r'<t[dh][^>]*>(.*?)</t[dh]>', re.DOTALL | re.IGNORECASE)

    tables = table_pattern.findall(html)
    for table in tables:
        rows = row_pattern.findall(table)
        for row in rows:
            cells = cell_pattern.findall(row)
            if len(cells) >= 2:
                name = _strip_tags(cells[0])
                party = _strip_tags(cells[1]) if len(cells) > 1 else ""
                # Filter out header rows and non-candidate rows
                if name and name.lower() not in ("candidate", "name", "party", "candidate name"):
                    candidates.append({
                        "name": name,
                        "party": party,
                        "office": office_name,
                    })

    # Fallback: look for bullet lists of candidates
    if not candidates:
        li_pattern = re.compile(r'<li[^>]*>(.*?)</li>', re.DOTALL | re.IGNORECASE)
        for li in li_pattern.findall(html):
            text = _strip_tags(li)
            if len(text) > 5 and len(text) < 200:
                # Check if it looks like a candidate entry
                party_match = re.search(r'\((Democrat|Republican|Independent|Libertarian|Green)\)', text)
                if party_match:
                    candidates.append({
                        "name": text.replace(party_match.group(0), "").strip().rstrip("() "),
                        "party": party_match.group(1),
                        "office": office_name,
                    })

    return candidates


def _extract_election_dates(html: str) -> list:
    """Extract election dates from the page."""
    dates = []
    # Look for date patterns
    date_pattern = re.compile(
        r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+2026',
        re.IGNORECASE
    )
    matches = date_pattern.findall(html)
    # Get full matches
    full_pattern = re.compile(
        r'((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+2026)',
        re.IGNORECASE
    )
    for match in full_pattern.findall(html):
        if match not in dates:
            dates.append(match)

    return dates


def scrape_state_elections(state_abbr: str, url: str) -> dict:
    """Scrape election data for a single state."""
    print(f"  📡 Ballotpedia: {state_abbr}...")

    html = _fetch_page(url)
    if not html:
        return {"state": state_abbr, "error": "Failed to fetch page"}

    # Extract data
    dates = _extract_election_dates(html)

    # Try to find candidate sections
    offices = ["Governor", "U.S. Senate", "U.S. House", "State Senate",
               "State House", "Mayor", "City Council", "School Board"]
    all_candidates = []
    for office in offices:
        candidates = _extract_candidates_from_html(html, office)
        all_candidates.extend(candidates)

    # Extract ballot measures
    measure_pattern = re.compile(r'(?:Proposition|Amendment|Measure|Question|Initiative|Referendum)\s+\d+', re.IGNORECASE)
    measures = list(set(measure_pattern.findall(html)))

    result = {
        "state": state_abbr,
        "url": url,
        "election_dates": dates,
        "candidates_found": len(all_candidates),
        "candidates": all_candidates,
        "ballot_measures": measures,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }

    if dates:
        print(f"    Found: {len(dates)} dates, {len(all_candidates)} candidates, {len(measures)} measures")
    else:
        print(f"    Found: {len(all_candidates)} candidates (dates not parsed)")

    return result


def run_ballotpedia_pipeline():
    """Run the Ballotpedia scraper across all states."""
    ensure_dirs()
    print(f"\n📰 Ballotpedia Scraper")
    print("=" * 50)
    print("  ℹ  Scraping 50 state election pages (this will take a few minutes)")
    print("  ℹ  Rate: 3 seconds between requests (respecting Ballotpedia's servers)")

    all_states = {}
    for abbr, url in STATE_ELECTION_PAGES.items():
        try:
            all_states[abbr] = scrape_state_elections(abbr, url)
        except Exception as e:
            print(f"    ✗ {abbr}: {e}", file=sys.stderr)
            all_states[abbr] = {"state": abbr, "error": str(e)}

    # Aggregate
    total_candidates = sum(s.get("candidates_found", 0) for s in all_states.values())
    total_measures = sum(len(s.get("ballot_measures", [])) for s in all_states.values())

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Ballotpedia (ballotpedia.org)",
        "total_candidates_found": total_candidates,
        "total_ballot_measures": total_measures,
        "by_state": all_states,
    }

    path = OUTPUT_DIR / "ballotpedia_data.json"
    with open(path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  ✅ Saved: {path}")
    print(f"     {total_candidates} candidates across 50 states")
    print(f"     {total_measures} ballot measures")
    return output


if __name__ == "__main__":
    run_ballotpedia_pipeline()
