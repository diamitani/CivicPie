#!/usr/bin/env python3
"""
CivicPie Election Data Orchestrator
====================================
Runs all scrapers in sequence, merges data, and produces the master election database.

Usage:
  python3 scripts/scraper/orchestrator.py              # Run all pipelines
  python3 scripts/scraper/orchestrator.py --fec-only   # FEC only
  python3 scripts/scraper/orchestrator.py --states-only # OpenStates + Ballotpedia only
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from scripts.scraper.fec_client import run_fec_pipeline
from scripts.scraper.ballotpedia_scraper import run_ballotpedia_pipeline
from scripts.scraper.openstates_client import run_openstates_pipeline

OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "data" / "elections"


def merge_all_data():
    """Merge FEC, OpenStates, and Ballotpedia data into master database."""
    print("\n📊 MERGING DATA INTO MASTER DATABASE")
    print("=" * 50)

    # Load individual files
    files = {
        "fec": OUTPUT_DIR / "fec_candidates.json",
        "openstates": OUTPUT_DIR / "openstates_data.json",
        "ballotpedia": OUTPUT_DIR / "ballotpedia_data.json",
    }

    data = {}
    for key, path in files.items():
        if path.exists():
            with open(path) as f:
                data[key] = json.load(f)
            print(f"  ✓ Loaded {key}: {path}")
        else:
            print(f"  ⚠ Missing: {path}")
            data[key] = {}

    # Build master by state
    by_state = {}
    states = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
              "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
              "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
              "VA","WA","WV","WI","WY","DC"]

    for state in states:
        by_state[state] = {
            "federal": {"senate": [], "house": []},
            "state": {"legislators": [], "bills": [], "agencies": []},
            "local": {"elections": {}, "candidates": [], "measures": []},
        }

    # Merge FEC data
    if "fec" in data and "by_state" in data["fec"]:
        for st, fed_data in data["fec"]["by_state"].items():
            if st in by_state:
                by_state[st]["federal"] = fed_data

    # Merge OpenStates data
    if "openstates" in data and "by_state" in data["openstates"]:
        for st, os_data in data["openstates"]["by_state"].items():
            if st in by_state:
                by_state[st]["state"]["legislators"] = os_data.get("legislators", [])
                by_state[st]["state"]["bills"] = os_data.get("bills", [])

    # Merge Ballotpedia data
    if "ballotpedia" in data and "by_state" in data["ballotpedia"]:
        for st, bp_data in data["ballotpedia"]["by_state"].items():
            if st in by_state:
                by_state[st]["local"]["elections"] = {
                    "dates": bp_data.get("election_dates", []),
                    "candidates_found": bp_data.get("candidates_found", 0),
                }
                by_state[st]["local"]["candidates"] = bp_data.get("candidates", [])
                by_state[st]["local"]["measures"] = bp_data.get("ballot_measures", [])

    # Count totals
    total_fed_senate = sum(len(v["federal"]["senate"]) for v in by_state.values())
    total_fed_house = sum(len(v["federal"]["house"]) for v in by_state.values())
    total_state_leg = sum(len(v["state"]["legislators"]) for v in by_state.values())
    total_local_candidates = sum(len(v["local"]["candidates"]) for v in by_state.values())

    master = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
        "election_year": 2026,
        "sources": ["FEC API", "OpenStates API", "Ballotpedia"],
        "totals": {
            "federal_senate_candidates": total_fed_senate,
            "federal_house_candidates": total_fed_house,
            "state_legislators": total_state_leg,
            "local_candidates": total_local_candidates,
            "total_candidates": total_fed_senate + total_fed_house + total_state_leg + total_local_candidates,
        },
        "by_state": by_state,
    }

    path = OUTPUT_DIR / "master_elections.json"
    with open(path, "w") as f:
        json.dump(master, f, indent=2)

    print(f"\n  ✅ Master database saved: {path}")
    print(f"     {master['totals']['total_candidates']:,} total candidates")
    print(f"     Federal: {total_fed_senate} Senate + {total_fed_house} House")
    print(f"     State: {total_state_leg} legislators")
    print(f"     Local: {total_local_candidates} candidates")
    return master


def main():
    parser = argparse.ArgumentParser(description="CivicPie Election Data Orchestrator")
    parser.add_argument("--fec-only", action="store_true", help="FEC pipeline only")
    parser.add_argument("--states-only", action="store_true", help="State pipelines only (OpenStates + Ballotpedia)")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"\n🥧 CivicPie Election Orchestrator v2.0")
    print(f"   {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")

    try:
        if args.fec_only:
            run_fec_pipeline()
        elif args.states_only:
            run_openstates_pipeline()
            run_ballotpedia_pipeline()
        else:
            run_fec_pipeline()
            run_openstates_pipeline()
            run_ballotpedia_pipeline()
            merge_all_data()

        print(f"\n✅ Pipeline complete!")
        return 0

    except Exception as e:
        print(f"\n✗ Pipeline failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
