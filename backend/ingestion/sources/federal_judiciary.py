"""Federal Judicial Center (FJC) Article III judges ingestor.

The FJC maintains the authoritative biographical directory of every judge
who has served on an Article III court (SCOTUS, Courts of Appeals, District
Courts, Court of International Trade). The dataset is public-domain CSV
covering all judges since 1789.

We ingest only *active* judges (no termination date on their current
appointment), which is ~870 people. Historical judges bloat the DB and slow
active-officeholder queries; we can add a separate ingestor for them if
research features ever need the full history.

Data source: https://www.fjc.gov/history/judges/biographical-directory-article-iii-federal-judges-export
Column reference: https://www.fjc.gov/history/judges/biographical-directory-article-iii-federal-judges-export-column-descriptions

Set FJC_JUDGES_CSV to override the default URL or point at a local file.
"""

from __future__ import annotations

import csv
import io
import logging
import os
from datetime import date, datetime
from typing import Any, Iterable, Optional

import httpx

from backend.ingestion.base import BaseIngestor, IngestedRecord
from backend.models.official import Branch, GovernmentLevel, Party

log = logging.getLogger(__name__)

USER_AGENT = "CivicPie Bot (civic engagement platform; +https://civicpie.com)"
FJC_CSV_URL = "https://www.fjc.gov/sites/default/files/history/judges.csv"

# The FJC dataset has one row per (judge, appointment). A judge can appear in
# up to six appointment slots — the "Appointment Position (1..6)" columns.
APPOINTMENT_INDICES = ("1", "2", "3", "4", "5", "6")


def _parse_date(value: Any) -> Optional[date]:
    if value in (None, "", "NULL"):
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    return None


def _iso(value: Optional[date]) -> Optional[str]:
    return value.isoformat() if value else None


class FederalJudiciaryIngestor(BaseIngestor):
    key = "federal_judiciary"
    name = "Federal Judicial Center (Article III Judges)"
    description = (
        "All currently-serving Article III federal judges (SCOTUS, Courts of "
        "Appeals, District Courts, CIT) via the FJC Biographical Directory. "
        "Public-domain CSV, no API key."
    )
    coverage_levels = [GovernmentLevel.FEDERAL.value]
    coverage_states = ["ALL"]

    def __init__(self, **params: Any) -> None:
        super().__init__(**params)
        self.csv_path = params.get("csv_path") or os.environ.get("FJC_JUDGES_CSV")
        self.url = params.get("url", FJC_CSV_URL)
        self.timeout = params.get("timeout", 60.0)
        # Default = judges holding an active (non-senior) seat, ~850 nationwide.
        self.include_senior = params.get("include_senior", False)
        self.include_historical = params.get("include_historical", False)

    def _load_rows(self) -> list[dict]:
        if self.csv_path:
            log.info("fjc: reading %s", self.csv_path)
            with open(self.csv_path, "r", encoding="utf-8-sig") as f:
                return list(csv.DictReader(f))
        log.info("fjc: fetching %s", self.url)
        with httpx.Client(timeout=self.timeout, headers={"User-Agent": USER_AGENT}) as client:
            resp = client.get(self.url)
            resp.raise_for_status()
            return list(csv.DictReader(io.StringIO(resp.text.lstrip("\ufeff"))))

    def fetch(self) -> Iterable[IngestedRecord]:
        for row in self._load_rows():
            yield from self._records_from_row(row)

    def _records_from_row(self, row: dict) -> Iterable[IngestedRecord]:
        nid = (row.get("nid") or "").strip()
        first = (row.get("First Name") or "").strip()
        middle = (row.get("Middle Name") or "").strip()
        last = (row.get("Last Name") or "").strip()
        suffix = (row.get("Suffix") or "").strip()
        full_name = " ".join(v for v in (first, middle, last, suffix) if v).strip()
        if not full_name:
            return
        deceased = bool((row.get("Death Year") or "").strip())
        birth = _birth_date(row)
        gender = {"Male": "M", "Female": "F"}.get((row.get("Gender") or "").strip())

        for idx in APPOINTMENT_INDICES:
            court = (row.get(f"Court Name ({idx})") or "").strip()
            if not court:
                continue
            termination = _parse_date(row.get(f"Termination Date ({idx})"))
            senior = _parse_date(row.get(f"Senior Status Date ({idx})"))
            if not self.include_historical and (termination or deceased):
                continue
            if not self.include_historical and senior and not self.include_senior:
                continue

            party_label = (row.get(f"Party of Appointing President ({idx})") or "").strip()
            court_level = _classify_court(court)
            seat_id = (row.get(f"Seat ID ({idx})") or "").strip()
            yield IngestedRecord(
                full_name=full_name,
                first_name=first or None,
                middle_name=middle or None,
                last_name=last or None,
                suffix=suffix or None,
                gender=gender,
                birth_date=birth,
                fjc_id=nid or None,
                jurisdiction_name="United States",
                jurisdiction_level=GovernmentLevel.FEDERAL,
                jurisdiction_ocd_id="ocd-division/country:us",
                office_title=_office_title(court),
                branch=Branch.JUDICIAL,
                chamber=court_level,
                seat=seat_id or court,
                is_elected=False,
                party=_party_from_label(party_label),
                party_label=party_label or None,
                start_date=_parse_date(row.get(f"Commission Date ({idx})")),
                end_date=termination,
                is_current=termination is None and not deceased,
                extra_data={
                    "court": court,
                    "court_level": court_level,
                    "seat_id": seat_id or None,
                    "appointing_president": (row.get(f"Appointing President ({idx})") or "").strip() or None,
                    "confirmation_date": _iso(_parse_date(row.get(f"Confirmation Date ({idx})"))),
                    "aba_rating": (row.get(f"ABA Rating ({idx})") or "").strip() or None,
                    "senior_status_date": _iso(senior),
                    "chief_judge_begin": (row.get(f"Service as Chief Judge, Begin ({idx})") or "").strip() or None,
                    "chief_judge_end": (row.get(f"Service as Chief Judge, End ({idx})") or "").strip() or None,
                    "appointment_position": int(idx),
                },
            )


def _birth_date(row: dict) -> Optional[date]:
    """Only return a birth date when year, month and day are all present --
    a bare year must not become a fake January 1 (it would corrupt identity matching)."""
    try:
        return date(int(row["Birth Year"]), int(row["Birth Month"]), int(row["Birth Day"]))
    except (KeyError, TypeError, ValueError):
        return None


def _office_title(court: str) -> str:
    low = court.lower()
    if "supreme court" in low:
        return "Justice of the Supreme Court"
    if "court of appeals" in low or "circuit" in low:
        return f"Judge, {court}"
    if "district court" in low or "district of" in low:
        return f"Judge, {court}"
    if "international trade" in low:
        return f"Judge, {court}"
    return f"Judge, {court}"


def _classify_court(court: str) -> str:
    low = court.lower()
    if "supreme court" in low:
        return "scotus"
    if "court of appeals" in low or "circuit" in low:
        return "appeals"
    if "international trade" in low:
        return "cit"
    if "district court" in low or "district of" in low:
        return "district"
    return "other"


def _party_from_label(label: str) -> Optional[Party]:
    lower = (label or "").strip().lower()
    if not lower:
        return None
    if "democrat" in lower:
        return Party.DEMOCRAT
    if "republican" in lower:
        return Party.REPUBLICAN
    if "whig" in lower or "federalist" in lower:
        return Party.OTHER
    return Party.OTHER
