"""CLI for running ingestion jobs.

Examples:
    python -m backend.ingestion.cli list
    python -m backend.ingestion.cli run congress_legislators
    python -m backend.ingestion.cli run openstates --states il ny ca
    python -m backend.ingestion.cli tier1
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from typing import Sequence

from backend.ingestion.pipeline import REGISTRY, TIER_1_DEFAULTS, run_pipeline


def _list_sources() -> int:
    rows = []
    for key, cls in REGISTRY.items():
        rows.append(
            f"  {key:25s}  levels={','.join(cls.coverage_levels) or '-':20s}  "
            f"states={','.join(cls.coverage_states) or '-'}\n      {cls.description}"
        )
    print("Registered ingestion sources:\n" + "\n".join(rows))
    return 0


def _run(args: argparse.Namespace) -> int:
    kwargs: dict = {}
    if args.states:
        kwargs["states"] = args.states
    if args.local_dir:
        kwargs["local_dir"] = args.local_dir
    if args.address:
        kwargs["addresses"] = args.address
    summary = run_pipeline(args.source, **kwargs)
    print(json.dumps(summary, indent=2, default=str))
    return 0 if summary["status"] in {"succeeded", "partial"} else 1


def _tier1(args: argparse.Namespace) -> int:
    summaries = []
    rc = 0
    for key in TIER_1_DEFAULTS:
        try:
            summaries.append(run_pipeline(key))
        except Exception as exc:
            rc = 1
            summaries.append({"source": key, "status": "failed", "error": str(exc)})
    print(json.dumps(summaries, indent=2, default=str))
    return rc


KEYLESS_SOURCES = [
    "federal_executive", "state_executives", "congress_legislators",
    "federal_judiciary", "census_counties",
]


def _seed() -> int:
    """Fill the database from every source that needs no API key."""
    from backend.ingestion.agencies import run_agency_pipeline

    summaries, rc = [], 0
    for key in KEYLESS_SOURCES:
        try:
            summaries.append(run_pipeline(key))
        except Exception as exc:
            rc = 1
            summaries.append({"source": key, "status": "failed", "error": str(exc)})
    try:
        summaries.append(run_agency_pipeline())
    except Exception as exc:
        rc = 1
        summaries.append({"source": "agencies:federal_register", "status": "failed", "error": str(exc)})
    print(json.dumps(summaries, indent=2, default=str))
    return rc


def main(argv: Sequence[str] | None = None) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    parser = argparse.ArgumentParser(prog="civicpie-ingest")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="list registered sources")

    run_p = sub.add_parser("run", help="run a single source")
    run_p.add_argument("source", choices=sorted(REGISTRY))
    run_p.add_argument("--states", nargs="*", help="filter to specific state codes (lowercase)")
    run_p.add_argument("--local-dir", help="local directory of YAML for offline sources")
    run_p.add_argument(
        "--address", action="append", help="address(es) for google_civic; repeatable"
    )

    sub.add_parser("tier1", help="run the default Tier-1 federal+state pipeline")
    sub.add_parser("agencies", help="ingest federal agencies from the Federal Register")
    enrich_p = sub.add_parser("enrich-wikipedia", help="add bios/photos from Wikipedia (exact-title matches only)")
    enrich_p.add_argument("--limit", type=int, help="max people to enrich this run")
    places_p = sub.add_parser("enrich-places", help="Google Places address/phone/website (billed; needs GOOGLE_MAPS_API_KEY)")
    places_p.add_argument("--level", default="county", choices=["county", "city"])
    places_p.add_argument("--state", help="two-letter state code")
    places_p.add_argument("--limit", type=int, default=25, help="max requests (billed!)")
    sub.add_parser("seed", help="fill the DB from every keyless source (officials + counties + agencies)")

    args = parser.parse_args(argv)
    if args.cmd == "list":
        return _list_sources()
    if args.cmd == "run":
        return _run(args)
    if args.cmd == "tier1":
        return _tier1(args)
    if args.cmd == "agencies":
        from backend.ingestion.agencies import run_agency_pipeline
        print(json.dumps(run_agency_pipeline(), indent=2, default=str))
        return 0
    if args.cmd == "enrich-wikipedia":
        from backend.ingestion.enrich_wikipedia import run_wikipedia_enrichment
        print(json.dumps(run_wikipedia_enrichment(limit=args.limit), indent=2))
        return 0
    if args.cmd == "enrich-places":
        from backend.ingestion.enrich_places import run_places_enrichment
        print(json.dumps(run_places_enrichment(level=args.level, limit=args.limit, state=args.state), indent=2))
        return 0
    if args.cmd == "seed":
        return _seed()
    parser.error(f"unknown command {args.cmd}")
    return 2


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
