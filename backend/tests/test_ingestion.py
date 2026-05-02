"""Tests for the elected-officials ingestion pipeline.

These tests use an in-memory SQLite database with the full schema applied via
Base.metadata.create_all (no Alembic), and feed synthetic YAML through the
real congress_legislators ingestor and upsert path so the entire graph
(jurisdiction -> district -> office -> person -> term) is exercised.
"""

from __future__ import annotations

import os
import tempfile
import textwrap

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.db import models  # noqa: F401  -- registers tables on Base.metadata
from backend.db.session import Base
from backend.db.models import (
    District,
    IngestionRun,
    Jurisdiction,
    Office,
    OfficialTerm,
    Person,
)
from backend.ingestion.base import IngestedRecord
from backend.ingestion.sources.congress_legislators import CongressLegislatorsIngestor
from backend.ingestion.sources.federal_executive import FederalExecutiveIngestor
from backend.ingestion.sources.state_executives import StateExecutivesIngestor
from backend.ingestion.upsert import upsert_term
from backend.models.official import Branch, GovernmentLevel, Party


@pytest.fixture
def session():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, future=True)
    sess = Session()
    yield sess
    sess.close()


@pytest.fixture
def run(session):
    run = IngestionRun(source_key="test", status="running")
    session.add(run)
    session.flush()
    return run


def _ingest_all(session, run, ingestor):
    inserted = updated = 0
    for record in ingestor.fetch():
        _term, action = upsert_term(session, record, run=run)
        if action == "inserted":
            inserted += 1
        else:
            updated += 1
    session.commit()
    return inserted, updated


# ---------------------------------------------------------------------------
# Federal executive seed
# ---------------------------------------------------------------------------

def test_federal_executive_seed_inserts(session, run):
    inserted, updated = _ingest_all(session, run, FederalExecutiveIngestor())
    assert inserted == 2
    assert updated == 0
    president = session.query(Person).filter_by(full_name="Donald J. Trump").one()
    term = session.query(OfficialTerm).filter_by(person_id=president.id).one()
    office = session.get(Office, term.office_id)
    assert office.title == "President of the United States"
    assert office.branch == Branch.EXECUTIVE
    juris = session.get(Jurisdiction, office.jurisdiction_id)
    assert juris.level == GovernmentLevel.FEDERAL
    assert juris.ocd_id == "ocd-division/country:us"


def test_federal_executive_seed_is_idempotent(session, run):
    _ingest_all(session, run, FederalExecutiveIngestor())
    inserted, updated = _ingest_all(session, run, FederalExecutiveIngestor())
    assert inserted == 0
    assert updated == 2
    assert session.query(Person).count() == 2
    assert session.query(OfficialTerm).count() == 2


# ---------------------------------------------------------------------------
# State governors seed
# ---------------------------------------------------------------------------

def test_state_governors_seed_covers_50_states(session, run):
    inserted, _ = _ingest_all(session, run, StateExecutivesIngestor())
    assert inserted == 50
    state_jurisdictions = (
        session.query(Jurisdiction)
        .filter_by(level=GovernmentLevel.STATE)
        .all()
    )
    assert len(state_jurisdictions) == 50
    governors = (
        session.query(OfficialTerm)
        .join(OfficialTerm.office)
        .filter(Office.title == "Governor")
        .all()
    )
    assert len(governors) == 50


def test_state_governors_seed_is_idempotent(session, run):
    _ingest_all(session, run, StateExecutivesIngestor())
    inserted, updated = _ingest_all(session, run, StateExecutivesIngestor())
    assert inserted == 0
    assert updated == 50
    assert session.query(Person).count() == 50


# ---------------------------------------------------------------------------
# Congress YAML parser + upsert
# ---------------------------------------------------------------------------

CURRENT_YAML = textwrap.dedent(
    """
    - id:
        bioguide: T000001
        govtrack: 11111
        fec: [S0WY00001]
      name:
        first: Test
        last: Senator
        official_full: Test A. Senator
      bio:
        gender: F
        birthday: '1980-01-01'
      terms:
        - type: sen
          start: '2025-01-03'
          end: '2031-01-03'
          state: WY
          class: 1
          party: Republican
          url: https://example.senate.gov
          phone: 202-555-0100
    - id:
        bioguide: T000002
        govtrack: 22222
      name:
        first: Test
        last: House
        official_full: Test B. House
      bio:
        gender: M
        birthday: '1975-06-15'
      terms:
        - type: rep
          start: '2025-01-03'
          end: '2027-01-03'
          state: WY
          district: 0
          party: Republican
    """
).strip()

SOCIAL_YAML = textwrap.dedent(
    """
    - id:
        bioguide: T000001
      social:
        twitter: testsenator
        facebook: TestSenator
    """
).strip()


def test_congress_legislators_parses_and_upserts(session, run):
    with tempfile.TemporaryDirectory() as d:
        with open(os.path.join(d, "legislators-current.yaml"), "w") as f:
            f.write(CURRENT_YAML)
        with open(os.path.join(d, "legislators-social-media.yaml"), "w") as f:
            f.write(SOCIAL_YAML)
        ingestor = CongressLegislatorsIngestor(local_dir=d)
        inserted, updated = _ingest_all(session, run, ingestor)

    assert inserted == 2
    assert updated == 0

    sen = session.query(Person).filter_by(bioguide_id="T000001").one()
    assert sen.govtrack_id == 11111
    assert sen.fec_id == "S0WY00001"

    sen_term = session.query(OfficialTerm).filter_by(person_id=sen.id).one()
    assert sen_term.party == Party.REPUBLICAN
    assert sen_term.party_label == "Republican"
    assert sen_term.twitter_handle == "testsenator"
    assert sen_term.facebook_url == "https://www.facebook.com/TestSenator"
    assert sen_term.contact_phone == "202-555-0100"

    sen_office = session.get(Office, sen_term.office_id)
    assert sen_office.title == "U.S. Senator"
    assert sen_office.seat == "WY Class 1"
    assert sen_office.term_length_years == 6
    assert sen_office.district_id is not None
    sen_district = session.get(District, sen_office.district_id)
    assert sen_district.district_type == "us_senate"
    assert sen_district.identifier == "WY"
    assert sen_district.ocd_id == "ocd-division/country:us/state:wy"

    rep_term = (
        session.query(OfficialTerm)
        .join(OfficialTerm.person)
        .filter(Person.bioguide_id == "T000002")
        .one()
    )
    rep_office = session.get(Office, rep_term.office_id)
    assert rep_office.title == "U.S. Representative"
    assert rep_office.term_length_years == 2
    rep_district = session.get(District, rep_office.district_id)
    assert rep_district.identifier == "0"
    assert rep_district.district_type == "us_congressional"
    assert rep_district.ocd_id == "ocd-division/country:us/state:wy/cd:0"


def test_congress_legislators_is_idempotent(session, run):
    with tempfile.TemporaryDirectory() as d:
        with open(os.path.join(d, "legislators-current.yaml"), "w") as f:
            f.write(CURRENT_YAML)
        with open(os.path.join(d, "legislators-social-media.yaml"), "w") as f:
            f.write(SOCIAL_YAML)
        ingestor = CongressLegislatorsIngestor(local_dir=d)
        _ingest_all(session, run, ingestor)
        # Second pass: same data, should match by bioguide_id
        inserted2, updated2 = _ingest_all(session, run, ingestor)

    assert inserted2 == 0
    assert updated2 == 2
    assert session.query(Person).count() == 2
    assert session.query(OfficialTerm).count() == 2


# ---------------------------------------------------------------------------
# Identity resolution edge cases
# ---------------------------------------------------------------------------

def test_seed_record_without_ids_resolves_via_office_currency(session, run):
    """If a seed source provides no external IDs but consistently puts the same
    person in the same office, the upsert path must reuse the existing Person
    rather than creating duplicates."""
    record = IngestedRecord(
        full_name="Jane Doe",
        jurisdiction_name="Oregon",
        jurisdiction_level=GovernmentLevel.STATE,
        jurisdiction_ocd_id="ocd-division/country:us/state:or",
        jurisdiction_state_code="OR",
        office_title="Governor",
        branch=Branch.EXECUTIVE,
        is_elected=True,
    )
    upsert_term(session, record, run=run)
    session.commit()
    upsert_term(session, record, run=run)
    session.commit()
    assert session.query(Person).count() == 1
    assert session.query(OfficialTerm).count() == 1


def test_different_people_in_same_office_create_separate_persons(session, run):
    """Successive officeholders should not collapse into one Person."""
    base = dict(
        jurisdiction_name="Texas",
        jurisdiction_level=GovernmentLevel.STATE,
        jurisdiction_ocd_id="ocd-division/country:us/state:tx",
        jurisdiction_state_code="TX",
        office_title="Governor",
        branch=Branch.EXECUTIVE,
    )
    from datetime import date
    upsert_term(
        session,
        IngestedRecord(full_name="Alpha One", start_date=date(2019, 1, 15), is_current=False, **base),
        run=run,
    )
    upsert_term(
        session,
        IngestedRecord(full_name="Beta Two", start_date=date(2023, 1, 17), is_current=True, **base),
        run=run,
    )
    session.commit()
    assert session.query(Person).count() == 2
    assert session.query(OfficialTerm).count() == 2
