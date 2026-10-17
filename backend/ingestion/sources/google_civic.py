"""Google Civic Information API as a cross-reference source.

The Civic Info API is best for verifying contact info and OCD division IDs at
all levels, but its `representatives` endpoint is keyed on an address rather
than a global roster. We use it in two modes:

  1. lookup(address)        -- ad-hoc, for the frontend "find my reps" feature
  2. seed_known_addresses() -- iterate over a list of representative addresses
                                (state capitols, county seats) to backfill OCD
                                IDs onto rows ingested from other sources.

This source is intentionally NOT included in the default pipeline; it's
expensive and quota-limited. Trigger it explicitly via the CLI when needed.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Iterable, Iterator, Optional

import httpx

from backend.ingestion.base import BaseIngestor, IngestedRecord
from backend.models.official import Branch, GovernmentLevel, Party

log = logging.getLogger(__name__)

CIVIC_BASE = "https://www.googleapis.com/civicinfo/v2"

LEVEL_MAP = {
    "country": GovernmentLevel.FEDERAL,
    "administrativeArea1": GovernmentLevel.STATE,
    "regional": GovernmentLevel.COUNTY,
    "administrativeArea2": GovernmentLevel.COUNTY,
    "locality": GovernmentLevel.CITY,
    "subLocality1": GovernmentLevel.LOCAL,
    "subLocality2": GovernmentLevel.LOCAL,
    "special": GovernmentLevel.LOCAL,
}

PARTY_MAP = {
    "Democratic": Party.DEMOCRAT,
    "Democratic Party": Party.DEMOCRAT,
    "Republican": Party.REPUBLICAN,
    "Republican Party": Party.REPUBLICAN,
    "Independent": Party.INDEPENDENT,
    "Libertarian": Party.LIBERTARIAN,
    "Green": Party.GREEN,
}

BRANCH_KEYWORDS = {
    "judge": Branch.JUDICIAL, "justice": Branch.JUDICIAL, "court": Branch.JUDICIAL,
    "senator": Branch.LEGISLATIVE, "representative": Branch.LEGISLATIVE,
    "council": Branch.LEGISLATIVE, "alderman": Branch.LEGISLATIVE,
    "alderperson": Branch.LEGISLATIVE, "delegate": Branch.LEGISLATIVE,
    "assembly": Branch.LEGISLATIVE, "commissioner": Branch.LEGISLATIVE,
}


def _infer_branch(title: str) -> Branch:
    lower = title.lower()
    for keyword, branch in BRANCH_KEYWORDS.items():
        if keyword in lower:
            return branch
    return Branch.EXECUTIVE


class GoogleCivicIngestor(BaseIngestor):
    key = "google_civic"
    name = "Google Civic Information API"
    description = (
        "Address-keyed cross-reference. Useful for filling OCD division IDs and "
        "validating contact info on already-ingested officials."
    )
    coverage_levels = [
        GovernmentLevel.FEDERAL.value,
        GovernmentLevel.STATE.value,
        GovernmentLevel.COUNTY.value,
        GovernmentLevel.CITY.value,
    ]
    coverage_states = ["ALL"]

    def __init__(self, **params: Any) -> None:
        super().__init__(**params)
        self.api_key = params.get("api_key") or os.environ.get("GOOGLE_CIVIC_API_KEY")
        if not self.api_key:
            raise RuntimeError("Google Civic ingestion requires GOOGLE_CIVIC_API_KEY.")
        self.addresses: list[str] = params.get("addresses") or []
        self.timeout = params.get("timeout", 30.0)

    def fetch(self) -> Iterable[IngestedRecord]:
        if not self.addresses:
            log.warning("google_civic: no addresses configured, nothing to ingest")
            return
        with httpx.Client(base_url=CIVIC_BASE, timeout=self.timeout) as client:
            for address in self.addresses:
                yield from self._fetch_address(client, address)

    def _fetch_address(self, client: httpx.Client, address: str) -> Iterator[IngestedRecord]:
        resp = client.get(
            "/representatives",
            params={"key": self.api_key, "address": address},
        )
        if resp.status_code != 200:
            log.warning("google_civic: %s -> %s", address, resp.status_code)
            return
        payload = resp.json()
        offices = payload.get("offices", [])
        officials = payload.get("officials", [])
        divisions = payload.get("divisions", {})
        for office in offices:
            level = self._office_level(office)
            ocd_id = office.get("divisionId")
            division = divisions.get(ocd_id, {})
            for index in office.get("officialIndices", []):
                if index >= len(officials):
                    continue
                yield self._to_record(
                    officials[index], office, level, ocd_id, division
                )

    def _office_level(self, office: dict) -> GovernmentLevel:
        for level in office.get("levels", []):
            if level in LEVEL_MAP:
                return LEVEL_MAP[level]
        return GovernmentLevel.LOCAL

    def _to_record(
        self,
        official: dict,
        office: dict,
        level: GovernmentLevel,
        ocd_id: Optional[str],
        division: dict,
    ) -> IngestedRecord:
        addresses = (official.get("address") or [{}])[0]
        channels = {c.get("type"): c.get("id") for c in official.get("channels", [])}
        title = office.get("name", "")
        party_label = official.get("party")
        party = PARTY_MAP.get(party_label, Party.OTHER if party_label else None)
        return IngestedRecord(
            full_name=official.get("name", ""),
            photo_url=official.get("photoUrl"),
            google_civic_id=ocd_id,
            jurisdiction_name=division.get("name") or office.get("name", ""),
            jurisdiction_level=level,
            jurisdiction_ocd_id=ocd_id,
            office_title=title,
            branch=_infer_branch(title),
            is_elected=True,
            party=party,
            party_label=party_label,
            contact_phone=(official.get("phones") or [None])[0],
            contact_email=(official.get("emails") or [None])[0],
            office_address=", ".join(
                v
                for v in (
                    addresses.get("line1"),
                    addresses.get("line2"),
                    addresses.get("city"),
                    addresses.get("state"),
                    addresses.get("zip"),
                )
                if v
            )
            or None,
            office_city=addresses.get("city"),
            office_state=addresses.get("state"),
            office_zip=addresses.get("zip"),
            official_website=(official.get("urls") or [None])[0],
            twitter_handle=channels.get("Twitter"),
            facebook_url=(
                f"https://www.facebook.com/{channels['Facebook']}" if channels.get("Facebook") else None
            ),
            youtube_url=(
                f"https://www.youtube.com/{channels['YouTube']}" if channels.get("YouTube") else None
            ),
        )
