"""CivicPie data-agent pipeline: fetch → parse → normalize → dedupe → stage.

Adapters live in adapters/<module>.py and MUST honor this contract:

    URLS: list[str]                      # or: def get_urls(ctx) -> list[str]
    def parse(payload: dict, ctx: dict) -> list[dict]:
        # payload: {"url","status","headers","body","from_cache","fetched_at"}
        # ctx:     {"source": <sources.yaml entry>, "fetched_at": <iso>}
        # returns records matching the PRD §3 schema (list of dicts)

The pipeline loads the adapter from the adapters/ file directly
(importlib from file path), so adapters/ does not need to be a package.

Record schema (PRD §3) — mandatory provenance fields:
    source_id, source_key, source_url, scraped_at
(official records additionally require full_name.)
"""

from __future__ import annotations

import difflib
import html
import importlib.util
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent


def _load_sibling(mod_name: str):
    """Import a sibling module by file path (the hyphenated dir name
    is not importable as a package member). Results are cached in
    sys.modules so repeated loads return the same module object."""
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
_fetcher = _load_sibling("fetcher")
PoliteFetcher = _fetcher.PoliteFetcher
FetchResult = _fetcher.FetchResult

BASE_DIR = Path(__file__).resolve().parent
ADAPTERS_DIR = BASE_DIR / "adapters"

FUZZY_NAME_THRESHOLD = 0.88

# Universal mandatory fields; per-type extras added below.
MANDATORY_FIELDS = ["record_type", "source_id", "source_key",
                    "source_url", "scraped_at"]
OFFICIAL_MANDATORY = ["full_name"]
VALID_RECORD_TYPES = {"official", "meeting", "district", "committee"}

_TAG_RE = re.compile(r"<[^>]+>")

_DATE_FORMATS = (
    "%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%m-%d-%Y",
    "%b %d, %Y", "%B %d, %Y", "%d %b %Y", "%d %B %Y",
    "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ",
)


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------- adapter loading ----------------
def load_adapter(module_name: str, adapters_dir: Path | None = None):
    """Load adapters/<module_name>.py from its file path.

    Raises FileNotFoundError when the adapter file does not exist.
    """
    directory = Path(adapters_dir) if adapters_dir else ADAPTERS_DIR
    path = directory / f"{module_name}.py"
    if not path.exists():
        # Fallback: maybe adapters/ is a real package on sys.path.
        try:
            return importlib.import_module(f"adapters.{module_name}")
        except ImportError:
            pass
        raise FileNotFoundError(f"adapter file not found: {path}")
    spec = importlib.util.spec_from_file_location(
        f"civicpie_data_agent_adapters.{module_name}", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"cannot load adapter module: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def adapter_urls(adapter, ctx: dict) -> list[str]:
    if hasattr(adapter, "get_urls"):
        urls = adapter.get_urls(ctx)
    elif hasattr(adapter, "URLS"):
        urls = adapter.URLS
    else:
        raise AttributeError(
            "adapter must define URLS or get_urls(ctx)")
    return list(urls or [])


# ---------------- normalize ----------------
def strip_html(text: str) -> str:
    text = _TAG_RE.sub(" ", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_date(value) -> str | None:
    """Best-effort → ISO YYYY-MM-DD. Returns None when unparseable."""
    if value is None or value == "":
        return None
    s = str(value).strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        return s
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    # last resort: grab a leading YYYY-MM-DD-ish prefix
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return m.group(0)
    return None


def _clean_strings(obj):
    if isinstance(obj, str):
        return strip_html(obj)
    if isinstance(obj, dict):
        return {k: _clean_strings(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean_strings(v) for v in obj]
    return obj


def normalize_record(rec: dict) -> dict:
    """Normalize one record in place-ish (returns a new dict)."""
    rec = _clean_strings(dict(rec))
    for key in ("office_id", "district_id"):
        if isinstance(rec.get(key), str):
            rec[key] = rec[key].strip().lower()
    for key in ("term_start", "term_end"):
        if key in rec:
            rec[key] = normalize_date(rec.get(key))
    if not isinstance(rec.get("contact"), dict):
        rec["contact"] = {"email": None, "phone": None, "website": None}
    else:
        for k in ("email", "phone", "website"):
            rec["contact"].setdefault(k, None)
    if not isinstance(rec.get("external_ids"), dict):
        rec["external_ids"] = {"photo_url": None}
    if not isinstance(rec.get("conflicts"), list):
        rec["conflicts"] = []
    if not rec.get("scraped_at"):
        rec["scraped_at"] = utcnow_iso()
    return rec


# ---------------- validate ----------------
def validate_record(rec: dict) -> list[str]:
    """Return a list of problems (empty = valid)."""
    problems = []
    if not isinstance(rec, dict):
        return ["record is not a dict"]
    for f in MANDATORY_FIELDS:
        if not rec.get(f):
            problems.append(f"missing mandatory field: {f}")
    if rec.get("record_type") == "official":
        for f in OFFICIAL_MANDATORY:
            if not rec.get(f):
                problems.append(f"missing mandatory field: {f}")
    if rec.get("record_type") not in VALID_RECORD_TYPES:
        problems.append(f"invalid record_type: {rec.get('record_type')!r}")
    return problems


# ---------------- dedupe ----------------
def _canonical(rec: dict) -> str:
    return json.dumps(rec, sort_keys=True, ensure_ascii=False)


def _name_key(rec: dict) -> str:
    name = (rec.get("full_name") or "").lower()
    return re.sub(r"[^a-z ]", "", name).strip()


def dedupe(records: list[dict], staged: list[dict]) -> dict:
    """Split fresh records into new / unchanged / changed / possible_duplicate.

    * exact source_key match + identical content → unchanged (dropped)
    * exact source_key match + different content → review entry (changed)
    * no source_key match but fuzzy name+district match → review (possible_duplicate)
    * else → new (staged)
    """
    by_key = {r.get("source_key"): r for r in staged}
    seen_keys: set[str] = set()
    out = {"new": [], "unchanged": [], "changed": [], "possible_duplicate": []}

    for rec in records:
        key = rec.get("source_key")
        if key in seen_keys:
            continue  # duplicate inside this same batch
        seen_keys.add(key)

        existing = by_key.get(key)
        if existing is not None:
            if _canonical(existing) == _canonical(rec):
                out["unchanged"].append(rec)
            else:
                out["changed"].append({"record": rec, "existing": existing})
            continue

        dup = None
        name = _name_key(rec)
        district = (rec.get("district_id") or "").lower()
        if name and district:
            for cand in staged:
                if (cand.get("district_id") or "").lower() != district:
                    continue
                ratio = difflib.SequenceMatcher(
                    None, name, _name_key(cand)).ratio()
                if ratio >= FUZZY_NAME_THRESHOLD:
                    dup = cand
                    break
        if dup is not None:
            out["possible_duplicate"].append({"record": rec, "existing": dup})
        else:
            out["new"].append(rec)
    return out


# ---------------- run one source ----------------
def run_source(source: dict, *, dry_run: bool = False,
               adapters_dir: Path | None = None,
               cache_dir: Path | None = None) -> dict:
    """Run the full pipeline for one sources.yaml entry.

    Returns a stats dict. Never raises for adapter/fetch problems —
    failures are recorded in stats["errors"].
    """
    stats = {
        "source_id": source["id"],
        "fetched": 0, "parsed": 0,
        "new": 0, "unchanged": 0,
        "changed_queued": 0, "duplicates_queued": 0,
        "rejected": 0, "errors": [],
    }
    started = time.monotonic()
    try:
        adapter = load_adapter(source["adapter"], adapters_dir)
    except (FileNotFoundError, ImportError, AttributeError) as exc:
        stats["errors"].append(f"adapter unavailable: {exc}")
        stats["duration_s"] = round(time.monotonic() - started, 2)
        return stats

    ctx = {"source": source, "fetched_at": utcnow_iso()}
    try:
        urls = adapter_urls(adapter, ctx)
    except Exception as exc:  # noqa: BLE001 — adapter bug, keep going
        stats["errors"].append(f"adapter URL listing failed: {exc}")
        stats["duration_s"] = round(time.monotonic() - started, 2)
        return stats

    fetcher = PoliteFetcher(
        cache_dir if cache_dir else BASE_DIR / ".cache",
        rate_limit_rps=float(source.get("rate_limit_rps", 1.0)),
        respect_robots=bool(source.get("respect_robots", True)),
    )

    all_records: list[dict] = []
    for url in urls:
        result = fetcher.get(url)
        if result.blocked_by_robots:
            stats["errors"].append(f"blocked by robots.txt: {url}")
            continue
        if not result.ok:
            stats["errors"].append(
                f"fetch failed ({result.status}): {url} — {result.error}")
            continue
        stats["fetched"] += 1
        try:
            parsed = adapter.parse(result.payload(), ctx)
        except Exception as exc:  # noqa: BLE001 — adapter bug, keep going
            stats["errors"].append(f"adapter.parse failed for {url}: {exc}")
            continue
        all_records.extend(parsed or [])

    stats["parsed"] = len(all_records)

    valid: list[dict] = []
    for rec in all_records:
        problems = validate_record(rec)
        if problems:
            stats["rejected"] += 1
            stats["errors"].append(
                f"rejected record {rec.get('source_key') if isinstance(rec, dict) else '?'}: "
                + "; ".join(problems))
            continue
        valid.append(normalize_record(rec))

    staged = staging.read_records()
    parts = dedupe(valid, staged)

    if not dry_run:
        for rec in parts["new"]:
            staging.append_record(rec)
        for item in parts["changed"]:
            staging.append_review(
                record=item["record"], existing=item["existing"],
                reason="changed")
        for item in parts["possible_duplicate"]:
            staging.append_review(
                record=item["record"], existing=item["existing"],
                reason="possible_duplicate")

    stats["new"] = len(parts["new"])
    stats["unchanged"] = len(parts["unchanged"])
    stats["changed_queued"] = len(parts["changed"])
    stats["duplicates_queued"] = len(parts["possible_duplicate"])
    stats["duration_s"] = round(time.monotonic() - started, 2)
    return stats
