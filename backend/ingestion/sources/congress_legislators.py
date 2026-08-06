"""Federal Congress ingestion via the `unitedstates/congress-legislators` dataset.

Why this source: it's the canonical open dataset for U.S. Senators and
Representatives, maintained by GovTrack/ProPublica/Sunlight alums under
public domain (CC0). No API key, refreshed continuously. Each legislator has
bioguide/govtrack/icpsr/votesmart/fec IDs in the same record, which gives us
clean cross-source identity resolution from day one.

Files consumed:
    legislators-current.yaml  -- everyone serving today
    legislators-social.yaml   -- twitter/facebook/instagram/youtube (joined by bioguide)

To run offline (CI / dev), set CONGRESS_LEGISLATORS_DIR to a path with the
YAML files already downloaded.
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime
from typing import Any, Iterable, Iterator, Optional

import httpx
import yaml

from backend.ingestion.base import BaseIngestor, IngestedRecord
from backend.models.official import Branch, GovernmentLevel, Party

log = logging.getLogger(__name__)

GITHUB_RAW = "https://raw.githubusercontent.com/unitedstates/congress-legislators/main"
CURRENT_URL = f"{GITHUB_RAW}/legislators-current.yaml"
SOCIAL_URL = f"{GITHUB_RAW}/legislators-social-media.yaml"

PARTY_MAP = {
    "Democrat": Party.DEMOCRAT,
    "Republican": Party.REPUBLICAN,
    "Independent": Party.INDEPENDENT,
    "Libertarian": Party.LIBERTARIAN,
    "Green": Party.GREEN,
}


def _parse_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


class CongressLegislatorsIngestor(BaseIngestor):
    key = "congress_legislators"
    name = "United States Congress Legislators"
    description = (
        "Authoritative roster of current U.S. Senators and Representatives, "
        "merged with social-media handles. CC0, maintained by the @unitedstates project."
    )
    coverage_levels = [GovernmentLevel.FEDERAL.value]
    coverage_states = ["ALL"]

    def __init__(self, **params: Any) -> None:
        super().__init__(**params)
        self.local_dir = params.get("local_dir") or os.environ.get("CONGRESS_LEGISLATORS_DIR")
        self.timeout = params.get("timeout", 30.0)

    def _load_yaml(self, filename: str, url: str) -> list:
        if self.local_dir:
            path = os.path.join(self.local_dir, filename)
            with open(path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or []
        with httpx.Client(timeout=self.timeout) as client:
            log.info("Fetching %s", url)
            resp = client.get(url)
            resp.raise_for_status()
            return yaml.safe_load(resp.text) or []

    def fetch(self) -> Iterable[IngestedRecord]:
        legislators = self._load_yaml("legislators-current.yaml", CURRENT_URL)
        try:
            social_raw = self._load_yaml("legislators-social-media.yaml", SOCIAL_URL)
        except Exception as exc:  # pragma: no cover - network optional
            log.warning("social-media file unavailable, continuing without socials: %s", exc)
            social_raw = []

        social_by_bioguide = {
            entry.get("id", {}).get("bioguide"): entry.get("social", {})
            for entry in social_raw
            if entry.get("id", {}).get("bioguide")
        }

        for entry in legislators:
            yield from self._records_from_entry(entry, social_by_bioguide)

    def _records_from_entry(
        self, entry: dict, social_by_bioguide: dict
    ) -> Iterator[IngestedRecord]:
        ids = entry.get("id", {}) or {}
        bioguide = ids.get("bioguide")
        name = entry.get("name", {}) or {}
        bio = entry.get("bio", {}) or {}
        terms = entry.get("terms", []) or []
        if not terms:
            return
        current_term = terms[-1]
        socials = social_by_bioguide.get(bioguide, {}) if bioguide else {}

        chamber = current_term.get("type")  # "sen" or "rep"
        state = current_term.get("state")
        district_number = current_term.get("district")
        is_senate = chamber == "sen"
        title = "U.S. Senator" if is_senate else "U.S. Representative"
        chamber_name = "senate" if is_senate else "house"

        district_identifier = None
        district_name = None
        district_type = None
        district_ocd_id = None
        seat = None
        if is_senate:
            # The senate "district" is the state. Each state gets its own row so
            # office identity ((juris, title, district, seat)) is unique per seat.
            seat_class = current_term.get("class")
            if state:
                district_identifier = state
                district_name = f"{state} (U.S. Senate)"
                district_type = "us_senate"
                district_ocd_id = f"ocd-division/country:us/state:{state.lower()}"
            if seat_class:
                seat = f"{state} Class {seat_class}" if state else f"Class {seat_class}"
        elif district_number is not None:
            district_identifier = str(district_number)
            district_name = (
                "At-large" if district_number == 0 else f"{state}-{int(district_number):02d}"
            )
            district_type = "us_congressional"
            district_ocd_id = (
                f"ocd-division/country:us/state:{state.lower()}/cd:{district_number}"
                if state
                else None
            )

        full_name = name.get("official_full") or " ".join(
            v for v in (name.get("first"), name.get("middle"), name.get("last"), name.get("suffix")) if v
        )

        party_label = current_term.get("party")
        party = PARTY_MAP.get(party_label, Party.OTHER if party_label else None)

        record = IngestedRecord(
            full_name=full_name,
            first_name=name.get("first"),
            middle_name=name.get("middle"),
            last_name=name.get("last"),
            suffix=name.get("suffix"),
            nickname=name.get("nickname"),
            gender=bio.get("gender"),
            birth_date=_parse_date(bio.get("birthday")),
            bioguide_id=bioguide,
            govtrack_id=ids.get("govtrack"),
            fec_id=(ids.get("fec") or [None])[0] if isinstance(ids.get("fec"), list) else ids.get("fec"),
            votesmart_id=ids.get("votesmart"),
            icpsr_id=ids.get("icpsr"),
            extra_ids={k: v for k, v in ids.items() if k not in {"bioguide", "govtrack", "fec", "votesmart", "icpsr"}},
            jurisdiction_name="United States",
            jurisdiction_level=GovernmentLevel.FEDERAL,
            jurisdiction_ocd_id="ocd-division/country:us",
            jurisdiction_state_code=None,
            district_name=district_name,
            district_type=district_type,
            district_identifier=district_identifier,
            district_ocd_id=district_ocd_id,
            office_title=title,
            branch=Branch.LEGISLATIVE,
            chamber=chamber_name,
            seat=seat,
            is_elected=True,
            term_length_years=6 if is_senate else 2,
            party=party,
            party_label=party_label,
            start_date=_parse_date(current_term.get("start")),
            end_date=_parse_date(current_term.get("end")),
            is_current=True,
            contact_phone=current_term.get("phone"),
            office_address=current_term.get("address"),
            office_state=state,
            official_website=current_term.get("url"),
            twitter_handle=socials.get("twitter"),
            facebook_url=(
                f"https://www.facebook.com/{socials['facebook']}" if socials.get("facebook") else None
            ),
            instagram_handle=socials.get("instagram"),
            youtube_url=(
                f"https://www.youtube.com/{socials['youtube']}" if socials.get("youtube") else None
            ),
            extra_data={
                "office_room": current_term.get("office"),
                "rss_url": current_term.get("rss_url"),
                "contact_form": current_term.get("contact_form"),
                "state_rank": current_term.get("state_rank"),
            },
        )
        yield record
