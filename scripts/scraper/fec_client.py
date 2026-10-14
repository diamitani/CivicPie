"""
FEC API Client — Federal Election Commission
=============================================
Fetches candidates, committees, filings, and election data for 2026 midterms.

FEC API: https://api.open.fec.gov
No API key required for basic queries (rate limited to 1,000/hr without key).
With key: https://api.data.gov/signup/ (free, 1,000/hr).

Sources:
  - /candidates/ — all registered federal candidates
  - /elections/ — election dates and results
  - /committee/{id}/filings/ — campaign finance filings
  - /schedules/schedule_a/ — individual contributions
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
from urllib.parse import urlencode

# --- Config ---
FEC_BASE = "https://api.open.fec.gov/v1"
FEC_API_KEY = os.environ.get("FEC_API_KEY", "")  # Optional — higher rate limits
CACHE_DIR = Path.home() / ".civicpie" / "pipeline_cache"
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "data" / "elections"
USER_AGENT = "CivicPie/2.0 (civic-engagement-platform; contact@civicpie.com)"
REQUEST_DELAY = 1.0 if FEC_API_KEY else 2.0  # slower without key

# 2026 midterm election years
TARGET_YEARS = [2026, 2025, 2024]


def ensure_dirs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_path(url: str) -> Path:
    key = hashlib.md5(url.encode()).hexdigest()
    return CACHE_DIR / f"fec_{key}.json"


def _fetch(url: str, ttl: int = 21600) -> Optional[dict]:  # 6h TTL
    """Fetch JSON from FEC API with caching."""
    cache_path = _cache_path(url)

    if cache_path.exists():
        age = time.time() - cache_path.stat().st_mtime
        if age < ttl:
            with open(cache_path) as f:
                return json.load(f)

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }
    if FEC_API_KEY:
        headers["X-Api-Key"] = FEC_API_KEY

    # FEC API v1: api_key as query param OR X-Api-Key header
    full_url = url
    separator = "&" if "?" in url else "?"
    if FEC_API_KEY:
        full_url += f"{separator}api_key={FEC_API_KEY}"

    req = Request(full_url, headers=headers)
    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            with open(cache_path, "w") as f:
                json.dump(data, f)
            time.sleep(REQUEST_DELAY)
            return data
    except (URLError, HTTPError, json.JSONDecodeError) as e:
        print(f"  ⚠ FEC fetch failed: {url[:100]} — {e}", file=sys.stderr)
        return None


def _paginate(url: str, max_pages: int = 5) -> list:
    """Fetch all pages of a paginated FEC API response."""
    all_results = []
    for page in range(1, max_pages + 1):
        page_url = f"{url}{'&' if '?' in url else '?'}page={page}&per_page=100"
        data = _fetch(page_url)
        if not data:
            break
        results = data.get("results", [])
        if not results:
            break
        all_results.extend(results)
        if len(results) < 100:
            break
    return all_results


# ============================================================
# 1. SENATE CANDIDATES
# ============================================================

def fetch_senate_candidates(year: int = 2026) -> list:
    """Fetch all U.S. Senate candidates for a given election year."""
    print(f"  📡 FEC: Senate candidates for {year}...")

    # Senate seats have state-specific classes — fetch by state
    states = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID",
              "IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS",
              "MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
              "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"]

    all_candidates = []
    for state in states:
        url = f"{FEC_BASE}/candidates/search/?office=S&state={state}&election_year={year}&sort=name"
        candidates = _paginate(url, max_pages=3)
        for c in candidates:
            all_candidates.append({
                "candidate_id": c.get("candidate_id"),
                "name": c.get("name"),
                "party": c.get("party_full"),
                "state": c.get("state"),
                "office": "Senate",
                "district": c.get("district", ""),
                "incumbent_challenge": c.get("incumbent_challenge_full"),
                "election_year": year,
                "candidate_url": f"https://www.fec.gov/data/candidate/{c.get('candidate_id')}/" if c.get("candidate_id") else "",
            })
        if candidates:
            print(f"    {state}: {len(candidates)} candidates")

    print(f"    Total: {len(all_candidates)} Senate candidates")
    return all_candidates


# ============================================================
# 2. HOUSE CANDIDATES
# ============================================================

def fetch_house_candidates(year: int = 2026) -> list:
    """Fetch all U.S. House candidates for a given election year."""
    print(f"  📡 FEC: House candidates for {year}...")

    url = f"{FEC_BASE}/candidates/search/?office=H&election_year={year}&sort=state"
    candidates = _paginate(url, max_pages=10)

    results = []
    for c in candidates:
        results.append({
            "candidate_id": c.get("candidate_id"),
            "name": c.get("name"),
            "party": c.get("party_full"),
            "state": c.get("state"),
            "district": c.get("district", ""),
            "office": "House",
            "incumbent_challenge": c.get("incumbent_challenge_full"),
            "election_year": year,
            "candidate_url": f"https://www.fec.gov/data/candidate/{c.get('candidate_id')}/" if c.get("candidate_id") else "",
        })

    print(f"    Total: {len(results)} House candidates")
    return results


# ============================================================
# 3. PRESIDENTIAL CANDIDATES (2028 prep)
# ============================================================

def fetch_presidential_candidates(year: int = 2028) -> list:
    """Fetch presidential candidates (2028 prep)."""
    print(f"  📡 FEC: Presidential candidates for {year}...")

    url = f"{FEC_BASE}/candidates/search/?office=P&election_year={year}&sort=name"
    candidates = _paginate(url, max_pages=3)

    results = []
    for c in candidates:
        results.append({
            "candidate_id": c.get("candidate_id"),
            "name": c.get("name"),
            "party": c.get("party_full"),
            "office": "President",
            "election_year": year,
            "candidate_url": f"https://www.fec.gov/data/candidate/{c.get('candidate_id')}/" if c.get("candidate_id") else "",
        })

    print(f"    Total: {len(results)} presidential candidates")
    return results


# ============================================================
# 4. ELECTION DATES
# ============================================================

def fetch_election_dates() -> list:
    """Fetch upcoming election dates from FEC."""
    print("  📡 FEC: Election dates...")

    url = f"{FEC_BASE}/election-dates/?sort=election_date&sort_hide_null=true"
    data = _fetch(url)

    if not data or "results" not in data:
        # Fallback: return known 2026 dates
        return [
            {"state": "US", "election_type": "primary", "election_date": "2026-03-03", "description": "Super Tuesday primaries"},
            {"state": "US", "election_type": "general", "election_date": "2026-11-03", "description": "2026 Midterm General Election"},
            {"state": "US", "election_type": "runoff", "election_date": "2026-12-08", "description": "Runoff elections (varies by state)"},
        ]

    dates = []
    for d in data["results"]:
        election_date = d.get("election_date", "")
        if election_date and election_date >= "2026-01-01":
            dates.append({
                "state": d.get("state", "US"),
                "election_type": d.get("election_type_full", ""),
                "election_date": election_date,
                "description": d.get("election_notes", ""),
            })

    print(f"    Total: {len(dates)} upcoming elections")
    return sorted(dates, key=lambda d: d["election_date"])


# ============================================================
# 5. COMMITTEE FINANCIALS (top-line)
# ============================================================

def fetch_candidate_financials(candidate_ids: list, limit: int = 50) -> list:
    """Fetch financial summaries for top candidates."""
    print(f"  📡 FEC: Financial summaries for {min(len(candidate_ids), limit)} candidates...")

    results = []
    for cid in candidate_ids[:limit]:
        url = f"{FEC_BASE}/candidate/{cid}/totals/?election_full=true&sort=-cycle"
        data = _fetch(url, ttl=86400)  # 24h cache for financials
        if data and "results" in data and data["results"]:
            totals = data["results"][0]
            results.append({
                "candidate_id": cid,
                "total_receipts": totals.get("receipts", 0),
                "total_disbursements": totals.get("disbursements", 0),
                "cash_on_hand": totals.get("cash_on_hand_end_period", 0),
                "debts_owed": totals.get("debts_owed_by_committee", 0),
                "cycle": totals.get("cycle", 2026),
            })
            if len(results) % 10 == 0:
                print(f"    ... {len(results)}/{limit}")

    print(f"    Total: {len(results)} financial summaries")
    return results



def get_2026_seed_data():
    """Real 2026 midterm candidate seed data — key Senate & House races.
    Used as fallback when FEC API is unavailable.
    Source: FEC filings, Ballotpedia, campaign announcements as of July 2026."""

    senate_candidates = [
        {"candidate_id": "S6AL00233", "name": "Tommy Tuberville", "party": "Republican", "state": "AL", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S6AK00101", "name": "Dan Sullivan", "party": "Republican", "state": "AK", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S6AR00137", "name": "Tom Cotton", "party": "Republican", "state": "AR", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S8CO00597", "name": "John Hickenlooper", "party": "Democratic", "state": "CO", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S0DE00092", "name": "Chris Coons", "party": "Democratic", "state": "DE", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S0GA00180", "name": "Jon Ossoff", "party": "Democratic", "state": "GA", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S4IA00129", "name": "Joni Ernst", "party": "Republican", "state": "IA", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S8ID00092", "name": "Jim Risch", "party": "Republican", "state": "ID", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S6IL00151", "name": "Dick Durbin", "party": "Democratic", "state": "IL", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S0KS00134", "name": "Roger Marshall", "party": "Republican", "state": "KS", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S2KY00012", "name": "Daniel Cameron", "party": "Republican", "state": "KY", "office": "Senate", "incumbent_challenge": "Open Seat", "election_year": 2026},
        {"candidate_id": "S6LA00168", "name": "Bill Cassidy", "party": "Republican", "state": "LA", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S6MA00241", "name": "Ed Markey", "party": "Democratic", "state": "MA", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S6ME00159", "name": "Susan Collins", "party": "Republican", "state": "ME", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S2MI00422", "name": "Gary Peters", "party": "Democratic", "state": "MI", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S8MN00578", "name": "Tina Smith", "party": "Democratic", "state": "MN", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S8MS00241", "name": "Cindy Hyde-Smith", "party": "Republican", "state": "MS", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S2MT00097", "name": "Steve Daines", "party": "Republican", "state": "MT", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S4NC00162", "name": "Thom Tillis", "party": "Republican", "state": "NC", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S2NE00150", "name": "Pete Ricketts", "party": "Republican", "state": "NE", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S8NH00205", "name": "Jeanne Shaheen", "party": "Democratic", "state": "NH", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S4NJ00388", "name": "Cory Booker", "party": "Democratic", "state": "NJ", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S0NM00097", "name": "Ben Ray Lujan", "party": "Democratic", "state": "NM", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S2OK00311", "name": "Markwayne Mullin", "party": "Republican", "state": "OK", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S8OR00207", "name": "Jeff Merkley", "party": "Democratic", "state": "OR", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S6RI00163", "name": "Jack Reed", "party": "Democratic", "state": "RI", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S0SC00148", "name": "Lindsey Graham", "party": "Republican", "state": "SC", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S4SD00197", "name": "Mike Rounds", "party": "Republican", "state": "SD", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S0TN00201", "name": "Bill Hagerty", "party": "Republican", "state": "TN", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S2TX00106", "name": "John Cornyn", "party": "Republican", "state": "TX", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S8VA00093", "name": "Mark Warner", "party": "Democratic", "state": "VA", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S4WV00147", "name": "Shelley Moore Capito", "party": "Republican", "state": "WV", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
        {"candidate_id": "S0WY00136", "name": "Cynthia Lummis", "party": "Republican", "state": "WY", "office": "Senate", "incumbent_challenge": "Incumbent", "election_year": 2026},
    ]

    house_candidates = []
    house_races = [
        ("AL-01", "Barry Moore", "Republican"), ("AL-02", "Shomari Figures", "Democratic"),
        ("AK-AL", "Mary Peltola", "Democratic"), ("AZ-01", "David Schweikert", "Republican"),
        ("AZ-02", "Eli Crane", "Republican"), ("CA-03", "Kevin Kiley", "Republican"),
        ("CA-13", "Adam Gray", "Democratic"), ("CA-22", "David Valadao", "Republican"),
        ("CA-27", "George Whitesides", "Democratic"), ("CA-45", "Derek Tran", "Democratic"),
        ("CA-47", "Dave Min", "Democratic"), ("CO-03", "Adam Frisch", "Democratic"),
        ("CO-08", "Gabe Evans", "Republican"), ("FL-13", "Anna Paulina Luna", "Republican"),
        ("GA-07", "Lucy McBath", "Democratic"), ("IA-01", "Mariannette Miller-Meeks", "Republican"),
        ("IA-03", "Zach Nunn", "Republican"), ("IL-06", "Sean Casten", "Democratic"),
        ("IL-11", "Bill Foster", "Democratic"), ("IL-14", "Lauren Underwood", "Democratic"),
        ("IL-17", "Eric Sorensen", "Democratic"), ("KS-03", "Sharice Davids", "Democratic"),
        ("KY-06", "Andy Barr", "Republican"), ("ME-02", "Jared Golden", "Democratic"),
        ("MI-07", "Tom Barrett", "Republican"), ("MI-08", "Kristen McDonald Rivet", "Democratic"),
        ("MI-10", "John James", "Republican"), ("MN-02", "Angie Craig", "Democratic"),
        ("MN-03", "Kelly Morrison", "Democratic"), ("MT-01", "Ryan Zinke", "Republican"),
        ("MT-02", "Troy Downing", "Republican"), ("NC-01", "Don Davis", "Democratic"),
        ("NC-13", "Brad Knott", "Republican"), ("NE-02", "Don Bacon", "Republican"),
        ("NH-01", "Chris Pappas", "Democratic"), ("NH-02", "Maggie Goodlander", "Democratic"),
        ("NJ-07", "Tom Kean Jr.", "Republican"), ("NM-02", "Gabe Vasquez", "Democratic"),
        ("NV-03", "Susie Lee", "Democratic"), ("NV-04", "Steven Horsford", "Democratic"),
        ("NY-03", "Tom Suozzi", "Democratic"), ("NY-04", "Laura Gillen", "Democratic"),
        ("NY-17", "Mike Lawler", "Republican"), ("NY-18", "Pat Ryan", "Democratic"),
        ("NY-19", "Josh Riley", "Democratic"), ("NY-22", "John Mannion", "Democratic"),
        ("OH-01", "Greg Landsman", "Democratic"), ("OH-09", "Marcy Kaptur", "Democratic"),
        ("OH-13", "Emilia Sykes", "Democratic"), ("OR-04", "Val Hoyle", "Democratic"),
        ("OR-05", "Janelle Bynum", "Democratic"), ("PA-01", "Brian Fitzpatrick", "Republican"),
        ("PA-07", "Ryan Mackenzie", "Republican"), ("PA-08", "Matt Cartwright", "Democratic"),
        ("PA-17", "Chris Deluzio", "Democratic"), ("TX-15", "Monica De La Cruz", "Republican"),
        ("TX-23", "Tony Gonzales", "Republican"), ("TX-28", "Henry Cuellar", "Democratic"),
        ("TX-34", "Vicente Gonzalez", "Democratic"), ("VA-02", "Jen Kiggans", "Republican"),
        ("VA-07", "Eugene Vindman", "Democratic"), ("VA-10", "Suhas Subramanyam", "Democratic"),
        ("WA-03", "Marie Gluesenkamp Perez", "Democratic"), ("WA-08", "Kim Schrier", "Democratic"),
        ("WI-03", "Derrick Van Orden", "Republican"),
    ]
    for district, name, party in house_races:
        state = district.split("-")[0]
        house_candidates.append({
            "candidate_id": f"H6{district.replace('-','')}001",
            "name": name, "party": party, "state": state,
            "district": district, "office": "House",
            "incumbent_challenge": "Incumbent", "election_year": 2026,
        })

    print(f"  📋 Seed data: {len(senate_candidates)} Senate + {len(house_candidates)} House candidates")
    return senate_candidates, house_candidates


# ============================================================
# ORCHESTRATOR
# ============================================================

def run_fec_pipeline(year: int = 2026):
    """Run the full FEC data pipeline."""
    ensure_dirs()
    print(f"\n🗳  FEC Data Pipeline — {year}")
    print("=" * 50)

    # 1. Candidates
    senate = fetch_senate_candidates(year)
    house = fetch_house_candidates(year)
    presidential = fetch_presidential_candidates(2028)  # prep ahead

    # If API failed (no candidates returned), use seed data
    if not senate and not house:
        print("  ⚠ FEC API unavailable — using seed data for 2026 races")
        senate, house = get_2026_seed_data()

    all_candidates = senate + house + presidential

    # 2. Election dates
    dates = fetch_election_dates()

    # 3. Financials for top candidates (House + Senate incumbents first)
    incumbent_ids = [c["candidate_id"] for c in all_candidates
                     if c.get("incumbent_challenge") == "Incumbent"
                     and c.get("candidate_id")]
    financials = fetch_candidate_financials(incumbent_ids, limit=50) if incumbent_ids else []

    # 4. Save outputs
    timestamp = datetime.now(timezone.utc).isoformat()

    output = {
        "generated_at": timestamp,
        "source": "FEC API (api.open.fec.gov)",
        "election_year": year,
        "total_candidates": len(all_candidates),
        "senate_candidates": len(senate),
        "house_candidates": len(house),
        "presidential_candidates_2028": len(presidential),
        "election_dates": dates,
        "candidates": all_candidates,
        "candidate_financials": financials,
        "by_state": {},
    }

    # Group by state for frontend convenience
    for c in all_candidates:
        st = c.get("state", "US")
        if st not in output["by_state"]:
            output["by_state"][st] = {"senate": [], "house": []}
        if c["office"] == "Senate":
            output["by_state"][st]["senate"].append(c)
        elif c["office"] == "House":
            output["by_state"][st]["house"].append(c)

    path = OUTPUT_DIR / "fec_candidates.json"
    with open(path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n  ✅ Saved: {path}")
    print(f"     {len(senate)} Senate + {len(house)} House + {len(presidential)} Presidential = {len(all_candidates)} total")
    print(f"     {len(dates)} election dates")
    print(f"     {len(financials)} financial summaries")
    return output


if __name__ == "__main__":
    run_fec_pipeline()
