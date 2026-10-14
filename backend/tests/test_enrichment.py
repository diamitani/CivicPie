import httpx
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.db import models  # noqa: F401
from backend.db.models import Jurisdiction, Person
from backend.db.session import Base
from backend.ingestion.enrich_wikipedia import run_wikipedia_enrichment
from backend.models.official import GovernmentLevel


def _session():
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, future=True)()


def test_enrichment_only_uses_exact_titles_and_handles_429_404_disambiguation():
    s = _session()
    s.add(Jurisdiction(name="Ohio", level=GovernmentLevel.STATE, state_code="OH"))
    s.add(Person(full_name="Jane Exact", extra_ids={"wikipedia": "Jane Exact"}))
    s.add(Person(full_name="Mike Disambig", extra_ids={"wikipedia": "Mike (name)"}))
    s.add(Person(full_name="Gone Person", extra_ids={"wikipedia": "Gone"}))
    s.add(Person(full_name="No Id Person"))  # must never be looked up
    s.commit()
    calls, seen429 = [], []

    def handler(req: httpx.Request) -> httpx.Response:
        title = req.url.path.rsplit("/", 1)[-1]
        calls.append(title)
        if title == "Jane_Exact" and not seen429:
            seen429.append(1)
            return httpx.Response(429, headers={"retry-after": "0"})
        if title == "Gone":
            return httpx.Response(404)
        if title.startswith("Mike"):
            return httpx.Response(200, json={"type": "disambiguation"})
        return httpx.Response(200, json={
            "type": "standard", "title": title, "extract": f"About {title}.",
            "thumbnail": {"source": f"https://upload.wikimedia.org/{title}.jpg"},
            "content_urls": {"desktop": {"page": f"https://en.wikipedia.org/wiki/{title}"}},
        })

    stats = run_wikipedia_enrichment(session=s, delay=0, transport=httpx.MockTransport(handler))
    assert stats["states_enriched"] == 1 and stats["people_enriched"] == 1 and stats["not_found"] == 2
    jane = s.query(Person).filter_by(full_name="Jane Exact").one()
    assert jane.biography == "About Jane_Exact." and jane.photo_url.endswith("Jane_Exact.jpg")
    assert s.query(Person).filter_by(full_name="Mike Disambig").one().biography is None
    assert not any("No_Id" in c for c in calls)
    # idempotent: second run does no new work for already-enriched rows
    n = len(calls)
    run_wikipedia_enrichment(session=s, delay=0, transport=httpx.MockTransport(handler))
    assert [c for c in calls[n:] if c in ("Ohio", "Jane_Exact")] == []


def test_places_enrichment_requires_key_checks_state_and_skips_done(monkeypatch):
    import json
    import pytest
    from backend.ingestion.enrich_places import run_places_enrichment

    monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)
    with pytest.raises(RuntimeError):
        run_places_enrichment()

    s = _session()
    for name, st in (("Cook County", "IL"), ("Wrong County", "TX"), ("Done County", "IL")):
        s.add(Jurisdiction(name=name, level=GovernmentLevel.COUNTY, state_code=st,
                           extra_data={"places": {"matched": True}} if name == "Done County" else None))
    s.commit()
    queries = []

    def handler(req: httpx.Request) -> httpx.Response:
        q = json.loads(req.content)["textQuery"]
        queries.append(q)
        assert req.headers["x-goog-fieldmask"] and req.headers["x-goog-api-key"] == "k"
        addr = "118 N Clark St, Chicago, IL 60602, USA" if "Cook" in q else "1 Main St, Austin, OK 73301, USA"
        return httpx.Response(200, json={"places": [{
            "id": "p1", "displayName": {"text": q}, "formattedAddress": addr,
            "location": {"latitude": 41.88, "longitude": -87.63},
            "websiteUri": "https://example.gov", "nationalPhoneNumber": "(312) 555-0100"}]})

    stats = run_places_enrichment(session=s, api_key="k", delay=0, transport=httpx.MockTransport(handler))
    assert stats == {"enriched": 1, "no_match": 1, "requests": 2}
    assert len(queries) == 2  # Done County skipped -> no billed request
    cook = s.query(Jurisdiction).filter_by(name="Cook County").one()
    assert cook.extra_data["places"]["lat"] == 41.88 and cook.website == "https://example.gov"
    wrong = s.query(Jurisdiction).filter_by(name="Wrong County").one()
    assert wrong.extra_data["places"] == {"matched": False} and wrong.website is None


def test_state_titles_avoid_disambiguation_pages():
    from backend.ingestion.enrich_wikipedia import STATE_TITLES
    assert STATE_TITLES["New York"] == "New York (state)"
    assert set(STATE_TITLES) == {"New York", "Washington", "Georgia"}
