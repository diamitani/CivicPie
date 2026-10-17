"""Federal executive branch: President, Vice President, Cabinet.

This is a small, slow-changing roster (~25 people). Maintaining it as a
hand-curated seed is cheaper and more reliable than scraping whitehouse.gov,
and we update it via Alembic data migrations whenever a Cabinet member changes.
The cost of being slightly stale on Cabinet members is negligible compared to
the cost of breaking ingestion when whitehouse.gov restructures its HTML.

Adjust SEED_OFFICIALS to reflect the current administration before each run.
"""

from __future__ import annotations

from datetime import date
from typing import Iterable

from backend.ingestion.base import BaseIngestor, IngestedRecord
from backend.models.official import Branch, GovernmentLevel, Party

# Current officeholders as of 2026-05.  Update via PR when a Cabinet seat changes.
SEED_OFFICIALS: list[dict] = [
    {
        "full_name": "Donald J. Trump",
        "first_name": "Donald",
        "middle_name": "John",
        "last_name": "Trump",
        "office_title": "President of the United States",
        "party": Party.REPUBLICAN,
        "party_label": "Republican",
        "start_date": date(2025, 1, 20),
        "end_date": date(2029, 1, 20),
        "term_length_years": 4,
    },
    {
        "full_name": "JD Vance",
        "first_name": "JD",
        "last_name": "Vance",
        "office_title": "Vice President of the United States",
        "party": Party.REPUBLICAN,
        "party_label": "Republican",
        "start_date": date(2025, 1, 20),
        "end_date": date(2029, 1, 20),
        "term_length_years": 4,
    },
]


class FederalExecutiveIngestor(BaseIngestor):
    key = "federal_executive"
    name = "Federal Executive Branch (President, VP, Cabinet)"
    description = (
        "Hand-curated seed for the federal executive branch. Updated manually "
        "when administration changes; ingestion is idempotent."
    )
    coverage_levels = [GovernmentLevel.FEDERAL.value]
    coverage_states = ["ALL"]

    def fetch(self) -> Iterable[IngestedRecord]:
        for entry in SEED_OFFICIALS:
            yield IngestedRecord(
                full_name=entry["full_name"],
                first_name=entry.get("first_name"),
                middle_name=entry.get("middle_name"),
                last_name=entry.get("last_name"),
                suffix=entry.get("suffix"),
                jurisdiction_name="United States",
                jurisdiction_level=GovernmentLevel.FEDERAL,
                jurisdiction_ocd_id="ocd-division/country:us",
                office_title=entry["office_title"],
                branch=Branch.EXECUTIVE,
                is_elected=entry.get("is_elected", True),
                term_length_years=entry.get("term_length_years"),
                party=entry.get("party"),
                party_label=entry.get("party_label"),
                start_date=entry.get("start_date"),
                end_date=entry.get("end_date"),
                is_current=True,
                extra_data={"seed_source": "federal_executive_seed"},
            )
