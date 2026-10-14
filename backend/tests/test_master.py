"""Master export: referential closure + natural-key stability."""
import csv
import os
import tempfile
import textwrap
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.db import models  # noqa: F401
from backend.db.session import Base
from backend.ingestion.agencies import AgencyRecord, run_agency_pipeline
from backend.ingestion.master import HEADERS, OFFICES, export_master
from backend.ingestion.sources.census_counties import CensusCountiesIngestor
from backend.ingestion.sources.congress_legislators import CongressLegislatorsIngestor
from backend.ingestion.sources.federal_executive import FederalExecutiveIngestor
from backend.ingestion.sources.state_executives import StateExecutivesIngestor
from backend.ingestion.upsert import upsert_term

CONGRESS = textwrap.dedent("""
- id: {bioguide: S000001, govtrack: 1}
  name: {first: Sue, last: Senator, official_full: Sue Senator}
  bio: {gender: F, birthday: '1970-01-01'}
  terms: [{type: sen, start: '2025-01-03', end: '2031-01-03', state: WY, class: 1, party: Republican, phone: 202-555-0100}]
- id: {bioguide: H000001, govtrack: 2}
  name: {first: Hal, last: House, official_full: Hal House}
  bio: {gender: M, birthday: '1970-01-02'}
  terms: [{type: rep, start: '2025-01-03', end: '2027-01-03', state: WY, district: 0, party: Republican}]
- id: {bioguide: H000002, govtrack: 3}
  name: {first: Ann, last: Rep, official_full: Ann Rep}
  bio: {gender: F, birthday: '1970-01-03'}
  terms: [{type: rep, start: '2025-01-03', end: '2027-01-03', state: IL, district: 7, party: Democrat}]
""").strip()


@pytest.fixture
def exported(tmp_path):
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    s = sessionmaker(bind=engine, future=True)()
    d = tmp_path / "src"
    d.mkdir()
    (d / "legislators-current.yaml").write_text(CONGRESS)
    (d / "legislators-social-media.yaml").write_text("[]")
    census = d / "c.txt"
    census.write_text("IL,17,031,Cook County,H1\nWY,56,001,Albany County,H1\n")
    for ing in (CongressLegislatorsIngestor(local_dir=str(d)), FederalExecutiveIngestor(),
                StateExecutivesIngestor(), CensusCountiesIngestor(csv_path=str(census))):
        for rec in ing.fetch():
            upsert_term(s, rec)
    s.commit()
    run_agency_pipeline(session=s, source="t", records=[
        AgencyRecord("t", "1", "Dept A", slug="a"),
        AgencyRecord("t", "2", "Bureau B", parent_source_id="1"),
    ])
    out = tmp_path / "master"
    counts = export_master(s, out)
    rd = lambda n: list(csv.DictReader(open(out / f"{n}.csv", encoding="utf-8")))
    return counts, rd


def test_headers_and_closure(exported):
    counts, rd = exported
    for name, header in HEADERS.items():
        assert list(rd(name)[0].keys()) == header if rd(name) else True
    sources = {r["source_id"] for r in rd("sources")}
    offices = {r["office_id"] for r in rd("offices")}
    districts = {r["district_id"] for r in rd("districts")}
    for o in rd("officials"):
        assert o["office_id"] in offices
        assert o["source_id"] in sources
        assert not o["district_id"] or o["district_id"] in districts, o["district_id"]
    for d in rd("districts"):
        assert d["source_id"] in sources
    assert offices >= set(OFFICES) - {"x"}


def test_keys_match_seed_conventions_and_president_not_exported(exported):
    _, rd = exported
    keys = {r["source_key"] for r in rd("officials")}
    assert {"bioguide:S000001", "bioguide:H000001", "bioguide:H000002"} <= keys
    assert "state-exec:TX:governor" in keys and "state-exec:TX:attorney-general" in keys
    assert not any(r["office_id"] in ("us-president", "us-vp") for r in rd("officials"))
    assert len(keys) == len(rd("officials"))  # no duplicate natural keys
    ds = {r["district_id"] for r in rd("districts")}
    assert {"us-senate-wy", "us-house-wy-al", "us-house-il-07", "us-state-tx", "us-county-17031"} <= ds
