"""Base classes shared by every ingestion source.

`IngestedRecord` is the wire format every source must yield. The pipeline then
hands each record to `upsert.upsert_term`, which is the single place that
decides "is this a new person or an existing one?", "is this a new office or
an existing one?", and "is this an extension of an existing term or a fresh
one?". Sources never touch the ORM directly.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Iterable, Optional

from backend.models.official import Branch, GovernmentLevel, Party


@dataclass
class IngestedRecord:
    """Normalised payload representing one (Person, Office, Term) triple."""

    # Person identity
    full_name: str
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    suffix: Optional[str] = None
    nickname: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[date] = None
    photo_url: Optional[str] = None
    biography: Optional[str] = None

    # External IDs -- the upsert uses these in priority order to find an existing person.
    bioguide_id: Optional[str] = None
    openstates_id: Optional[str] = None
    govtrack_id: Optional[int] = None
    fec_id: Optional[str] = None
    votesmart_id: Optional[int] = None
    icpsr_id: Optional[int] = None
    google_civic_id: Optional[str] = None
    extra_ids: dict = field(default_factory=dict)

    # Jurisdiction (created if missing)
    jurisdiction_name: str = ""
    jurisdiction_level: GovernmentLevel = GovernmentLevel.FEDERAL
    jurisdiction_ocd_id: Optional[str] = None
    jurisdiction_state_code: Optional[str] = None
    jurisdiction_parent_ocd_id: Optional[str] = None

    # District (optional, created if missing)
    district_name: Optional[str] = None
    district_type: Optional[str] = None
    district_identifier: Optional[str] = None
    district_ocd_id: Optional[str] = None
    district_population: Optional[int] = None

    # Office
    office_title: str = ""
    branch: Branch = Branch.LEGISLATIVE
    chamber: Optional[str] = None
    seat: Optional[str] = None
    is_elected: bool = True
    term_length_years: Optional[int] = None

    # Term
    party: Optional[Party] = None
    party_label: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: bool = True

    # Term-scoped contact
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    office_address: Optional[str] = None
    office_city: Optional[str] = None
    office_state: Optional[str] = None
    office_zip: Optional[str] = None
    official_website: Optional[str] = None

    twitter_handle: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    youtube_url: Optional[str] = None

    last_election_date: Optional[date] = None
    last_election_vote_pct: Optional[float] = None
    next_election_date: Optional[date] = None

    committees: Optional[list] = None
    extra_data: dict = field(default_factory=dict)


class BaseIngestor:
    """Subclasses implement `fetch()` to yield IngestedRecord objects."""

    key: str = ""
    name: str = ""
    description: str = ""
    coverage_levels: list[str] = []
    coverage_states: list[str] = []

    def __init__(self, **params: Any) -> None:
        self.params = params

    def fetch(self) -> Iterable[IngestedRecord]:
        raise NotImplementedError

    def __repr__(self) -> str:  # pragma: no cover - debug only
        return f"<{self.__class__.__name__} key={self.key!r}>"
