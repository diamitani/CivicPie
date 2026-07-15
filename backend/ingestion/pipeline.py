"""Ingestion orchestrator.

Wraps a `BaseIngestor` invocation in an IngestionRun row, batches inserts, and
guarantees the run row is closed even if the source raises. Sources never
import the ORM directly -- they yield IngestedRecord and the orchestrator
hands each record to upsert_term.

Usage:
    from backend.ingestion import run_pipeline
    summary = run_pipeline("congress_legislators")
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.db.models import IngestionRun
from backend.ingestion.base import BaseIngestor
from backend.ingestion.upsert import upsert_term
from backend.ingestion.sources.census_counties import CensusCountiesIngestor
from backend.ingestion.sources.congress_legislators import CongressLegislatorsIngestor
from backend.ingestion.sources.federal_executive import FederalExecutiveIngestor
from backend.ingestion.sources.federal_judiciary import FederalJudiciaryIngestor
from backend.ingestion.sources.google_civic import GoogleCivicIngestor
from backend.ingestion.sources.openstates import OpenStatesIngestor
from backend.ingestion.sources.state_executives import StateExecutivesIngestor

log = logging.getLogger(__name__)

REGISTRY: dict[str, type[BaseIngestor]] = {
    CongressLegislatorsIngestor.key: CongressLegislatorsIngestor,
    FederalExecutiveIngestor.key: FederalExecutiveIngestor,
    FederalJudiciaryIngestor.key: FederalJudiciaryIngestor,
    StateExecutivesIngestor.key: StateExecutivesIngestor,
    OpenStatesIngestor.key: OpenStatesIngestor,
    GoogleCivicIngestor.key: GoogleCivicIngestor,
    CensusCountiesIngestor.key: CensusCountiesIngestor,
}

# Sources that are run by default in the Tier-1 pipeline.
TIER_1_DEFAULTS = [
    CongressLegislatorsIngestor.key,
    FederalExecutiveIngestor.key,
    FederalJudiciaryIngestor.key,
    StateExecutivesIngestor.key,
    OpenStatesIngestor.key,
]


def run_pipeline(
    source_key: str,
    session: Session | None = None,
    commit_every: int = 200,
    **ingestor_kwargs: Any,
) -> dict[str, int | str]:
    if source_key not in REGISTRY:
        raise KeyError(f"Unknown source {source_key!r}. Known: {sorted(REGISTRY)}")

    cls = REGISTRY[source_key]
    ingestor = cls(**ingestor_kwargs)

    owns_session = session is None
    session = session or SessionLocal()
    run = IngestionRun(source_key=source_key, status="running", parameters=ingestor_kwargs or None)
    session.add(run)
    session.flush()

    seen = inserted = updated = failed = 0
    run_id = run.id
    try:
        for record in ingestor.fetch():
            seen += 1
            try:
                _term, action = upsert_term(session, record, run=run)
                if action == "inserted":
                    inserted += 1
                else:
                    updated += 1
            except Exception:
                failed += 1
                log.exception("upsert failed for record %s", record.full_name)
                session.rollback()
            if seen % commit_every == 0:
                session.commit()
                log.info(
                    "%s: progress seen=%d inserted=%d updated=%d failed=%d",
                    source_key, seen, inserted, updated, failed,
                )

        run.status = "succeeded" if failed == 0 else "partial"
    except Exception as exc:
        run.status = "failed"
        run.error_message = str(exc)
        log.exception("pipeline %s failed", source_key)
        raise
    finally:
        run.records_seen = seen
        run.records_inserted = inserted
        run.records_updated = updated
        run.records_failed = failed
        run.finished_at = datetime.now(tz=timezone.utc)
        status = run.status
        session.commit()
        if owns_session:
            session.close()

    return {
        "source": source_key,
        "run_id": run_id,
        "status": status,
        "seen": seen,
        "inserted": inserted,
        "updated": updated,
        "failed": failed,
    }
