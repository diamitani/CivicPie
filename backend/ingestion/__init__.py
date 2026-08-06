"""Ingestion pipeline for the elected officials database.

Each module in `sources/` implements a single upstream feed and inherits from
`base.BaseIngestor`. The orchestrator (see `pipeline.py` and `cli.py`) iterates
over registered sources, opens a transactional `IngestionRun`, and routes
records through `upsert.upsert_term` so identity resolution is consistent
across federal, state, and (eventually) local feeds.
"""

from backend.ingestion.base import BaseIngestor, IngestedRecord
from backend.ingestion.pipeline import run_pipeline, REGISTRY

__all__ = ["BaseIngestor", "IngestedRecord", "run_pipeline", "REGISTRY"]
