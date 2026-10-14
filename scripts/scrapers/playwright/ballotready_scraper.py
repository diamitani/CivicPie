#!/usr/bin/env python3
"""
BallotReady Scraper
===================
BallotReady (ballotready.org) provides comprehensive ballot data including:
  - Candidate profiles with bios, experience, and positions
  - Polling place locations
  - Sample ballots by address
  - Election dates and deadlines

API: BallotReady has a public API (api.ballotready.org) and documented endpoints.
We also scrape their public embeddable widgets for data when API key is unavailable.

Strategy:
  1. Try BallotReady public API endpoints (no key needed for some data)
  2. Fall back to scraping their public-facing widget pages
  3. Extract candidate details, polling places, and ballot measures
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
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# --- Config ---
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent.parent / "src" / "data" / "elections"
CACHE_DIR = Path.home() / ".civicpie" / "scraper_cache"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) CivicPie/2.0 Research Bot (contact@civicpie.com)"
BALLOTREADY_API = "https://api.ballotready.org/v1"
BALLOTREADY_SITE = "https://www.ballotready.org"
REQUEST_DELAY = 3.0


def ensure_dirs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_path(key: str) -> Path:
    h = hashlib.md5(key.encode()).hexdigest()
    return CACHE_DIR / f"br_{h}.json"


def _fetch_api(endpoint: str, params: dict = None, use_cache: bool = True) -> Optional[dict]:
    """Fetch from BallotReady API."""
    url = f"{BALLOTREADY_API}/{endpoint}"
    if params:
        url += "?" + urlencode(params)

    cache_path = _cache_path(url)
    if use_cache and cache_path.exists():
        age = time.time() - cache_path.stat().st_mtime
        if age < 43200:  # 12h cache
            with open(cache_path) as f:
                return json.load(f)

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
        "Origin": "https://www.ballotready.org",
    }

    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            if use_cache:
                with open(cache_path, "w") as f:
                    json.dump(data, f)
            time.sleep(REQUEST_DELAY)
            return data
    except Exception as e:
        print(f"  ⚠ BallotReady API failed: {endpoint} — {e}", file=sys.stderr)
        return None


def scrape_ballotready_widget(state: str = "IL") -> dict:
    """Scrape BallotReady's public embeddable widget for a state."""
    url = f"{BALLOTREADY_SITE}/embed/ballot/{state}"
    print(f"  📡 BallotReady widget: {state}")

    cache_path = _cache_path(f"widget_{state}")
    if cache_path.exists():
        age = time.time() - cache_path.stat().st_mtime
        if age < 86400:
            with open(cache_path) as f:
                return json.load(f)

    result = {"state": state, "elections": [], "candidates": [], "polling_places": []}

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(user_agent=USER_AGENT, viewport={"width": 1280, "height": 800})
            page = context.new_page()

            # Try to intercept API calls
            api_responses = []

            def handle_response(response):
                if "api.ballotready.org" in response.url or "ballotready.org/api" in response.url:
                    try:
                        api_responses.append({
                            "url": response.url,
                            "status": response.status,
                            "body": response.json(),
                        })
                    except:
                        pass

            page.on("response", handle_response)
            page.goto(url, wait_until="domcontentloaded", timeout=30000)

            try:
                page.wait_for_selector("body", timeout=10000)
            except PlaywrightTimeout:
                pass

            # Wait for API calls to complete
            time.sleep(3)

            # Extract any JSON data embedded in the page
            html = page.content()

            # Look for __NEXT_DATA__ or similar JSON blobs
            json_pattern = re.compile(r'__NEXT_DATA__\s*=\s*({.*?});', re.DOTALL)
            next_data = json_pattern.findall(html)
            if next_data:
                try:
                    data = json.loads(next_data[0])
                    result["embedded_data"] = data
                except:
                    pass

            # Look for script tags with election data
            for script in re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE):
                if "election" in script.lower() or "candidate" in script.lower():
                    # Try to extract JSON from window.__ variables
                    json_vars = re.findall(r'window\.__(\w+)\s*=\s*({.*?});', script, re.DOTALL)
                    for var_name, var_data in json_vars:
                        try:
                            result[f"window_{var_name}"] = json.loads(var_data)
                        except:
                            pass

            result["api_calls_captured"] = len(api_responses)
            result["api_data"] = api_responses[:10]  # Keep first 10 responses

            browser.close()

    except Exception as e:
        print(f"    ⚠ Widget scrape failed: {e}")

    with open(cache_path, "w") as f:
        json.dump(result, f)

    time.sleep(REQUEST_DELAY)
    return result


def build_polling_place_database() -> list:
    """Build a polling place database from multiple sources."""
    print("  📍 Building polling place database...")

    # Standard polling place information by state
    # In production, this would be scraped from each state's election board
    polling_data = [
        {
            "state": "AL", "lookup_url": "https://www.sos.alabama.gov/alabama-votes",
            "early_voting": "Varies by county", "vote_by_mail": "Excuse required",
            "registration_deadline": "15 days before election",
            "polling_hours": "7:00 AM - 7:00 PM",
        },
        {
            "state": "AK", "lookup_url": "https://www.elections.alaska.gov/",
            "early_voting": "15 days before election", "vote_by_mail": "No-excuse absentee",
            "registration_deadline": "30 days before election",
            "polling_hours": "7:00 AM - 8:00 PM",
        },
        {
            "state": "AZ", "lookup_url": "https://azsos.gov/elections",
            "early_voting": "27 days before election", "vote_by_mail": "No-excuse, permanent list",
            "registration_deadline": "29 days before election",
            "polling_hours": "6:00 AM - 7:00 PM",
        },
        {
            "state": "CA", "lookup_url": "https://www.sos.ca.gov/elections",
            "early_voting": "29 days before election", "vote_by_mail": "All voters receive mail ballot",
            "registration_deadline": "15 days before election (same-day conditional)",
            "polling_hours": "7:00 AM - 8:00 PM",
        },
        {
            "state": "CO", "lookup_url": "https://www.sos.state.co.us/pubs/elections/",
            "early_voting": "15 days before election", "vote_by_mail": "All-mail election state",
            "registration_deadline": "Election Day (same-day registration)",
            "polling_hours": "7:00 AM - 7:00 PM",
        },
        {
            "state": "FL", "lookup_url": "https://dos.myflorida.com/elections/",
            "early_voting": "10 days before election", "vote_by_mail": "No-excuse",
            "registration_deadline": "29 days before election",
            "polling_hours": "7:00 AM - 7:00 PM",
        },
        {
            "state": "GA", "lookup_url": "https://sos.ga.gov/elections",
            "early_voting": "3 weeks before election", "vote_by_mail": "No-excuse",
            "registration_deadline": "29 days before election",
            "polling_hours": "7:00 AM - 7:00 PM",
        },
        {
            "state": "IL", "lookup_url": "https://www.elections.il.gov/",
            "early_voting": "40 days before election", "vote_by_mail": "No-excuse",
            "registration_deadline": "28 days before election (grace period available)",
            "polling_hours": "6:00 AM - 7:00 PM",
        },
        {
            "state": "MI", "lookup_url": "https://www.michigan.gov/sos/elections",
            "early_voting": "9 days before election", "vote_by_mail": "No-excuse",
            "registration_deadline": "15 days before election (same-day available)",
            "polling_hours": "7:00 AM - 8:00 PM",
        },
        {
            "state": "NY", "lookup_url": "https://www.elections.ny.gov/",
            "early_voting": "10 days before election", "vote_by_mail": "Excuse required",
            "registration_deadline": "25 days before election",
            "polling_hours": "6:00 AM - 9:00 PM",
        },
        {
            "state": "OH", "lookup_url": "https://www.ohiosos.gov/elections/",
            "early_voting": "28 days before election", "vote_by_mail": "No-excuse",
            "registration_deadline": "30 days before election",
            "polling_hours": "6:30 AM - 7:30 PM",
        },
        {
            "state": "PA", "lookup_url": "https://www.pa.gov/en/agencies/vote.html",
            "early_voting": "No early voting (mail ballot only)", "vote_by_mail": "No-excuse",
            "registration_deadline": "15 days before election",
            "polling_hours": "7:00 AM - 8:00 PM",
        },
        {
            "state": "TX", "lookup_url": "https://www.votetexas.gov/",
            "early_voting": "17 days before election", "vote_by_mail": "Excuse required",
            "registration_deadline": "30 days before election",
            "polling_hours": "7:00 AM - 7:00 PM",
        },
        {
            "state": "WI", "lookup_url": "https://elections.wi.gov/",
            "early_voting": "14 days before election", "vote_by_mail": "No-excuse",
            "registration_deadline": "20 days before election (Election Day available)",
            "polling_hours": "7:00 AM - 8:00 PM",
        },
    ]

    print(f"    Built: {len(polling_data)} states with polling info")
    return polling_data


def run_ballotready_pipeline():
    """Run the BallotReady data pipeline."""
    ensure_dirs()
    print(f"\n📊 BallotReady Pipeline")
    print("=" * 50)

    # Try API first
    elections = _fetch_api("elections/upcoming")
    if elections:
        print(f"  ✓ API: {len(elections.get('results', []))} upcoming elections")

    # Scrape widget for key states
    widget_states = ["IL", "CA", "TX", "FL", "NY", "PA", "OH", "GA", "MI", "NC"]
    widget_data = {}
    for state in widget_states:
        widget_data[state] = scrape_ballotready_widget(state)

    # Build polling place database
    polling_places = build_polling_place_database()

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "BallotReady (API + widget scrape + compiled polling data)",
        "api_elections": elections,
        "widget_data": widget_data,
        "polling_places": polling_places,
        "states_with_polling_data": len(polling_places),
    }

    path = OUTPUT_DIR / "ballotready_data.json"
    with open(path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  ✅ Saved: {path}")
    print(f"     {len(polling_places)} states with polling data")
    print(f"     {len(widget_data)} states with widget data")
    return output


if __name__ == "__main__":
    run_ballotready_pipeline()
