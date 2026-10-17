"""API tests against an in-memory DB seeded through the real ingestors."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.db import get_db
from backend.db.session import Base
from backend.ingestion.agencies import AgencyRecord, run_agency_pipeline
from backend.ingestion.sources.federal_executive import FederalExecutiveIngestor
from backend.ingestion.sources.state_executives import StateExecutivesIngestor
from backend.ingestion.upsert import upsert_term
from backend.main import app


@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, future=True)
    with Session() as s:
        for ing in (FederalExecutiveIngestor(), StateExecutivesIngestor()):
            for rec in ing.fetch():
                upsert_term(s, rec)
        s.commit()
        run_agency_pipeline(session=s, records=[
            AgencyRecord("t", "1", "Department of Testing", short_name="DOT"),
            AgencyRecord("t", "2", "Bureau of Examples", parent_source_id="1"),
        ], source="t")

    def override():
        with Session() as s:
            yield s

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_stats(client):
    d = client.get("/api/stats").json()
    assert d["current_officials"] == 102
    assert d["officials_by_level"] == {"federal": 2, "state": 100}
    assert d["agencies"] == 2


def test_officials_filters_and_pagination(client):
    d = client.get("/api/officials", params={"state": "tx", "limit": 5}).json()
    assert d["total"] == 2  # governor + AG
    assert {o["title"] for o in d["results"]} == {"Governor", "Attorney General"}
    assert client.get("/api/officials", params={"q": "vance"}).json()["total"] == 1
    assert client.get("/api/officials", params={"party": "democrat", "level": "state"}).json()["total"] > 10
    assert len(client.get("/api/officials", params={"limit": 7}).json()["results"]) == 7


def test_official_detail_and_404(client):
    first = client.get("/api/officials", params={"q": "Abbott"}).json()["results"][0]
    detail = client.get(f"/api/officials/{first['id']}").json()
    assert detail["name"] == "Greg Abbott" and detail["state"] == "TX"
    assert client.get("/api/officials/999999").status_code == 404


def test_validation_and_agencies(client):
    assert client.get("/api/officials", params={"limit": 5000}).status_code == 422
    assert client.get("/api/officials", params={"state": "texas"}).status_code == 422
    a = client.get("/api/agencies", params={"top_level": True}).json()
    assert a["total"] == 1 and a["results"][0]["short_name"] == "DOT"
    child = client.get("/api/agencies", params={"q": "Bureau"}).json()["results"][0]
    assert child["parent_id"] == a["results"][0]["id"]
