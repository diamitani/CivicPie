#!/usr/bin/env python3
"""
CivicPie Weekly Election Scheduler
===================================
Checks all data sources weekly, diffs against previous run, and updates JSON.

Features:
  - Runs the full orchestrator pipeline
  - Compares new data vs previous snapshot
  - Logs changes: new candidates, status changes, new bills
  - Saves a change log for the frontend to display
  - Can run as a cron job: `0 6 * * 1 cd /path/to/civicpie && python3 scripts/scheduler/weekly_update.py`

Design: Non-destructive — old data is archived before update.
"""

import json
import sys
import shutil
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from scripts.scraper.fec_client import run_fec_pipeline
from scripts.scraper.ballotpedia_scraper import run_ballotpedia_pipeline
from scripts.scraper.openstates_client import run_openstates_pipeline

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "data" / "elections"
ARCHIVE_DIR = DATA_DIR / "archive"
CHANGE_LOG_PATH = DATA_DIR / "change_log.json"


def ensure_dirs():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)


def archive_previous_data():
    """Move current data to archive before updating."""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H%M%S")
    archive_subdir = ARCHIVE_DIR / timestamp
    archive_subdir.mkdir(parents=True, exist_ok=True)

    archived = []
    for f in DATA_DIR.glob("*.json"):
        if f.name not in ("change_log.json",):
            dest = archive_subdir / f.name
            shutil.copy2(f, dest)
            archived.append(f.name)

    print(f"  📦 Archived {len(archived)} files → {archive_subdir}")
    return archive_subdir


def load_json_safe(path: Path) -> Optional[dict]:
    """Load JSON file if it exists."""
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return None


def compute_diff(old_data: Optional[dict], new_data: Optional[dict], source: str) -> dict:
    """Compute what changed between old and new data."""
    if old_data is None:
        return {"source": source, "status": "first_run", "message": f"Initial data load for {source}"}

    if new_data is None:
        return {"source": source, "status": "error", "message": f"Failed to fetch new data for {source}"}

    changes = {"source": source, "status": "updated", "changes": []}

    # Compare candidate counts
    if "total_candidates" in old_data and "total_candidates" in new_data:
        old_count = old_data["total_candidates"]
        new_count = new_data["total_candidates"]
        if old_count != new_count:
            diff = new_count - old_count
            changes["changes"].append({
                "field": "total_candidates",
                "old": old_count,
                "new": new_count,
                "delta": diff,
                "description": f"{'+' if diff > 0 else ''}{diff} new candidates" if diff else "No change in candidate count",
            })

    # Check for new candidates by comparing by_state
    if "by_state" in old_data and "by_state" in new_data:
        for state in new_data["by_state"]:
            old_state = old_data.get("by_state", {}).get(state, {})
            new_state = new_data["by_state"].get(state, {})

            old_senate = set(c.get("name", "") for c in old_state.get("senate", []))
            new_senate = set(c.get("name", "") for c in new_state.get("senate", []))
            new_in_senate = new_senate - old_senate
            removed_senate = old_senate - new_senate

            if new_in_senate:
                changes["changes"].append({
                    "state": state,
                    "office": "Senate",
                    "type": "new_candidates",
                    "candidates": list(new_in_senate),
                })
            if removed_senate:
                changes["changes"].append({
                    "state": state,
                    "office": "Senate",
                    "type": "removed_candidates",
                    "candidates": list(removed_senate),
                })

    # Check for new bills
    if "total_bills" in old_data and "total_bills" in new_data:
        old_bills = old_data["total_bills"]
        new_bills = new_data["total_bills"]
        if old_bills != new_bills:
            changes["changes"].append({
                "field": "total_bills",
                "old": old_bills,
                "new": new_bills,
                "delta": new_bills - old_bills,
                "description": f"{new_bills - old_bills} new bills tracked",
            })

    # If no specific changes detected
    if not changes["changes"]:
        changes["status"] = "no_changes"
        changes["message"] = f"No changes detected in {source} data"

    return changes


def update_change_log(diffs: list):
    """Append to the running change log."""
    log = load_json_safe(CHANGE_LOG_PATH) or {"updates": []}

    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "diffs": diffs,
    }

    # Keep last 52 weeks
    log["updates"].insert(0, entry)
    if len(log["updates"]) > 52:
        log["updates"] = log["updates"][:52]

    with open(CHANGE_LOG_PATH, "w") as f:
        json.dump(log, f, indent=2)

    print(f"  📝 Change log updated: {len(log['updates'])} weeks of history")


def run_weekly_update():
    """Run the full weekly update cycle."""
    ensure_dirs()

    print(f"\n🥧 CivicPie Weekly Election Update")
    print(f"   {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60)

    # Step 1: Archive current data
    print("\n📦 STEP 1: Archive")
    archive_path = archive_previous_data()

    # Step 2: Load old data for diffing
    old_fec = load_json_safe(DATA_DIR / "fec_candidates.json")
    old_os = load_json_safe(DATA_DIR / "openstates_data.json")
    old_bp = load_json_safe(DATA_DIR / "ballotpedia_data.json")

    # Step 3: Run all pipelines
    print("\n🔄 STEP 2: Refresh Data")

    print("\n  --- FEC Pipeline ---")
    try:
        new_fec = run_fec_pipeline()
    except Exception as e:
        print(f"  ✗ FEC pipeline failed: {e}", file=sys.stderr)
        new_fec = None

    print("\n  --- OpenStates Pipeline ---")
    try:
        new_os = run_openstates_pipeline()
    except Exception as e:
        print(f"  ✗ OpenStates pipeline failed: {e}", file=sys.stderr)
        new_os = None

    print("\n  --- Ballotpedia Pipeline ---")
    try:
        new_bp = run_ballotpedia_pipeline()
    except Exception as e:
        print(f"  ✗ Ballotpedia pipeline failed: {e}", file=sys.stderr)
        new_bp = None

    # Step 4: Compute diffs
    print("\n📊 STEP 3: Diff Analysis")
    diffs = [
        compute_diff(old_fec, new_fec, "FEC"),
        compute_diff(old_os, new_os, "OpenStates"),
        compute_diff(old_bp, new_bp, "Ballotpedia"),
    ]

    for d in diffs:
        status = d.get("status", "unknown")
        changes = d.get("changes", [])
        print(f"  {d['source']:15s} → {status:12s} ({len(changes)} changes)")

    # Step 5: Update change log
    print("\n📝 STEP 4: Update Logs")
    update_change_log(diffs)

    # Step 6: Clean old archives (keep last 12 weeks)
    archives = sorted(ARCHIVE_DIR.glob("*"), reverse=True)
    for old_archive in archives[12:]:
        if old_archive.is_dir():
            shutil.rmtree(old_archive)
            print(f"  🗑  Removed old archive: {old_archive.name}")

    # Summary
    total_changes = sum(len(d.get("changes", [])) for d in diffs)
    has_updates = any(d.get("status") in ("updated", "first_run") for d in diffs)

    print(f"\n{'✅' if has_updates else '✓'} Weekly update complete!")
    print(f"   {total_changes} changes detected across 3 sources")
    print(f"   Archive: {archive_path}")

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sources_checked": 3,
        "total_changes": total_changes,
        "diffs": diffs,
    }


def check_should_run() -> bool:
    """Check if it's been at least 6 days since last run."""
    last_run_path = DATA_DIR / ".last_weekly_run"

    if not last_run_path.exists():
        return True

    with open(last_run_path) as f:
        last_run = datetime.fromisoformat(f.read().strip())

    elapsed = datetime.now(timezone.utc) - last_run.replace(tzinfo=timezone.utc)
    return elapsed > timedelta(days=6)


def mark_run_complete():
    """Record that a weekly run completed."""
    with open(DATA_DIR / ".last_weekly_run", "w") as f:
        f.write(datetime.now(timezone.utc).isoformat())


def main():
    if not check_should_run():
        print("⏭ Last run was less than 6 days ago. Skipping.")
        return 0

    try:
        result = run_weekly_update()
        mark_run_complete()
        return 0 if result["total_changes"] >= 0 else 1
    except Exception as e:
        print(f"\n✗ Weekly update failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
