"""Staging store for the CivicPie data agent.

Staging is append-only JSONL:
  staging/records.jsonl       — normalized, deduped, not-yet-reviewed records
  staging/review_queue.jsonl  — conflicts / changes needing a human
                                {record, existing, reason, queued_at}
  staging/promotions.log      — audit trail of every promote.py run

Nothing in staging/ is production data. promote.py is the ONLY writer
into data/seed/.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Iterable

BASE_DIR = Path(__file__).resolve().parent
STAGING_DIR = BASE_DIR / "staging"
RECORDS_FILE = STAGING_DIR / "records.jsonl"
REVIEW_FILE = STAGING_DIR / "review_queue.jsonl"
PROMOTIONS_LOG = STAGING_DIR / "promotions.log"

REVIEW_REASONS = {"changed", "possible_duplicate", "conflict"}


def ensure_dirs() -> None:
    STAGING_DIR.mkdir(parents=True, exist_ok=True)


def _utcnow_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    rows: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except ValueError:
            continue  # never let one corrupt line kill a read
    return rows


def _append_jsonl(path: Path, obj: dict) -> None:
    ensure_dirs()
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(obj, ensure_ascii=False) + "\n")


# ---------------- records ----------------
def append_record(record: dict) -> None:
    _append_jsonl(RECORDS_FILE, record)


def read_records() -> list[dict]:
    return _read_jsonl(RECORDS_FILE)


def read_records_by_key() -> dict[str, dict]:
    return {r.get("source_key"): r for r in read_records()
            if r.get("source_key")}


def remove_records(keys: Iterable[str]) -> int:
    """Remove staged records by source_key (used after promotion)."""
    keys = set(keys)
    remaining = [r for r in read_records() if r.get("source_key") not in keys]
    removed = len(read_records()) - len(remaining)
    RECORDS_FILE.write_text(
        "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in remaining),
        encoding="utf-8")
    return removed


# ---------------- review queue ----------------
def append_review(record: dict, existing: dict | None,
                  reason: str, extra: dict | None = None) -> None:
    if reason not in REVIEW_REASONS:
        raise ValueError(f"unknown review reason: {reason!r}")
    entry = {
        "record": record,
        "existing": existing,
        "reason": reason,
        "queued_at": _utcnow_iso(),
    }
    if extra:
        entry.update(extra)
    _append_jsonl(REVIEW_FILE, entry)


def read_review() -> list[dict]:
    return _read_jsonl(REVIEW_FILE)


def pending_keys() -> set[str]:
    """source_keys with unresolved review entries."""
    keys = set()
    for entry in read_review():
        rec = entry.get("record") or {}
        if rec.get("source_key"):
            keys.add(rec["source_key"])
    return keys


def remove_review_entries(keys: Iterable[str]) -> int:
    keys = set(keys)
    remaining = [e for e in read_review()
                 if (e.get("record") or {}).get("source_key") not in keys]
    removed = len(read_review()) - len(remaining)
    REVIEW_FILE.write_text(
        "".join(json.dumps(e, ensure_ascii=False) + "\n" for e in remaining),
        encoding="utf-8")
    return removed


# ---------------- promotions audit log ----------------
def log_promotion(lines: list[str]) -> None:
    ensure_dirs()
    stamp = _utcnow_iso()
    with PROMOTIONS_LOG.open("a", encoding="utf-8") as fh:
        for line in lines:
            fh.write(f"[{stamp}] {line}\n")
