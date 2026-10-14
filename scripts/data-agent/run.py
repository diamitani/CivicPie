#!/usr/bin/env python3
"""Weekly entry point for the CivicPie data agent.

Usage:
    cd ~/workspace/CivicPie && python3 scripts/data-agent/run.py --weekly [--dry-run] [--source <id>]

Loads sources.yaml, runs every enabled source through the pipeline
(fetch → parse → normalize → dedupe → stage), then writes a run report
(JSON + Markdown) to:
    ~/workspace/goals/civicpie-meetings-calendar-weekly-scrape/hidden_files/data-agent-runs/

Degrades gracefully: missing adapters, missing API keys, and disabled
sources are reported as skips, never fatal. Exit code is 0 unless the
run itself crashed; per-source failures are recorded in the report.

--dry-run: fetch + parse + normalize, but write nothing to staging.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
import time
import traceback
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent  # scripts/data-agent -> repo root
RUNS_DIR = (Path.home() / "workspace" / "goals"
            / "civicpie-meetings-calendar-weekly-scrape"
            / "hidden_files" / "data-agent-runs")
MEETINGS_SNAPSHOTS_DIR = (Path.home() / "workspace" / "civicpie-data"
                          / "data" / "meetings")


def _load_sibling(mod_name: str):
    full = f"civicpie_data_agent_{mod_name}"
    if full in sys.modules:
        return sys.modules[full]
    spec = importlib.util.spec_from_file_location(
        full, HERE / f"{mod_name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[full] = module
    spec.loader.exec_module(module)
    return module


pipeline = _load_sibling("pipeline")


def _utcnow_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def load_sources() -> list[dict]:
    import yaml
    with open(HERE / "sources.yaml", encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    return data.get("sources", []) or []


def meetings_snapshot_status() -> dict:
    """Existing meetings-goal snapshots: consume, don't re-scrape (PRD §4).

    The framework counts the snapshot files and reports freshness; the
    meetings adapter (sibling workstream) turns them into records.
    """
    status: dict = {"dir": str(MEETINGS_SNAPSHOTS_DIR),
                    "files": 0, "newest": None, "note": ""}
    if not MEETINGS_SNAPSHOTS_DIR.is_dir():
        status["note"] = "snapshots dir not present"
        return status
    files = sorted(MEETINGS_SNAPSHOTS_DIR.glob("*.json"))
    status["files"] = len(files)
    if files:
        newest = max(files, key=lambda p: p.stat().st_mtime)
        status["newest"] = newest.name
        status["newest_mtime"] = time.strftime(
            "%Y-%m-%dT%H:%M:%SZ", time.gmtime(newest.stat().st_mtime))
    status["note"] = "consumed by meetings adapter; not re-scraped by this run"
    return status


def run_all(*, dry_run: bool = False, source_filter: str | None = None) -> dict:
    started = time.monotonic()
    report: dict = {
        "run_at": _utcnow_iso(),
        "mode": "dry-run" if dry_run else "weekly",
        "sources": [],
        "meetings_snapshots": meetings_snapshot_status(),
        "totals": {"new": 0, "unchanged": 0, "changed_queued": 0,
                   "duplicates_queued": 0, "rejected": 0, "errors": 0},
    }

    for source in load_sources():
        sid = source["id"]
        if source_filter and sid != source_filter:
            continue
        entry: dict = {"source_id": sid, "status": "ran"}
        if not source.get("enabled", True):
            entry["status"] = "skipped (disabled)"
            report["sources"].append(entry)
            continue
        auth_env = source.get("auth_env")
        if auth_env and not os.environ.get(auth_env):
            entry["status"] = f"skipped (missing {auth_env})"
            report["sources"].append(entry)
            continue
        try:
            stats = pipeline.run_source(source, dry_run=dry_run)
        except Exception:  # noqa: BLE001 — never let one source kill the run
            stats = {"source_id": sid, "fetched": 0, "parsed": 0, "new": 0,
                     "unchanged": 0, "changed_queued": 0,
                     "duplicates_queued": 0, "rejected": 0,
                     "errors": [traceback.format_exc(limit=3)],
                     "duration_s": 0.0}
        entry.update(stats)
        entry["status"] = ("completed with errors" if stats.get("errors")
                           else "completed")
        for key in report["totals"]:
            if key == "errors":
                report["totals"][key] += len(stats.get("errors", []))
            else:
                report["totals"][key] += stats.get(key, 0)
        report["sources"].append(entry)

    report["duration_s"] = round(time.monotonic() - started, 2)
    return report


def write_report(report: dict) -> tuple[Path, Path]:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    day = report["run_at"][:10]
    json_path = RUNS_DIR / f"{day}.json"
    md_path = RUNS_DIR / f"{day}.md"
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False)
                         + "\n", encoding="utf-8")

    lines = [
        f"# CivicPie data-agent run — {day}",
        "",
        f"Run at (UTC): {report['run_at']} · mode: {report['mode']} "
        f"· duration: {report['duration_s']}s",
        "",
        "## Totals",
        "",
        "| new | unchanged | changed queued | duplicates queued | rejected | errors |",
        "|---|---|---|---|---|---|",
        f"| {report['totals']['new']} | {report['totals']['unchanged']} "
        f"| {report['totals']['changed_queued']} "
        f"| {report['totals']['duplicates_queued']} "
        f"| {report['totals']['rejected']} | {report['totals']['errors']} |",
        "",
        "## Sources",
        "",
        "| source | status | fetched | parsed | new | changed | dup | rejected | errors |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for s in report["sources"]:
        lines.append(
            f"| {s['source_id']} | {s['status']} "
            f"| {s.get('fetched', '–')} | {s.get('parsed', '–')} "
            f"| {s.get('new', '–')} | {s.get('changed_queued', '–')} "
            f"| {s.get('duplicates_queued', '–')} | {s.get('rejected', '–')} "
            f"| {len(s.get('errors', []))} |")
    lines += ["", "## Source errors", ""]
    any_errors = False
    for s in report["sources"]:
        for err in s.get("errors", []):
            any_errors = True
            lines.append(f"- **{s['source_id']}**: {err[:300]}")
    if not any_errors:
        lines.append("None.")
    ms = report["meetings_snapshots"]
    lines += [
        "",
        "## Meetings snapshots (existing goal data — consumed, not re-scraped)",
        "",
        f"- dir: `{ms['dir']}`",
        f"- snapshot files: {ms['files']}"
        + (f" (newest: {ms['newest']}, {ms.get('newest_mtime', '')})"
           if ms.get("newest") else ""),
        f"- note: {ms['note']}",
        "",
        "## Review",
        "",
        "Run `python3 scripts/data-agent/review.py --summary` from the repo root, "
        "then promote approved keys with "
        "`python3 scripts/data-agent/promote.py --approve <source_key> [...]`.",
        "",
    ]
    md_path.write_text("\n".join(lines), encoding="utf-8")
    return json_path, md_path


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="CivicPie data agent — weekly run")
    ap.add_argument("--weekly", action="store_true",
                    help="run the weekly pipeline across enabled sources")
    ap.add_argument("--dry-run", action="store_true",
                    help="fetch/parse/normalize only; do not write staging")
    ap.add_argument("--source", default=None,
                    help="run only this source_id")
    args = ap.parse_args(argv)

    if not args.weekly:
        ap.print_help()
        return 2

    report = run_all(dry_run=args.dry_run, source_filter=args.source)
    json_path, md_path = write_report(report)

    t = report["totals"]
    print(f"run complete in {report['duration_s']}s "
          f"(mode={report['mode']}): new={t['new']} unchanged={t['unchanged']} "
          f"changed_queued={t['changed_queued']} "
          f"duplicates_queued={t['duplicates_queued']} "
          f"rejected={t['rejected']} errors={t['errors']}")
    print(f"report: {md_path}")
    print(f"report: {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
