#!/usr/bin/env python3
"""Promote staged records into production seed data.

THIS IS THE ONLY PATH INTO data/seed/. It refuses to run without an
explicit --approve listing the exact source_keys a human reviewed.

Usage:
    python3 scripts/data-agent/promote.py --approve <source_key> [<source_key> ...]
    python3 scripts/data-agent/promote.py --approve KEY1 KEY2 --force   # also clear pending review entries

Rules:
  * no --approve (or an empty list) → hard refusal, exit 2, nothing written
  * unknown source_key → reported, skipped
  * a key with unresolved review_queue entries is skipped unless --force
  * every run (including refusals) is appended to staging/promotions.log
  * promoted records merge into data/seed/data-agent-promoted.json by source_key
    (dedupe by key; file stays sorted) and are removed from the staging queue

App wiring note: data/seed/data-agent-promoted.json is NOT yet read by
src/lib/civic/seed.ts — adding it to loadSeed() is a separate, human-approved
site change (see README).
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent  # scripts/data-agent -> repo root
SEED_DIR = REPO_ROOT / "data" / "seed"
PROMOTED_FILE = SEED_DIR / "data-agent-promoted.json"


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


staging = _load_sibling("staging")
pipeline = _load_sibling("pipeline")


def _utcnow_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _read_promoted() -> list[dict]:
    if not PROMOTED_FILE.exists():
        return []
    try:
        data = json.loads(PROMOTED_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except ValueError:
        return []


def promote(keys: list[str], *, force: bool = False) -> dict:
    """Promote staged records. Returns a result dict; never raises."""
    result: dict = {
        "requested": list(keys), "promoted": [], "skipped": {},
        "target": str(PROMOTED_FILE), "at": _utcnow_iso(),
    }
    staged_by_key = staging.read_records_by_key()
    pending = staging.pending_keys()

    for key in keys:
        rec = staged_by_key.get(key)
        if rec is None:
            result["skipped"][key] = "not found in staging"
            continue
        problems = pipeline.validate_record(rec)
        if problems:
            result["skipped"][key] = "failed validation: " + "; ".join(problems)
            continue
        if key in pending and not force:
            result["skipped"][key] = (
                "has unresolved review-queue entries; resolve via review.py "
                "or re-run with --force")
            continue
        result["promoted"].append(rec)

    if result["promoted"]:
        merged = {r.get("source_key"): r for r in _read_promoted()}
        for rec in result["promoted"]:
            merged[rec["source_key"]] = rec
        ordered = [merged[k] for k in sorted(merged)]
        SEED_DIR.mkdir(parents=True, exist_ok=True)
        PROMOTED_FILE.write_text(
            json.dumps(ordered, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8")
        promoted_keys = [r["source_key"] for r in result["promoted"]]
        staging.remove_records(promoted_keys)
        staging.remove_review_entries(promoted_keys)

    # audit log — every invocation, including refusals and no-ops
    log_lines = [
        f"promote invoked: approve={keys} force={force}",
        f"promoted {len(result['promoted'])} -> {PROMOTED_FILE.name}",
    ]
    for key, reason in result["skipped"].items():
        log_lines.append(f"skipped {key}: {reason}")
    staging.log_promotion(log_lines)
    return result


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(
        description="Promote reviewed staging records into data/seed/ "
                    "(requires explicit --approve)")
    ap.add_argument("--approve", nargs="*", default=None,
                    help="source_key(s) a human reviewed and approved")
    ap.add_argument("--force", action="store_true",
                    help="also promote keys with unresolved review entries")
    args = ap.parse_args(argv)

    if not args.approve:
        msg = ("REFUSAL: promote.py requires explicit --approve <source_key> [...]. "
               "Unreviewed staging never ships. Run review.py --summary first.")
        print(msg, file=sys.stderr)
        staging.log_promotion([f"REFUSED invocation (no --approve): argv={argv}"])
        return 2

    result = promote(args.approve, force=args.force)
    print(f"promoted {len(result['promoted'])}/{len(result['requested'])} "
          f"-> {result['target']}")
    for key in result["promoted"]:
        print(f"  + {key}")
    for key, reason in result["skipped"].items():
        print(f"  ! skipped {key}: {reason}")
    if result["skipped"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
