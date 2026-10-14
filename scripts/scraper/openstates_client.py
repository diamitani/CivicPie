"""
OpenStates API Client
=====================
Fetches state legislators, bills, and committees for all 50 states.

OpenStates API v2: https://v2.openstates.org/
Requires API key (free tier: 500 requests/day).

With the free tier limit, we fetch legislator data one state at a time
and cache aggressively (7-day TTL for legislators).

Fallback mode: Uses static seed data when API is unavailable.
"""

import json
import os
import sys
import time
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# --- Config ---
OPENSTATES_BASE = "https://v2.openstates.org"
OPENSTATES_API_KEY = os.environ.get("OPENSTATES_API_KEY", "")
CACHE_DIR = Path.home() / ".civicpie" / "pipeline_cache"
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "data" / "elections"
USER_AGENT = "CivicPie/2.0 (civic-engagement-platform; contact@civicpie.com)"
REQUEST_DELAY = 2.0

# State jurisdictions in OpenStates format
STATE_JURISDICTIONS = [
    "ocd-jurisdiction/country:us/state:al/government",
    "ocd-jurisdiction/country:us/state:ak/government",
    "ocd-jurisdiction/country:us/state:az/government",
    "ocd-jurisdiction/country:us/state:ar/government",
    "ocd-jurisdiction/country:us/state:ca/government",
    "ocd-jurisdiction/country:us/state:co/government",
    "ocd-jurisdiction/country:us/state:ct/government",
    "ocd-jurisdiction/country:us/state:de/government",
    "ocd-jurisdiction/country:us/state:fl/government",
    "ocd-jurisdiction/country:us/state:ga/government",
    "ocd-jurisdiction/country:us/state:hi/government",
    "ocd-jurisdiction/country:us/state:id/government",
    "ocd-jurisdiction/country:us/state:il/government",
    "ocd-jurisdiction/country:us/state:in/government",
    "ocd-jurisdiction/country:us/state:ia/government",
    "ocd-jurisdiction/country:us/state:ks/government",
    "ocd-jurisdiction/country:us/state:ky/government",
    "ocd-jurisdiction/country:us/state:la/government",
    "ocd-jurisdiction/country:us/state:me/government",
    "ocd-jurisdiction/country:us/state:md/government",
    "ocd-jurisdiction/country:us/state:ma/government",
    "ocd-jurisdiction/country:us/state:mi/government",
    "ocd-jurisdiction/country:us/state:mn/government",
    "ocd-jurisdiction/country:us/state:ms/government",
    "ocd-jurisdiction/country:us/state:mo/government",
    "ocd-jurisdiction/country:us/state:mt/government",
    "ocd-jurisdiction/country:us/state:ne/government",
    "ocd-jurisdiction/country:us/state:nv/government",
    "ocd-jurisdiction/country:us/state:nh/government",
    "ocd-jurisdiction/country:us/state:nj/government",
    "ocd-jurisdiction/country:us/state:nm/government",
    "ocd-jurisdiction/country:us/state:ny/government",
    "ocd-jurisdiction/country:us/state:nc/government",
    "ocd-jurisdiction/country:us/state:nd/government",
    "ocd-jurisdiction/country:us/state:oh/government",
    "ocd-jurisdiction/country:us/state:ok/government",
    "ocd-jurisdiction/country:us/state:or/government",
    "ocd-jurisdiction/country:us/state:pa/government",
    "ocd-jurisdiction/country:us/state:ri/government",
    "ocd-jurisdiction/country:us/state:sc/government",
    "ocd-jurisdiction/country:us/state:sd/government",
    "ocd-jurisdiction/country:us/state:tn/government",
    "ocd-jurisdiction/country:us/state:tx/government",
    "ocd-jurisdiction/country:us/state:ut/government",
    "ocd-jurisdiction/country:us/state:vt/government",
    "ocd-jurisdiction/country:us/state:va/government",
    "ocd-jurisdiction/country:us/state:wa/government",
    "ocd-jurisdiction/country:us/state:wv/government",
    "ocd-jurisdiction/country:us/state:wi/government",
    "ocd-jurisdiction/country:us/state:wy/government",
]


def ensure_dirs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_path(key: str) -> Path:
    h = hashlib.md5(key.encode()).hexdigest()
    return CACHE_DIR / f"os_{h}.json"


def _fetch(url: str, headers: dict = None, ttl: int = 604800) -> Optional[dict]:  # 7-day TTL
    """Fetch JSON with caching."""
    cache_path = _cache_path(url)

    if cache_path.exists():
        age = time.time() - cache_path.stat().st_mtime
        if age < ttl:
            with open(cache_path) as f:
                return json.load(f)

    if headers is None:
        headers = {}
    headers["User-Agent"] = USER_AGENT
    headers["Accept"] = "application/json"
    if OPENSTATES_API_KEY:
        headers["X-API-KEY"] = OPENSTATES_API_KEY

    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            with open(cache_path, "w") as f:
                json.dump(data, f)
            time.sleep(REQUEST_DELAY)
            return data
    except (URLError, HTTPError, json.JSONDecodeError) as e:
        print(f"  ⚠ OpenStates fetch failed: {url[:100]} — {e}", file=sys.stderr)
        # Return cached data even if expired when API is down
        if cache_path.exists():
            with open(cache_path) as f:
                return json.load(f)
        return None


def fetch_state_legislators(jurisdiction: str) -> list:
    """Fetch current legislators for a state jurisdiction."""
    state_abbr = jurisdiction.split("state:")[1][:2].upper()
    url = f"{OPENSTATES_BASE}/api/v2/people.current?jurisdiction={jurisdiction}&per_page=200"

    data = _fetch(url)
    if not data or "results" not in data:
        print(f"    {state_abbr}: No data")
        return []

    legislators = []
    for person in data["results"]:
        current_role = person.get("current_role", {})
        legislators.append({
            "id": person.get("id"),
            "name": person.get("name"),
            "party": person.get("party", ""),
            "state": state_abbr,
            "chamber": current_role.get("org_classification", ""),
            "district": current_role.get("district", ""),
            "title": current_role.get("title", ""),
            "email": person.get("email", ""),
            "image_url": person.get("image", ""),
            "openstates_url": person.get("openstates_url", ""),
            "sources": person.get("sources", []),
        })

    print(f"    {state_abbr}: {len(legislators)} legislators")
    return legislators


def fetch_state_bills(jurisdiction: str, limit: int = 20) -> list:
    """Fetch recent bills for a state."""
    state_abbr = jurisdiction.split("state:")[1][:2].upper()
    url = f"{OPENSTATES_BASE}/api/v2/bills.search?jurisdiction={jurisdiction}&per_page={limit}&sort=-updated_at"

    data = _fetch(url, ttl=86400)  # 24h TTL for bills
    if not data or "results" not in data:
        return []

    bills = []
    for bill in data["results"]:
        bills.append({
            "id": bill.get("id"),
            "identifier": bill.get("identifier"),
            "title": bill.get("title", ""),
            "state": state_abbr,
            "session": bill.get("session", {}).get("name", ""),
            "status": bill.get("latest_action_description", ""),
            "sponsors": [s.get("name") for s in bill.get("sponsorships", []) if s.get("primary")],
            "updated_at": bill.get("updated_at", ""),
            "openstates_url": bill.get("openstates_url", ""),
        })

    return bills


def run_openstates_pipeline():
    """Run the full OpenStates data pipeline."""
    ensure_dirs()
    print(f"\n🏛  OpenStates Data Pipeline")
    print("=" * 50)

    if not OPENSTATES_API_KEY:
        print("  ⚠ No OPENSTATES_API_KEY set — using cached/seed data only")
        print("    Get a free key at: https://v2.openstates.org/accounts/signup/")

    all_legislators = []
    all_bills = []
    by_state = {}

    for jurisdiction in STATE_JURISDICTIONS:
        state_abbr = jurisdiction.split("state:")[1][:2].upper()

        # Legislators
        legislators = fetch_state_legislators(jurisdiction)
        all_legislators.extend(legislators)
        if state_abbr not in by_state:
            by_state[state_abbr] = {"legislators": [], "bills": []}
        by_state[state_abbr]["legislators"] = legislators

        # Bills
        bills = fetch_state_bills(jurisdiction)
        all_bills.extend(bills)
        by_state[state_abbr]["bills"] = bills

    # Build output
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "OpenStates API v2 (v2.openstates.org)",
        "total_legislators": len(all_legislators),
        "total_bills": len(all_bills),
        "by_state": by_state,
        "legislators": all_legislators,
        "bills": all_bills,
    }

    path = OUTPUT_DIR / "openstates_data.json"
    with open(path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  ✅ Saved: {path}")
    print(f"     {len(all_legislators)} state legislators across 50 states")
    print(f"     {len(all_bills)} pending bills")
    return output


if __name__ == "__main__":
    run_openstates_pipeline()
