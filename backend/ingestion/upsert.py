"""Identity resolution and upsert logic for ingested records.

This is the single chokepoint where every record from every source lands.
Resolution order matters: we trust strong external IDs (bioguide, openstates,
govtrack) before falling back to (name, jurisdiction) heuristics. When a
heuristic match would be required, we err toward creating a new Person rather
than collapsing two distinct humans into one row.
"""

from __future__ import annotations

import logging
from typing import Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db.models import (
    District,
    IngestionRun,
    Jurisdiction,
    Office,
    OfficialTerm,
    Person,
)
from backend.ingestion.base import IngestedRecord
from backend.models.official import GovernmentLevel

log = logging.getLogger(__name__)

UpsertResult = Tuple[Optional[OfficialTerm], str]  # (term|None, "inserted" | "updated")


def _get_or_create_jurisdiction(
    session: Session, record: IngestedRecord
) -> Tuple[Jurisdiction, bool]:
    if record.jurisdiction_ocd_id:
        existing = session.scalar(
            select(Jurisdiction).where(Jurisdiction.ocd_id == record.jurisdiction_ocd_id)
        )
        if existing:
            return existing, False

    existing = session.scalar(
        select(Jurisdiction).where(
            Jurisdiction.name == record.jurisdiction_name,
            Jurisdiction.level == record.jurisdiction_level,
            Jurisdiction.state_code == record.jurisdiction_state_code,
        )
    )
    if existing:
        return existing, False

    parent = None
    if record.jurisdiction_parent_ocd_id:
        parent = session.scalar(
            select(Jurisdiction).where(Jurisdiction.ocd_id == record.jurisdiction_parent_ocd_id)
        )

    jurisdiction = Jurisdiction(
        ocd_id=record.jurisdiction_ocd_id,
        name=record.jurisdiction_name,
        level=record.jurisdiction_level,
        state_code=record.jurisdiction_state_code,
        parent_id=parent.id if parent else None,
        website=record.jurisdiction_website,
        extra_data=record.jurisdiction_extra_data or None,
    )
    session.add(jurisdiction)
    session.flush()
    return jurisdiction, True


def _get_or_create_district(
    session: Session, jurisdiction: Jurisdiction, record: IngestedRecord
) -> Optional[District]:
    if not record.district_type and not record.district_identifier and not record.district_ocd_id:
        return None

    if record.district_ocd_id:
        existing = session.scalar(
            select(District).where(District.ocd_id == record.district_ocd_id)
        )
        if existing:
            return existing
        # The OCD ID is authoritative -- don't fall through to the loose
        # (type, identifier) lookup, which collides across states for federal
        # district numbers (e.g. AL-1 vs CA-1 both have identifier "1").
    elif record.district_type and record.district_identifier:
        existing = session.scalar(
            select(District).where(
                District.jurisdiction_id == jurisdiction.id,
                District.district_type == record.district_type,
                District.identifier == record.district_identifier,
            )
        )
        if existing:
            return existing

    district = District(
        jurisdiction_id=jurisdiction.id,
        ocd_id=record.district_ocd_id,
        name=record.district_name or f"{record.district_type} {record.district_identifier}".strip(),
        district_type=record.district_type or "unspecified",
        identifier=record.district_identifier,
        population=record.district_population,
    )
    session.add(district)
    session.flush()
    return district


def _get_or_create_office(
    session: Session,
    jurisdiction: Jurisdiction,
    district: Optional[District],
    record: IngestedRecord,
) -> Office:
    existing = session.scalar(
        select(Office).where(
            Office.jurisdiction_id == jurisdiction.id,
            Office.title == record.office_title,
            Office.district_id == (district.id if district else None),
            Office.seat == record.seat,
        )
    )
    if existing:
        return existing

    office = Office(
        jurisdiction_id=jurisdiction.id,
        district_id=district.id if district else None,
        title=record.office_title,
        branch=record.branch,
        chamber=record.chamber,
        seat=record.seat,
        is_elected=record.is_elected,
        term_length_years=record.term_length_years,
    )
    session.add(office)
    session.flush()
    return office


def _find_person(
    session: Session, record: IngestedRecord, office: Optional[Office] = None
) -> Optional[Person]:
    """ID-first resolution.

    Order:
      1. Strong external IDs (bioguide, openstates, govtrack, votesmart, icpsr)
      2. (full_name + birth_date) when both are present
      3. (office, is_current, full_name) -- catches seed sources that lack IDs
         but consistently identify someone as the current officeholder.
    """
    id_filters = []
    if record.bioguide_id:
        id_filters.append(Person.bioguide_id == record.bioguide_id)
    if record.openstates_id:
        id_filters.append(Person.openstates_id == record.openstates_id)
    if record.govtrack_id:
        id_filters.append(Person.govtrack_id == record.govtrack_id)
    if record.votesmart_id:
        id_filters.append(Person.votesmart_id == record.votesmart_id)
    if record.icpsr_id:
        id_filters.append(Person.icpsr_id == record.icpsr_id)
    if record.fjc_id:
        id_filters.append(Person.fjc_id == record.fjc_id)

    for filt in id_filters:
        existing = session.scalar(select(Person).where(filt))
        if existing:
            return existing

    if record.full_name and record.birth_date:
        match = session.scalar(
            select(Person).where(
                Person.full_name == record.full_name,
                Person.birth_date == record.birth_date,
            )
        )
        if match:
            return match

    if office is not None and record.full_name:
        # Judiciary and other multi-seat benches have several concurrent terms
        # at a single office row -- scan them all for a name match rather than
        # picking the most recent one.
        existing_terms = session.scalars(
            select(OfficialTerm).where(
                OfficialTerm.office_id == office.id,
                OfficialTerm.is_current.is_(True),
            )
        ).all()
        for term in existing_terms:
            if term.person.full_name == record.full_name:
                return term.person

    return None


def _upsert_person(
    session: Session, record: IngestedRecord, office: Optional[Office] = None
) -> Person:
    person = _find_person(session, record, office=office)
    if person is None:
        person = Person(full_name=record.full_name)
        session.add(person)

    for attr in (
        "full_name",
        "first_name",
        "middle_name",
        "last_name",
        "suffix",
        "nickname",
        "gender",
        "birth_date",
        "photo_url",
        "biography",
        "bioguide_id",
        "openstates_id",
        "govtrack_id",
        "fec_id",
        "votesmart_id",
        "icpsr_id",
        "fjc_id",
        "google_civic_id",
    ):
        value = getattr(record, attr)
        if value is not None:
            setattr(person, attr, value)

    if record.extra_ids:
        merged = dict(person.extra_ids or {})
        merged.update(record.extra_ids)
        person.extra_ids = merged

    session.flush()
    return person


def upsert_term(
    session: Session, record: IngestedRecord, run: Optional[IngestionRun] = None
) -> UpsertResult:
    """Upsert a full (jurisdiction, district, office, person, term) chain.

    Records with no `office_title` are treated as jurisdiction-only seeds
    (used by e.g. the county-jurisdiction seeder). They short-circuit after
    resolving the jurisdiction and district and return (None, action)."""
    jurisdiction, juris_created = _get_or_create_jurisdiction(session, record)
    district = _get_or_create_district(session, jurisdiction, record)
    if not record.office_title:
        return None, "inserted" if juris_created else "updated"
    office = _get_or_create_office(session, jurisdiction, district, record)
    person = _upsert_person(session, record, office=office)

    term = session.scalar(
        select(OfficialTerm).where(
            OfficialTerm.person_id == person.id,
            OfficialTerm.office_id == office.id,
            OfficialTerm.start_date == record.start_date,
        )
    )

    action = "updated" if term else "inserted"
    if term is None:
        term = OfficialTerm(person_id=person.id, office_id=office.id, start_date=record.start_date)
        session.add(term)

    for attr in (
        "party",
        "party_label",
        "end_date",
        "is_current",
        "contact_email",
        "contact_phone",
        "office_address",
        "office_city",
        "office_state",
        "office_zip",
        "official_website",
        "twitter_handle",
        "facebook_url",
        "instagram_handle",
        "linkedin_url",
        "youtube_url",
        "last_election_date",
        "last_election_vote_pct",
        "next_election_date",
        "committees",
    ):
        value = getattr(record, attr)
        if value is not None:
            setattr(term, attr, value)

    if record.extra_data:
        merged = dict(term.extra_data or {})
        merged.update(record.extra_data)
        term.extra_data = merged

    if run is not None:
        term.last_ingestion_run_id = run.id

    session.flush()
    return term, action


def deactivate_stale_terms(
    session: Session, source_key: str, run: IngestionRun, level: GovernmentLevel
) -> int:
    """Mark `is_current=False` on rows for the given level that the latest run
    didn't touch. Used when a source provides a complete current-officeholder list."""
    stmt = (
        select(OfficialTerm)
        .join(OfficialTerm.office)
        .join(Office.jurisdiction)
        .where(
            OfficialTerm.is_current.is_(True),
            Jurisdiction.level == level,
            (OfficialTerm.last_ingestion_run_id != run.id)
            | (OfficialTerm.last_ingestion_run_id.is_(None)),
        )
    )
    stale = session.scalars(stmt).all()
    for term in stale:
        term.is_current = False
    if stale:
        log.info("Deactivated %d stale terms for %s", len(stale), source_key)
    session.flush()
    return len(stale)
