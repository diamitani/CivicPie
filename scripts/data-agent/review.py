#!/usr/bin/env python3
"""Review gate for the CivicPie data agent (read-only).

Usage:
    python3 scripts/data-agent/review.py --summary [--source <source_id>] [--limit N]
    python3 -m scripts.data-agent.review --summary

Prints new / changed / conflicted counts with diffs. Never modifies
anything — promotion is promote.py's job, and only with --approve.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def _load(mod_name: str):
    """Import a sibling module by file path (hyphenated dir is not importable)."""
    path = HERE / f"{mod_name}.py"
    spec = importlib.util.spec_from_file_location(
        f"civicpie_data_agent_{mod_name}", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


staging = _load("staging")


def _label(rec: dict) -> str:
    if not rec:
        return "<none>"
    return (f"{rec.get('record_type')}/{rec.get('source_key')} "
            f"«{rec.get('full_name') or rec.get('title') or ''}»")


def _diff_lines(existing: dict, new: dict) -> list[str]:
    """Field-level diff: only fields that differ."""
    lines: list[str] = []
    for key in sorted(set(existing) | set(new)):
        old, cur = existing.get(key), new.get(key)
        if json.dumps(old, sort_keys=True) != json.dumps(cur, sort_keys=True):
            lines.append(f"    ~ {key}:")
            lines.append(f"        staged:   {json.dumps(old, ensure_ascii=False)[:160]}")
            lines.append(f"        incoming: {json.dumps(cur, ensure_ascii=False)[:160]}")
    return lines


def summarize(source_filter: str | None = None, limit: int = 25) -> str:
    records = staging.read_records()
    queue = staging.read_review()

    if source_filter:
        records = [r for r in records if r.get("source_id") == source_filter]
        queue = [e for e in queue
                 if (e.get("record") or {}).get("source_id") == source_filter]

    by_reason: dict[str, list[dict]] = {}
    for entry in queue:
        by_reason.setdefault(entry.get("reason", "?"), []).append(entry)

    changed = by_reason.get("changed", [])
    conflicted = (by_reason.get("possible_duplicate", [])
                  + by_reason.get("conflict", []))

    out = ["=== CivicPie data-agent review ==="]
    if source_filter:
        out.append(f"source filter: {source_filter}")
    out.append(f"new (staged, awaiting review):      {len(records)}")
    out.append(f"changed (same key, new content):    {len(changed)}")
    out.append(f"conflicted (needs human judgment):  {len(conflicted)}")
    out.append("")

    if records:
        out.append(f"--- new records (showing up to {limit}) ---")
        for rec in records[:limit]:
            out.append(f"  + {_label(rec)}  src={rec.get('source_url', '')[:80]}")
        if len(records) > limit:
            out.append(f"  … and {len(records) - limit} more")
        out.append("")

    for reason, entries, title in (
        ("changed", changed, "changed records"),
        ("conflicted", conflicted, "conflicted records"),
    ):
        if not entries:
            continue
        out.append(f"--- {title} (showing up to {limit}) ---")
        for entry in entries[:limit]:
            rec, existing = entry.get("record") or {}, entry.get("existing") or {}
            out.append(f"  ! [{entry.get('reason')}] {_label(rec)}")
            out.append(f"      queued_at: {entry.get('queued_at')}")
            diff = _diff_lines(existing, rec)
            out.extend(diff if diff else ["    (no field-level diff; see raw entry)"])
        if len(entries) > limit:
            out.append(f"  … and {len(entries) - limit} more")
        out.append("")

    out.append("Next: approve specific keys with")
    out.append("  python3 scripts/data-agent/promote.py --approve <source_key> [...]")
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Review the data-agent staging queue")
    ap.add_argument("--summary", action="store_true",
                    help="print new/changed/conflicted counts with diffs")
    ap.add_argument("--source", default=None,
                    help="only show entries for this source_id")
    ap.add_argument("--limit", type=int, default=25,
                    help="max entries shown per section")
    args = ap.parse_args(argv)

    if not args.summary:
        ap.print_help()
        return 2
    print(summarize(source_filter=args.source, limit=args.limit))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
