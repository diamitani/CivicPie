#!/usr/bin/env python3
"""
CivicPie Nationwide Data Pipeline v2.0
=======================================
Generates the complete USA civic engagement knowledge base.

Layers:
  1. FOUNDATION — Every federal/state/local agency, every elected official, every district
  2. ENGAGEMENT — Events, meetings, grants, deadlines, announcements
  3. ACTION — Legislative transcripts, bill tracking, community tools

Output: Static JSON files for the CivicPie frontend (src/data/generated/)

Usage:
  python3 scripts/pipeline.py --phase foundation
  python3 scripts/pipeline.py --phase all
"""

import argparse
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
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "src" / "data" / "generated"
USER_AGENT = "CivicPie/2.0 (civic-engagement-platform; contact@civicpie.com)"
REQUEST_DELAY = 1.0  # seconds between API calls
CACHE_DIR = Path.home() / ".civicpie" / "pipeline_cache"

# --- Helpers ---

def ensure_dirs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

def cached_fetch(url: str, cache_key: str = None, ttl: int = 86400) -> Optional[dict]:
    """Fetch JSON with caching (24h TTL default)."""
    if cache_key is None:
        cache_key = hashlib.md5(url.encode()).hexdigest()
    cache_path = CACHE_DIR / f"{cache_key}.json"

    if cache_path.exists():
        age = time.time() - cache_path.stat().st_mtime
        if age < ttl:
            with open(cache_path) as f:
                return json.load(f)

    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            with open(cache_path, "w") as f:
                json.dump(data, f)
            time.sleep(REQUEST_DELAY)
            return data
    except (URLError, HTTPError, json.JSONDecodeError) as e:
        print(f"  ⚠ Fetch failed: {url[:80]}... — {e}", file=sys.stderr)
        return None

def save_json(filename: str, data):
    path = OUTPUT_DIR / filename
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  ✓ Saved: {path} ({len(data)} entries)")

# ============================================================
# PHASE 1: FOUNDATION — Agencies & Officials
# ============================================================

def build_federal_agencies():
    """Federal agency directory with descriptions and services."""
    print("\n📦 PHASE 1a: Federal Agencies")

    agencies = [
        {"id": "hhs", "name": "U.S. Department of Health & Human Services", "abbr": "HHS", "level": "federal",
         "description": "Protects the health of all Americans and provides essential human services.",
         "website": "https://www.hhs.gov", "services": ["Medicare", "Medicaid", "CDC", "FDA", "NIH", "Health Insurance Marketplace"]},
        {"id": "ed", "name": "U.S. Department of Education", "abbr": "ED", "level": "federal",
         "description": "Promotes student achievement and preparation for global competitiveness.",
         "website": "https://www.ed.gov", "services": ["Federal Student Aid (FAFSA)", "Pell Grants", "Special Education", "Civil Rights in Education"]},
        {"id": "hud", "name": "U.S. Department of Housing & Urban Development", "abbr": "HUD", "level": "federal",
         "description": "Creates strong, sustainable, inclusive communities and quality affordable homes.",
         "website": "https://www.hud.gov", "services": ["FHA Loans", "Housing Choice Vouchers", "Community Development Block Grants", "Fair Housing"]},
        {"id": "sba", "name": "Small Business Administration", "abbr": "SBA", "level": "federal",
         "description": "Aids, counsels, assists and protects the interests of small businesses.",
         "website": "https://www.sba.gov", "services": ["7(a) Loans", "Disaster Assistance", "Government Contracting", "Small Business Development Centers"]},
        {"id": "usda", "name": "U.S. Department of Agriculture", "abbr": "USDA", "level": "federal",
         "description": "Provides leadership on food, agriculture, natural resources, and rural development.",
         "website": "https://www.usda.gov", "services": ["SNAP (Food Stamps)", "WIC", "Rural Development Grants", "Farm Loans"]},
        {"id": "dol", "name": "U.S. Department of Labor", "abbr": "DOL", "level": "federal",
         "description": "Promotes the welfare of job seekers, wage earners, and retirees.",
         "website": "https://www.dol.gov", "services": ["Unemployment Insurance", "OSHA Workplace Safety", "Job Corps", "Apprenticeship Programs"]},
        {"id": "ssa", "name": "Social Security Administration", "abbr": "SSA", "level": "federal",
         "description": "Delivers Social Security services that meet the changing needs of the public.",
         "website": "https://www.ssa.gov", "services": ["Retirement Benefits", "Disability Insurance (SSDI)", "Supplemental Security Income (SSI)", "Medicare Enrollment"]},
        {"id": "va", "name": "U.S. Department of Veterans Affairs", "abbr": "VA", "level": "federal",
         "description": "Cares for those who have served in our nation's military.",
         "website": "https://www.va.gov", "services": ["VA Healthcare", "Disability Compensation", "GI Bill Education Benefits", "VA Home Loans"]},
        {"id": "irs", "name": "Internal Revenue Service", "abbr": "IRS", "level": "federal",
         "description": "Provides America's taxpayers top quality service by helping them understand and meet their tax responsibilities.",
         "website": "https://www.irs.gov", "services": ["Tax Filing", "Earned Income Tax Credit", "Child Tax Credit", "Free File"]},
        {"id": "epa", "name": "Environmental Protection Agency", "abbr": "EPA", "level": "federal",
         "description": "Protects human health and the environment.",
         "website": "https://www.epa.gov", "services": ["Environmental Grants", "Clean Water SRF", "Brownfields Program", "Air Quality Monitoring"]},
        {"id": "fema", "name": "Federal Emergency Management Agency", "abbr": "FEMA", "level": "federal",
         "description": "Helps people before, during and after disasters.",
         "website": "https://www.fema.gov", "services": ["Disaster Relief", "Flood Insurance", "Emergency Preparedness", "Hazard Mitigation Grants"]},
        {"id": "dot", "name": "U.S. Department of Transportation", "abbr": "DOT", "level": "federal",
         "description": "Ensures a fast, safe, efficient, accessible and convenient transportation system.",
         "website": "https://www.transportation.gov", "services": ["Highway Funding", "Transit Grants", "Aviation Safety", "Infrastructure Investment"]},
        {"id": "doj", "name": "U.S. Department of Justice", "abbr": "DOJ", "level": "federal",
         "description": "Enforces the law and defends the interests of the United States.",
         "website": "https://www.justice.gov", "services": ["Civil Rights Division", "FBI", "COPS Grants", "Violence Against Women Grants"]},
        {"id": "dhs", "name": "U.S. Department of Homeland Security", "abbr": "DHS", "level": "federal",
         "description": "Secures the nation from the many threats we face.",
         "website": "https://www.dhs.gov", "services": ["FEMA", "TSA", "Cybersecurity (CISA)", "Immigration Services (USCIS)"]},
        {"id": "doi", "name": "U.S. Department of the Interior", "abbr": "DOI", "level": "federal",
         "description": "Protects and manages the Nation's natural resources and cultural heritage.",
         "website": "https://www.doi.gov", "services": ["National Parks", "Bureau of Indian Affairs", "Land Management", "Fish & Wildlife"]},
        {"id": "doe", "name": "U.S. Department of Energy", "abbr": "DOE", "level": "federal",
         "description": "Addresses America's energy, environmental and nuclear challenges.",
         "website": "https://www.energy.gov", "services": ["Energy Efficiency Grants", "Solar Energy", "Nuclear Security", "National Labs"]},
        {"id": "state", "name": "U.S. Department of State", "abbr": "DOS", "level": "federal",
         "description": "Leads America's foreign policy to advance the interests and security of the American people.",
         "website": "https://www.state.gov", "services": ["Passports", "Visas", "Travel Advisories", "Foreign Aid"]},
        {"id": "treasury", "name": "U.S. Department of the Treasury", "abbr": "Treasury", "level": "federal",
         "description": "Maintains a strong economy and creates economic and job opportunities.",
         "website": "https://home.treasury.gov", "services": ["IRS", "Treasury Bonds", "Economic Relief", "Financial Sanctions"]},
        {"id": "dod", "name": "U.S. Department of Defense", "abbr": "DOD", "level": "federal",
         "description": "Provides the military forces needed to deter war and ensure national security.",
         "website": "https://www.defense.gov", "services": ["Military Benefits", "TRICARE", "Defense Contracts", "National Guard"]},
        {"id": "nara", "name": "National Archives & Records Administration", "abbr": "NARA", "level": "federal",
         "description": "Preserves and documents government and historical records.",
         "website": "https://www.archives.gov", "services": ["Federal Register", "Presidential Documents", "Genealogy Records", "FOIA Requests"]},
    ]
    save_json("federal_agencies.json", agencies)
    return agencies


def build_state_agencies():
    """Generate state agency templates for all 50 states."""
    print("\n📦 PHASE 1b: State Agencies")

    STATE_AGENCY_TEMPLATES = [
        {"type": "health", "name": "{state} Department of Health", "services": ["Vital Records", "Medicaid State", "WIC", "Immunizations"]},
        {"type": "education", "name": "{state} Department of Education", "services": ["K-12 Standards", "Teacher Certification", "School Funding", "Special Education"]},
        {"type": "transportation", "name": "{state} Department of Transportation", "services": ["Driver's Licenses", "Vehicle Registration", "Road Conditions", "Transit"]},
        {"type": "labor", "name": "{state} Department of Labor", "services": ["Unemployment Benefits", "Job Search", "Workforce Training", "Labor Laws"]},
        {"type": "revenue", "name": "{state} Department of Revenue", "services": ["State Tax Filing", "Property Tax Info", "Tax Credits", "Business Registration"]},
        {"type": "natural_resources", "name": "{state} Department of Natural Resources", "services": ["State Parks", "Fishing/Hunting Licenses", "Conservation", "Environmental Permits"]},
        {"type": "public_safety", "name": "{state} State Police / Highway Patrol", "services": ["Traffic Safety", "Criminal Investigations", "Emergency Response"]},
        {"type": "commerce", "name": "{state} Department of Commerce", "services": ["Business Licenses", "Economic Development", "Trade", "Professional Licensing"]},
        {"type": "veterans", "name": "{state} Department of Veterans Affairs", "services": ["Veteran Benefits", "Burial Services", "Education Assistance", "VA Claims Help"]},
        {"type": "aging", "name": "{state} Department of Aging / Senior Services", "services": ["Senior Centers", "Meals on Wheels", "Medicare Counseling", "Elder Abuse Prevention"]},
        {"type": "elections", "name": "{state} Board of Elections", "services": ["Voter Registration", "Polling Places", "Election Results", "Campaign Finance"]},
        {"type": "insurance", "name": "{state} Department of Insurance", "services": ["Insurance Complaints", "Rate Review", "Consumer Protection", "Licensing"]},
    ]

    US_STATES_NAMES = [
        "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
        "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
        "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
        "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
        "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
        "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
        "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
        "Wisconsin", "Wyoming",
    ]

    agencies = []
    for state in US_STATES_NAMES:
        state_abbr = state[:2].upper() if state != "Alaska" else "AK"
        for tmpl in STATE_AGENCY_TEMPLATES:
            agencies.append({
                "id": f"{state.lower().replace(' ', '-')}-{tmpl['type']}",
                "name": tmpl["name"].format(state=state),
                "type": tmpl["type"],
                "level": "state",
                "jurisdiction": state,
                "jurisdiction_abbr": state_abbr,
                "services": tmpl["services"],
                "description": f"State-level {tmpl['name'].format(state=state)} serving {state}.",
            })

    save_json("state_agencies.json", agencies)
    return agencies


def build_city_government_types():
    """Document how city governments are structured across major US cities."""
    print("\n📦 PHASE 1c: City Government Structures")

    cities_data = [
        {"name": "Chicago", "state": "IL", "type": "mayor-council", "legislative_body": "City Council",
         "districts": 50, "district_name": "Ward", "representative_title": "Alderperson",
         "term_length_years": 4, "mayor": "Brandon Johnson", "meeting_schedule": "Monthly"},
        {"name": "New York", "state": "NY", "type": "mayor-council", "legislative_body": "City Council",
         "districts": 51, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 4, "mayor": "Eric Adams", "meeting_schedule": "Bi-weekly"},
        {"name": "Los Angeles", "state": "CA", "type": "mayor-council", "legislative_body": "City Council",
         "districts": 15, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 4, "mayor": "Karen Bass", "meeting_schedule": "Weekly"},
        {"name": "Houston", "state": "TX", "type": "mayor-council", "legislative_body": "City Council",
         "districts": 16, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 4, "mayor": "John Whitmire", "meeting_schedule": "Weekly"},
        {"name": "Phoenix", "state": "AZ", "type": "council-manager", "legislative_body": "City Council",
         "districts": 9, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 4, "mayor": "Kate Gallego", "meeting_schedule": "Bi-weekly"},
        {"name": "Philadelphia", "state": "PA", "type": "mayor-council", "legislative_body": "City Council",
         "districts": 17, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 4, "mayor": "Cherelle Parker", "meeting_schedule": "Weekly"},
        {"name": "San Antonio", "state": "TX", "type": "council-manager", "legislative_body": "City Council",
         "districts": 11, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 2, "mayor": "Ron Nirenberg", "meeting_schedule": "Weekly"},
        {"name": "San Diego", "state": "CA", "type": "mayor-council", "legislative_body": "City Council",
         "districts": 9, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 4, "mayor": "Todd Gloria", "meeting_schedule": "Weekly"},
        {"name": "Dallas", "state": "TX", "type": "council-manager", "legislative_body": "City Council",
         "districts": 15, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 2, "mayor": "Eric Johnson", "meeting_schedule": "Bi-weekly"},
        {"name": "Austin", "state": "TX", "type": "council-manager", "legislative_body": "City Council",
         "districts": 11, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 4, "mayor": "Kirk Watson", "meeting_schedule": "Weekly"},
        {"name": "Boston", "state": "MA", "type": "mayor-council", "legislative_body": "City Council",
         "districts": 13, "district_name": "Council District", "representative_title": "City Councilor",
         "term_length_years": 2, "mayor": "Michelle Wu", "meeting_schedule": "Weekly"},
        {"name": "Seattle", "state": "WA", "type": "mayor-council", "legislative_body": "City Council",
         "districts": 9, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 4, "mayor": "Bruce Harrell", "meeting_schedule": "Weekly"},
        {"name": "Denver", "state": "CO", "type": "mayor-council", "legislative_body": "City Council",
         "districts": 13, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 4, "mayor": "Mike Johnston", "meeting_schedule": "Weekly"},
        {"name": "Detroit", "state": "MI", "type": "mayor-council", "legislative_body": "City Council",
         "districts": 9, "district_name": "Council District", "representative_title": "Council Member",
         "term_length_years": 4, "mayor": "Mike Duggan", "meeting_schedule": "Weekly"},
        {"name": "Miami", "state": "FL", "type": "mayor-council", "legislative_body": "City Commission",
         "districts": 5, "district_name": "Commission District", "representative_title": "Commissioner",
         "term_length_years": 4, "mayor": "Francis Suarez", "meeting_schedule": "Bi-weekly"},
    ]

    save_json("city_government_structures.json", cities_data)
    return cities_data


# ============================================================
# PHASE 2: ENGAGEMENT — Events, Grants, Deadlines
# ============================================================

def build_civic_calendar():
    """Generate recurring civic engagement calendar items."""
    print("\n📦 PHASE 2a: Civic Calendar")

    recurring_events = [
        {"event_type": "election", "name": "General Election Day", "schedule": "First Tuesday after first Monday in November", "next_date": "2026-11-03", "level": "federal"},
        {"event_type": "tax", "name": "Federal Tax Filing Deadline", "schedule": "April 15 annually", "next_date": "2027-04-15", "level": "federal"},
        {"event_type": "enrollment", "name": "Medicare Open Enrollment", "schedule": "October 15 - December 7 annually", "next_date": "2026-10-15", "level": "federal"},
        {"event_type": "enrollment", "name": "Health Insurance Marketplace Open Enrollment", "schedule": "November 1 - January 15 annually", "next_date": "2026-11-01", "level": "federal"},
        {"event_type": "application", "name": "FAFSA Application Opens", "schedule": "October 1 annually", "next_date": "2026-10-01", "level": "federal"},
        {"event_type": "census", "name": "American Community Survey Data Release", "schedule": "September annually", "next_date": "2026-09-01", "level": "federal"},
        {"event_type": "budget", "name": "Federal Fiscal Year Begins", "schedule": "October 1 annually", "next_date": "2026-10-01", "level": "federal"},
        {"event_type": "civic", "name": "State of the Union Address", "schedule": "January/February annually", "next_date": "2027-01-01", "level": "federal"},
    ]

    save_json("civic_calendar.json", recurring_events)
    return recurring_events


def build_grant_deadlines():
    """Major federal grant programs with recurring deadlines."""
    print("\n📦 PHASE 2b: Grant Deadlines")

    grants = [
        {"program": "Community Development Block Grant (CDBG)", "agency": "HUD", "type": "formula", "level": "city/county",
         "deadline_note": "Annual allocation — check with your local HUD field office", "amount_range": "$100K - $50M",
         "eligible": ["Cities", "Counties", "States"], "url": "https://www.hud.gov/program_offices/comm_planning/cdbg"},
        {"program": "HOME Investment Partnerships", "agency": "HUD", "type": "formula", "level": "city/county",
         "deadline_note": "Annual allocation", "amount_range": "$500K - $10M",
         "eligible": ["States", "Local governments", "Nonprofits"], "url": "https://www.hud.gov/program_offices/comm_planning/home"},
        {"program": "FEMA Hazard Mitigation Grants", "agency": "FEMA", "type": "rolling", "level": "state/local",
         "deadline_note": "Rolling — applications accepted year-round", "amount_range": "Varies",
         "eligible": ["States", "Tribes", "Territories", "Local governments"], "url": "https://www.fema.gov/grants/mitigation"},
        {"program": "SBA 7(a) Loans", "agency": "SBA", "type": "rolling", "level": "federal",
         "deadline_note": "Rolling — apply through approved lenders", "amount_range": "Up to $5M",
         "eligible": ["Small businesses"], "url": "https://www.sba.gov/funding-programs/loans/7a-loans"},
        {"program": "EPA Brownfields Assessment Grants", "agency": "EPA", "type": "competitive", "level": "local",
         "deadline_note": "Annual cycle — typically opens in fall", "amount_range": "Up to $500K",
         "eligible": ["Local governments", "Nonprofits", "Tribes"], "url": "https://www.epa.gov/brownfields"},
        {"program": "USDA Rural Development Grants", "agency": "USDA", "type": "varies", "level": "rural",
         "deadline_note": "Multiple programs with rolling deadlines", "amount_range": "$50K - $25M",
         "eligible": ["Rural communities", "Nonprofits", "Tribes"], "url": "https://www.rd.usda.gov"},
        {"program": "DOJ COPS Hiring Program", "agency": "DOJ", "type": "competitive", "level": "local",
         "deadline_note": "Annual cycle — typically spring", "amount_range": "Up to $2M",
         "eligible": ["Law enforcement agencies"], "url": "https://cops.usdoj.gov/grants"},
        {"program": "National Endowment for the Arts Grants", "agency": "NEA", "type": "competitive", "level": "federal",
         "deadline_note": "Multiple deadlines throughout the year", "amount_range": "$10K - $100K",
         "eligible": ["Nonprofits", "Local governments", "Arts organizations"], "url": "https://www.arts.gov/grants"},
    ]

    save_json("grant_programs.json", grants)
    return grants


# ============================================================
# PHASE 3: MASTER INDEX
# ============================================================

def build_master_index():
    """Generate a master index of all data files."""
    print("\n📦 PHASE 3: Master Index")

    index = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
        "files": {},
    }

    for f in sorted(OUTPUT_DIR.glob("*.json")):
        with open(f) as fh:
            data = json.load(fh)
        index["files"][f.name] = {
            "count": len(data) if isinstance(data, list) else "object",
            "size_bytes": f.stat().st_size,
            "updated": datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc).isoformat(),
        }

    save_json("master_index.json", index)
    return index


# ============================================================
# MAIN
# ============================================================

PHASES = {
    "foundation": [build_federal_agencies, build_state_agencies, build_city_government_types],
    "engagement": [build_civic_calendar, build_grant_deadlines],
    "all": None,  # Will run everything
}

def main():
    parser = argparse.ArgumentParser(description="CivicPie Nationwide Data Pipeline v2.0")
    parser.add_argument("--phase", choices=list(PHASES.keys()), default="all",
                        help="Which phase to run (default: all)")
    args = parser.parse_args()

    ensure_dirs()
    print(f"\n🥧 CivicPie Nationwide Data Pipeline v2.0")
    print(f"   Output: {OUTPUT_DIR}")
    print(f"   Cache:  {CACHE_DIR}")
    print(f"   Phase:  {args.phase}")

    if args.phase == "all":
        functions = []
        for funcs in PHASES.values():
            if funcs:
                functions.extend(funcs)
    else:
        functions = PHASES[args.phase]

    results = {}
    for fn in functions:
        try:
            results[fn.__name__] = fn()
        except Exception as e:
            print(f"  ✗ {fn.__name__} failed: {e}", file=sys.stderr)
            results[fn.__name__] = None

    # Always build master index
    build_master_index()

    succeeded = sum(1 for v in results.values() if v is not None)
    print(f"\n✅ Pipeline complete: {succeeded}/{len(functions)} modules succeeded")
    print(f"📁 Data ready for frontend at: {OUTPUT_DIR}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
