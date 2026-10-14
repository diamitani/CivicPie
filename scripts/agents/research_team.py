#!/usr/bin/env python3
"""
CivicPie Research Agent Team
=============================
Multi-agent research system for collecting and normalizing election data.

Agents:
  1. Candidate Researcher — deep profiles from Ballotpedia, BallotReady, FEC
  2. Polling Locator — polling places, hours, early voting from state boards
  3. Election Date Tracker — election calendars, registration deadlines
  4. Data Normalizer — standardizes all sources into master format

Each agent runs independently, outputs structured JSON, and the orchestrator
merges everything into the master election guide.
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

# Add project root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from scripts.scrapers.playwright.ballotpedia_scraper import (
    scrape_senate_race, scrape_state_elections, scrape_polling_places_page,
    SENATE_PAGES, STATE_ELECTION_PAGES,
)
from scripts.scrapers.playwright.ballotready_scraper import (
    build_polling_place_database, scrape_ballotready_widget,
)

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "data" / "elections"
PARTY_COLORS = {"Democratic": "#1569C7", "Republican": "#C41230", "Independent": "#6B7280"}


def ensure_dirs():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# AGENT 1: CANDIDATE RESEARCHER
# ============================================================

class CandidateResearcher:
    """Deep candidate profile researcher — scrapes multiple sources per candidate."""

    def __init__(self):
        self.name = "Candidate Researcher"

    def research_state(self, state_abbr: str) -> dict:
        """Research all candidates for a state."""
        print(f"  🔍 {self.name}: Researching {state_abbr}...")

        result = {
            "state": state_abbr,
            "senate_race": None,
            "house_races": [],
            "governor_race": None,
            "state_legislature": [],
            "scraped_at": datetime.now(timezone.utc).isoformat(),
        }

        # Senate race
        if state_abbr in SENATE_PAGES:
            try:
                result["senate_race"] = scrape_senate_race(state_abbr, SENATE_PAGES[state_abbr])
            except Exception as e:
                result["senate_race"] = {"error": str(e)}

        # State elections page (for governor, state leg)
        if state_abbr in STATE_ELECTION_PAGES:
            try:
                result["state_elections"] = scrape_state_elections(state_abbr, STATE_ELECTION_PAGES[state_abbr])
            except Exception as e:
                result["state_elections"] = {"error": str(e)}

        return result

    def run(self, states: list = None) -> dict:
        """Research candidates across specified states."""
        if states is None:
            states = ["IL", "CA", "TX", "FL", "NY", "PA", "OH", "GA", "MI", "NC"]

        print(f"\n🔍 AGENT: {self.name}")
        print("=" * 50)

        results = {}
        for state in states:
            results[state] = self.research_state(state) or {}

        total_candidates = sum(
            len((r or {}).get("senate_race", {}) and (r or {}).get("senate_race", {}).get("candidates", []) or [])
            for r in results.values()
        )

        print(f"  ✅ {self.name} complete: {total_candidates} candidates found across {len(states)} states")
        return results


# ============================================================
# AGENT 2: POLLING LOCATOR
# ============================================================

class PollingLocator:
    """Finds polling places, voting hours, and early voting info per state."""

    def __init__(self):
        self.name = "Polling Locator"

    def research_polling(self, state_abbr: str) -> dict:
        """Get polling information for a state."""
        polling_db = build_polling_place_database()
        state_data = next((p for p in polling_db if p["state"] == state_abbr), None)

        if state_data:
            return {
                "state": state_abbr,
                "polling_hours": state_data.get("polling_hours", ""),
                "early_voting": state_data.get("early_voting", ""),
                "vote_by_mail": state_data.get("vote_by_mail", ""),
                "registration_deadline": state_data.get("registration_deadline", ""),
                "lookup_url": state_data.get("lookup_url", ""),
            }
        return {"state": state_abbr, "error": "No polling data found"}

    def run(self) -> dict:
        """Build complete polling place database."""
        print(f"\n📍 AGENT: {self.name}")
        print("=" * 50)

        polling_db = build_polling_place_database()

        print(f"  ✅ {self.name} complete: {len(polling_db)} states with polling data")
        return {"polling_places": polling_db}


# ============================================================
# AGENT 3: ELECTION DATE TRACKER
# ============================================================

class ElectionDateTracker:
    """Tracks election dates, registration deadlines, and key milestones."""

    def __init__(self):
        self.name = "Election Date Tracker"

    def get_national_dates(self) -> list:
        """Return key national election dates for 2026."""
        return [
            {"date": "2026-03-03", "event": "Super Tuesday Primaries", "states": "AL, AR, CA, CO, ME, MA, MN, NC, OK, TN, TX, VT, VA"},
            {"date": "2026-03-17", "event": "Primary Elections", "states": "AZ, FL, IL, OH"},
            {"date": "2026-04-28", "event": "Primary Elections", "states": "PA, DE, CT, RI, NY, MD, WI"},
            {"date": "2026-05-19", "event": "Primary Elections", "states": "KY, OR, GA, ID"},
            {"date": "2026-06-02", "event": "Primary Elections", "states": "MT, NJ, NM, SD, IA, MS, CA"},
            {"date": "2026-06-23", "event": "Primary/Runoff Elections", "states": "CO, NY, OK, SC, UT, VA"},
            {"date": "2026-08-04", "event": "Primary Elections", "states": "MI, MO, KS, WA"},
            {"date": "2026-08-11", "event": "Primary Elections", "states": "MN, WI, CT, VT"},
            {"date": "2026-09-01", "event": "Primary Elections", "states": "MA, DE, NH, RI"},
            {"date": "2026-11-03", "event": "2026 MIDTERM GENERAL ELECTION", "states": "ALL 50 STATES"},
            {"date": "2026-12-08", "event": "Runoff Elections", "states": "GA, LA, MS (if needed)"},
        ]

    def get_state_dates(self, state_abbr: str) -> dict:
        """Get election dates for a specific state."""
        national = self.get_national_dates()
        state_dates = [d for d in national if state_abbr in (d.get("states", "").upper().replace(" ","").split(","))]

        # Add Voter Registration Deadline (general: 30 days before)
        for d in state_dates:
            if "GENERAL" in d["event"].upper():
                d["registration_deadline"] = "October 4, 2026 (typical)"
                d["early_voting_starts"] = "Varies by state (typically mid-October)"

        return {"state": state_abbr, "dates": state_dates}

    def run(self, states: list = None) -> dict:
        """Build complete election date database."""
        print(f"\n📅 AGENT: {self.name}")
        print("=" * 50)

        national = self.get_national_dates()
        by_state = {}
        all_state_abbrs = [
            "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
            "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
            "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
            "VA","WA","WV","WI","WY","DC",
        ]
        for state in all_state_abbrs:
            by_state[state] = self.get_state_dates(state)

        print(f"  ✅ {self.name} complete: {len(national)} national dates, {len(by_state)} state calendars")
        return {
            "national_dates": national,
            "by_state": by_state,
        }


# ============================================================
# AGENT 4: DATA NORMALIZER
# ============================================================

class DataNormalizer:
    """Standardizes all scraped data into the master election guide format."""

    def __init__(self):
        self.name = "Data Normalizer"

    def normalize_candidate(self, raw: dict, state: str, office: str) -> dict:
        """Normalize a candidate entry from any source."""
        return {
            "name": raw.get("name", "").strip(),
            "party": raw.get("party", "").strip(),
            "state": state,
            "office": office,
            "status": raw.get("incumbent_challenge", raw.get("status", "")),
            "source": raw.get("source", ""),
            "candidate_id": raw.get("candidate_id", ""),
        }

    def normalize_polling(self, raw: dict) -> dict:
        """Normalize polling place data."""
        return {
            "state": raw.get("state", ""),
            "polling_hours": raw.get("polling_hours", ""),
            "early_voting": raw.get("early_voting", ""),
            "vote_by_mail": raw.get("vote_by_mail", ""),
            "registration_deadline": raw.get("registration_deadline", ""),
            "lookup_url": raw.get("lookup_url", ""),
        }

    def run(self, candidate_data: dict, polling_data: dict, dates_data: dict, bp_data: dict = None) -> dict:
        """Normalize all data into master format."""
        print(f"\n📊 AGENT: {self.name}")
        print("=" * 50)

        master = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "version": "2.0.0",
            "sources": ["FEC", "Ballotpedia", "BallotReady", "State Election Boards"],
            "candidates": [],
            "polling_places": [],
            "election_dates": dates_data.get("national_dates", []),
            "by_state": {},
        }

        # Normalize candidates
        for state, data in candidate_data.items():
            master["by_state"][state] = {
                "candidates": [],
                "polling": {},
                "dates": dates_data.get("by_state", {}).get(state, {}).get("dates", []),
            }

            # Senate candidates
            senate = data.get("senate_race", {})
            for c in senate.get("candidates", []):
                normalized = self.normalize_candidate(c, state, "Senate")
                master["candidates"].append(normalized)
                master["by_state"][state]["candidates"].append(normalized)

            # From state elections page
            state_elec = data.get("state_elections", {})
            for c in state_elec.get("candidates", []):
                normalized = self.normalize_candidate(c, state, "State Office")
                master["candidates"].append(normalized)
                master["by_state"][state]["candidates"].append(normalized)

        # Normalize polling places
        for p in polling_data.get("polling_places", []):
            normalized = self.normalize_polling(p)
            master["polling_places"].append(normalized)
            if normalized["state"] in master["by_state"]:
                master["by_state"][normalized["state"]]["polling"] = normalized

        print(f"  ✅ {self.name} complete: {len(master['candidates'])} candidates, {len(master['polling_places'])} states with polling, {len(master['election_dates'])} national dates")
        return master


# ============================================================
# ORCHESTRATOR — Runs all agents in parallel
# ============================================================

class ResearchOrchestrator:
    """Coordinates all research agents and produces final output."""

    def __init__(self):
        self.candidate_agent = CandidateResearcher()
        self.polling_agent = PollingLocator()
        self.dates_agent = ElectionDateTracker()
        self.normalizer = DataNormalizer()

    def run_parallel(self, states: list = None):
        """Run all agents in parallel."""
        if states is None:
            states = ["IL", "CA", "TX", "FL", "NY", "PA", "OH", "GA", "MI", "NC"]

        ensure_dirs()
        print(f"\n🤖 CIVICPIE RESEARCH AGENT TEAM")
        print("=" * 60)
        print(f"  Target: {len(states)} states")
        print(f"  Agents: 4 (Candidate Researcher, Polling Locator, Date Tracker, Normalizer)")

        # Run independent agents in parallel
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_candidates = executor.submit(self.candidate_agent.run, states)
            future_polling = executor.submit(self.polling_agent.run)
            future_dates = executor.submit(self.dates_agent.run)

            candidate_data = future_candidates.result(timeout=300)
            polling_data = future_polling.result(timeout=60)
            dates_data = future_dates.result(timeout=30)

        # Normalize and merge
        master = self.normalizer.run(candidate_data, polling_data, dates_data)

        # Save
        path = OUTPUT_DIR / "master_election_guide.json"
        with open(path, "w") as f:
            json.dump(master, f, indent=2)

        print(f"\n{'='*60}")
        print(f"✅ MASTER ELECTION GUIDE: {path}")
        print(f"   {len(master['candidates'])} candidates")
        print(f"   {len(master['polling_places'])} states with polling data")
        print(f"   {len(master['election_dates'])} national election dates")
        print(f"   {len(master['by_state'])} state profiles")

        return master

    def run_sequential(self, states: list = None):
        """Run agents sequentially (for debugging)."""
        if states is None:
            states = ["IL", "CA", "TX"]

        ensure_dirs()

        candidate_data = self.candidate_agent.run(states)
        polling_data = self.polling_agent.run()
        dates_data = self.dates_agent.run()

        master = self.normalizer.run(candidate_data, polling_data, dates_data)

        path = OUTPUT_DIR / "master_election_guide.json"
        with open(path, "w") as f:
            json.dump(master, f, indent=2)

        return master


def main():
    import argparse
    parser = argparse.ArgumentParser(description="CivicPie Research Agent Team")
    parser.add_argument("--parallel", action="store_true", help="Run agents in parallel")
    parser.add_argument("--states", nargs="+", help="States to research (default: top 10)")
    parser.add_argument("--quick", action="store_true", help="Quick mode — 3 states, sequential")

    args = parser.parse_args()

    orchestrator = ResearchOrchestrator()

    if args.quick:
        master = orchestrator.run_sequential(["IL", "CA", "TX"])
    elif args.parallel:
        master = orchestrator.run_parallel(args.states)
    else:
        master = orchestrator.run_sequential(args.states or ["IL", "CA", "TX", "FL", "NY"])

    return 0

if __name__ == "__main__":
    sys.exit(main())
