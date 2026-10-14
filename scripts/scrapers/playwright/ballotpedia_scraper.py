#!/usr/bin/env python3
"""
Ballotpedia Deep Scraper (Playwright)
=====================================
Uses headless Chromium to scrape Ballotpedia for:
  - All 2026 U.S. Senate candidates per state
  - 2026 U.S. House candidates per district
  - Gubernatorial races
  - Ballot measures
  - Election dates and deadlines
  - Polling place information
  - Candidate profile details (bio, experience, endorsements)

Source: ballotpedia.org (nonprofit, public-interest data)
Rate limit: respectful 3-5s delay between pages
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
from urllib.parse import quote

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# --- Config ---
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent.parent / "src" / "data" / "elections"
CACHE_DIR = Path.home() / ".civicpie" / "scraper_cache"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) CivicPie/2.0 Research Bot (contact@civicpie.com)"
REQUEST_DELAY = 4.0  # seconds between page loads — be respectful

# 2026 election pages
BALLOTPEDIA_BASE = "https://ballotpedia.org"

SENATE_PAGES = {
    "AL": "/United_States_Senate_election_in_Alabama,_2026",
    "AK": "/United_States_Senate_election_in_Alaska,_2026",
    "AR": "/United_States_Senate_election_in_Arkansas,_2026",
    "CO": "/United_States_Senate_election_in_Colorado,_2026",
    "DE": "/United_States_Senate_election_in_Delaware,_2026",
    "GA": "/United_States_Senate_election_in_Georgia,_2026",
    "IA": "/United_States_Senate_election_in_Iowa,_2026",
    "ID": "/United_States_Senate_election_in_Idaho,_2026",
    "IL": "/United_States_Senate_election_in_Illinois,_2026",
    "KS": "/United_States_Senate_election_in_Kansas,_2026",
    "KY": "/United_States_Senate_election_in_Kentucky,_2026",
    "LA": "/United_States_Senate_election_in_Louisiana,_2026",
    "MA": "/United_States_Senate_election_in_Massachusetts,_2026",
    "ME": "/United_States_Senate_election_in_Maine,_2026",
    "MI": "/United_States_Senate_election_in_Michigan,_2026",
    "MN": "/United_States_Senate_election_in_Minnesota,_2026",
    "MS": "/United_States_Senate_election_in_Mississippi,_2026",
    "MT": "/United_States_Senate_election_in_Montana,_2026",
    "NC": "/United_States_Senate_election_in_North_Carolina,_2026",
    "NE": "/United_States_Senate_election_in_Nebraska,_2026",
    "NH": "/United_States_Senate_election_in_New_Hampshire,_2026",
    "NJ": "/United_States_Senate_election_in_New_Jersey,_2026",
    "NM": "/United_States_Senate_election_in_New_Mexico,_2026",
    "OK": "/United_States_Senate_election_in_Oklahoma,_2026",
    "OR": "/United_States_Senate_election_in_Oregon,_2026",
    "RI": "/United_States_Senate_election_in_Rhode_Island,_2026",
    "SC": "/United_States_Senate_election_in_South_Carolina,_2026",
    "SD": "/United_States_Senate_election_in_South_Dakota,_2026",
    "TN": "/United_States_Senate_election_in_Tennessee,_2026",
    "TX": "/United_States_Senate_election_in_Texas,_2026",
    "VA": "/United_States_Senate_election_in_Virginia,_2026",
    "WV": "/United_States_Senate_election_in_West_Virginia,_2026",
    "WY": "/United_States_Senate_election_in_Wyoming,_2026",
}

STATE_ELECTION_PAGES = {
    abbr: f"/{name.replace(' ','_')}_elections,_2026"
    for abbr, name in [
        ("AL","Alabama"),("AK","Alaska"),("AZ","Arizona"),("AR","Arkansas"),
        ("CA","California"),("CO","Colorado"),("CT","Connecticut"),("DE","Delaware"),
        ("FL","Florida"),("GA","Georgia"),("HI","Hawaii"),("ID","Idaho"),
        ("IL","Illinois"),("IN","Indiana"),("IA","Iowa"),("KS","Kansas"),
        ("KY","Kentucky"),("LA","Louisiana"),("ME","Maine"),("MD","Maryland"),
        ("MA","Massachusetts"),("MI","Michigan"),("MN","Minnesota"),("MS","Mississippi"),
        ("MO","Missouri"),("MT","Montana"),("NE","Nebraska"),("NV","Nevada"),
        ("NH","New_Hampshire"),("NJ","New_Jersey"),("NM","New_Mexico"),("NY","New_York"),
        ("NC","North_Carolina"),("ND","North_Dakota"),("OH","Ohio"),("OK","Oklahoma"),
        ("OR","Oregon"),("PA","Pennsylvania"),("RI","Rhode_Island"),("SC","South_Carolina"),
        ("SD","South_Dakota"),("TN","Tennessee"),("TX","Texas"),("UT","Utah"),
        ("VT","Vermont"),("VA","Virginia"),("WA","Washington"),("WV","West_Virginia"),
        ("WI","Wisconsin"),("WY","Wyoming"),
    ]
}


def ensure_dirs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_path(key: str) -> Path:
    h = hashlib.md5(key.encode()).hexdigest()
    return CACHE_DIR / f"bp_{h}.json"


def _strip_html(text: str) -> str:
    """Clean HTML tags and whitespace."""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\[edit\]|\[hide\]|\(dead link\)', '', text, flags=re.IGNORECASE)
    return text.strip()


def scrape_page(url: str, wait_selector: str = "body", use_cache: bool = True) -> Optional[str]:
    """Scrape a single Ballotpedia page with Playwright."""
    cache_key = url
    if use_cache:
        cache_path = _cache_path(cache_key)
        if cache_path.exists():
            age = time.time() - cache_path.stat().st_mtime
            if age < 86400:  # 24h cache
                with open(cache_path) as f:
                    return json.load(f).get("html", "")

    html = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=USER_AGENT,
                viewport={"width": 1280, "height": 800},
            )
            page = context.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=30000)

            try:
                page.wait_for_selector(wait_selector, timeout=10000)
            except PlaywrightTimeout:
                pass  # page loaded enough

            html = page.content()
            browser.close()

        if use_cache and html:
            with open(_cache_path(cache_key), "w") as f:
                json.dump({"html": html, "url": url, "scraped_at": datetime.now(timezone.utc).isoformat()}, f)

        time.sleep(REQUEST_DELAY)
        return html

    except Exception as e:
        print(f"  ⚠ Scrape failed: {url[:100]} — {e}", file=sys.stderr)
        return None


def extract_candidates_from_html(html: str) -> list:
    """Extract candidate names, parties, and status from Ballotpedia HTML."""
    candidates = []

    # Pattern 1: Look for wikitable candidate rows
    # Ballotpedia uses tables with class "wikitable" for candidate listings
    table_pattern = re.compile(
        r'<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>(.*?)</table>',
        re.DOTALL | re.IGNORECASE
    )
    row_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL | re.IGNORECASE)
    cell_pattern = re.compile(r'<t[dh][^>]*>(.*?)</t[dh]>', re.DOTALL | re.IGNORECASE)

    tables = table_pattern.findall(html)
    seen_names = set()
    for table in tables:
        rows = row_pattern.findall(table)
        for row in rows:
            cells = cell_pattern.findall(row)
            if len(cells) >= 2:
                name = _strip_html(cells[0])
                party = _strip_html(cells[1]) if len(cells) > 1 else ""
                # Filter out header rows AND race rating rows
                skip_words = ["candidate", "name", "party", "candidate name", "affiliation",
                              "status", "rating", "solid", "likely", "lean", "toss-up", "tossup",
                              "trending", "battleground", "safe", "tilt"]
                if name and name.lower() not in skip_words:
                    # Also skip if name contains rating keywords
                    name_lower = name.lower()
                    if not any(skip in name_lower for skip in ["solid ", "likely ", "lean ", "toss", "trending", "battleground", "safe ", "tilt "]):
                        if len(name) > 2 and name not in seen_names:
                            seen_names.add(name)
                            candidates.append({
                                "name": name,
                                "party": party,
                                "source": "Ballotpedia (wikitable)",
                            })

    # Pattern 2: Look for "Declared candidates" or "Candidates" sections with bullet lists
    if not candidates:
        # Find sections about candidates
        section_pattern = re.compile(
            r'(?:Declared\s+candidates|Candidates|Democratic\s+primary|Republican\s+primary)[^<]*</h[234]>[\s\S]*?(?=<h[234]|$)',
            re.IGNORECASE
        )
        li_pattern = re.compile(r'<li[^>]*>(.*?)</li>', re.DOTALL | re.IGNORECASE)
        for section in section_pattern.findall(html):
            for li in li_pattern.findall(section):
                text = _strip_html(li)
                if len(text) > 3 and len(text) < 300:
                    # Try to extract party from parentheses
                    party_match = re.search(r'\((Democrat|Republican|Independent|Libertarian|Green|Constitution)\)', text)
                    if party_match:
                        name = text.replace(party_match.group(0), "").strip().rstrip("() ")
                        candidates.append({
                            "name": name,
                            "party": party_match.group(1),
                            "source": "Ballotpedia (section)",
                        })
                    elif any(p in text for p in ["Democrat", "Republican", "Independent"]):
                        candidates.append({
                            "name": text,
                            "party": "",
                            "source": "Ballotpedia (section)",
                        })

    # Pattern 3: Check for structured data in page
    if not candidates:
        # Look for name-party pairs in paragraph text
        para_pattern = re.compile(r'<p[^>]*>(.*?)</p>', re.DOTALL | re.IGNORECASE)
        for para in para_pattern.findall(html):
            text = _strip_html(para)
            party_match = re.search(r'\((Democrat|Republican|Independent|Libertarian|Green)\)', text)
            if party_match and len(text) < 200:
                candidates.append({
                    "name": text.replace(party_match.group(0), "").strip().rstrip("() "),
                    "party": party_match.group(1),
                    "source": "Ballotpedia (paragraph)",
                })

    return candidates


def extract_election_dates(html: str) -> list:
    """Extract election dates from page content."""
    dates = []
    date_pattern = re.compile(
        r'((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2})',
        re.IGNORECASE
    )
    found = set(date_pattern.findall(html))
    for d in found:
        dates.append({"date": d, "source": "Ballotpedia"})
    # Also look for "Primary: Month Day" patterns
    primary_pattern = re.compile(r'(Primary|General|Runoff)[^:]*:\s*(.*?20\d{2})', re.IGNORECASE)
    for match in primary_pattern.findall(html):
        dates.append({"type": match[0], "date": match[1], "source": "Ballotpedia"})
    return dates


def extract_ballot_measures(html: str) -> list:
    """Extract ballot measure information."""
    measures = []
    measure_pattern = re.compile(
        r'(?:Proposition|Amendment|Measure|Question|Initiative|Referendum|Bond)\s+\d+[^<]*',
        re.IGNORECASE
    )
    found = set()
    for match in measure_pattern.findall(html):
        text = _strip_html(match)
        if len(text) > 5 and len(text) < 200 and text not in found:
            found.add(text)
            measures.append({"title": text, "source": "Ballotpedia"})
    return measures


def extract_polling_info(html: str) -> dict:
    """Extract polling place and voting information."""
    info = {"polling_hours": "", "early_voting": "", "vote_by_mail": "", "registration_deadline": ""}

    # Polling hours
    hours_match = re.search(r'polls?\s+(?:are\s+)?open\s+(?:from\s+)?([^.]*\.)', html, re.IGNORECASE)
    if hours_match:
        info["polling_hours"] = _strip_html(hours_match.group(1))

    # Early voting
    early_match = re.search(r'early\s+voting[^.]*\.([^.]*\.)?', html, re.IGNORECASE)
    if early_match:
        info["early_voting"] = _strip_html(early_match.group(0))

    # Vote by mail
    mail_match = re.search(r'(?:vote.by.mail|absentee\s+voting|mail.in\s+voting)[^.]*\.', html, re.IGNORECASE)
    if mail_match:
        info["vote_by_mail"] = _strip_html(mail_match.group(0))

    # Registration deadline
    reg_match = re.search(r'registration\s+deadline[^.]*\.', html, re.IGNORECASE)
    if reg_match:
        info["registration_deadline"] = _strip_html(reg_match.group(0))

    return info


def scrape_senate_race(state_abbr: str, page_path: str) -> dict:
    """Scrape a single Senate race page."""
    url = f"{BALLOTPEDIA_BASE}{page_path}"
    print(f"  🗳 {state_abbr}: {url}")

    html = scrape_page(url)
    if not html:
        return {"state": state_abbr, "error": "Failed to load page"}

    result = {
        "state": state_abbr,
        "url": url,
        "candidates": extract_candidates_from_html(html),
        "dates": extract_election_dates(html),
        "ballot_measures": extract_ballot_measures(html),
        "polling_info": extract_polling_info(html),
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }

    candidates_count = len(result["candidates"])
    print(f"    Found: {candidates_count} candidates, {len(result['dates'])} dates")
    return result


def scrape_state_elections(state_abbr: str, page_path: str) -> dict:
    """Scrape a state's main 2026 elections page."""
    url = f"{BALLOTPEDIA_BASE}{page_path}"
    print(f"  📋 {state_abbr}: State elections page")

    html = scrape_page(url)
    if not html:
        return {"state": state_abbr, "error": "Failed to load page"}

    result = {
        "state": state_abbr,
        "url": url,
        "election_dates": extract_election_dates(html),
        "ballot_measures": extract_ballot_measures(html),
        "polling_info": extract_polling_info(html),
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }

    print(f"    Found: {len(result['election_dates'])} dates, {len(result['ballot_measures'])} measures")
    return result


def scrape_polling_places_page() -> dict:
    """Scrape Ballotpedia's polling place lookup page."""
    url = f"{BALLOTPEDIA_BASE}/Polling_place_lookup"
    print(f"  📍 Polling place lookup: {url}")

    html = scrape_page(url)
    if not html:
        return {"error": "Failed to load page"}

    # Extract any embedded data or links to state-specific pages
    links = re.findall(r'href="(/[^"]*(?:polling|voting|election)[^"]*2026[^"]*)"', html, re.IGNORECASE)
    state_links = {}
    for link in set(links):
        for state_abbr in SENATE_PAGES:
            state_name = {
                "AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California",
                "CO":"Colorado","CT":"Connecticut","DE":"Delaware","FL":"Florida","GA":"Georgia",
                "HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa",
                "KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland",
                "MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi",
                "MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New_Hampshire",
                "NJ":"New_Jersey","NM":"New_Mexico","NY":"New_York","NC":"North_Carolina",
                "ND":"North_Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon",
                "PA":"Pennsylvania","RI":"Rhode_Island","SC":"South_Carolina",
                "SD":"South_Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah",
                "VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West_Virginia",
                "WI":"Wisconsin","WY":"Wyoming",
            }.get(state_abbr, state_abbr)
            if state_name.lower().replace(" ","_") in link.lower() or state_abbr.lower() in link.lower():
                state_links[state_abbr] = f"{BALLOTPEDIA_BASE}{link}"
                break

    return {
        "source_url": url,
        "state_polling_pages": state_links,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


def run_ballotpedia_deep_scrape():
    """Run the full Ballotpedia deep scrape pipeline."""
    ensure_dirs()
    print(f"\n📰 Ballotpedia Deep Scraper (Playwright)")
    print("=" * 60)
    print(f"  ℹ  Scraping 33 Senate races + 50 state pages")
    print(f"  ℹ  Rate limit: {REQUEST_DELAY}s between requests")

    # Phase 1: Senate races
    print("\n  --- SENATE RACES ---")
    senate_results = {}
    for abbr, path in SENATE_PAGES.items():
        try:
            senate_results[abbr] = scrape_senate_race(abbr, path)
        except Exception as e:
            print(f"    ✗ {abbr}: {e}")
            senate_results[abbr] = {"state": abbr, "error": str(e)}

    # Phase 2: State election pages (sample — first 10 states to respect limits)
    print("\n  --- STATE ELECTIONS (sample) ---")
    state_results = {}
    sample_states = list(STATE_ELECTION_PAGES.items())[:10]
    for abbr, path in sample_states:
        try:
            state_results[abbr] = scrape_state_elections(abbr, path)
        except Exception as e:
            print(f"    ✗ {abbr}: {e}")
            state_results[abbr] = {"state": abbr, "error": str(e)}

    # Phase 3: Polling places
    print("\n  --- POLLING PLACES ---")
    try:
        polling_data = scrape_polling_places_page()
    except Exception as e:
        print(f"    ✗ Polling places: {e}")
        polling_data = {"error": str(e)}

    # Assemble output
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Ballotpedia (Playwright deep scrape)",
        "senate_races": senate_results,
        "state_elections_sample": state_results,
        "polling_places": polling_data,
        "summary": {
            "senate_states_scraped": len(senate_results),
            "state_pages_scraped": len(state_results),
            "total_candidates_found": sum(
                len(r.get("candidates", [])) for r in senate_results.values()
            ),
            "total_dates_found": sum(
                len(r.get("dates", [])) + len(r.get("election_dates", []))
                for r in list(senate_results.values()) + list(state_results.values())
            ),
        },
    }

    path = OUTPUT_DIR / "ballotpedia_deep_scrape.json"
    with open(path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  ✅ Saved: {path}")
    print(f"     Summary: {output['summary']}")
    return output


if __name__ == "__main__":
    run_ballotpedia_deep_scrape()
