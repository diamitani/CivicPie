"""Government agency ingestion (separate from the elected-officials pipeline).

Agencies are appointed bodies, so they don't flow through IngestedRecord /
upsert_term. Each source yields `AgencyRecord`s; `run_agency_pipeline` upserts
them on (source, source_id) and wires parent/child links in a second pass.

Federal source: the Federal Register agencies API
(https://www.federalregister.gov/developers/documentation/api/v1) -- public
domain, no key, ~470 agencies including parent -> sub-agency relationships.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.db.models import Agency, IngestionRun, Jurisdiction

log = logging.getLogger(__name__)

USER_AGENT = "CivicPie Bot (civic engagement platform; +https://civicpie.com)"
FEDERAL_REGISTER_URL = "https://www.federalregister.gov/api/v1/agencies.json"


@dataclass
class AgencyRecord:
    source: str
    source_id: str
    name: str
    short_name: Optional[str] = None
    slug: Optional[str] = None
    level: str = "federal"
    parent_source_id: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    extra_data: dict = field(default_factory=dict)


def _clean(text: Optional[str]) -> Optional[str]:
    if not text:
        return None
    return re.sub(r"\s+", " ", text).strip() or None


def fetch_federal_register(url: str = FEDERAL_REGISTER_URL, timeout: float = 60.0) -> Iterable[AgencyRecord]:
    with httpx.Client(timeout=timeout, headers={"User-Agent": USER_AGENT}) as client:
        resp = client.get(url)
        resp.raise_for_status()
        payload = resp.json()
    for a in payload:
        yield AgencyRecord(
            source="federal_register",
            source_id=str(a["id"]),
            name=_clean(a.get("name")) or "",
            short_name=_clean(a.get("short_name")),
            slug=a.get("slug"),
            parent_source_id=str(a["parent_id"]) if a.get("parent_id") else None,
            description=_clean(a.get("description")),
            website=_clean(a.get("agency_url")),
            extra_data={"federal_register_url": a.get("url"), "child_slugs": a.get("child_slugs") or []},
        )


def run_agency_pipeline(
    source: str = "federal_register", session: Session | None = None, records: Iterable[AgencyRecord] | None = None
) -> dict[str, Any]:
    owns = session is None
    session = session or SessionLocal()
    run = IngestionRun(source_key=f"agencies:{source}", status="running")
    session.add(run)
    session.flush()
    run_id = run.id
    seen = inserted = updated = 0
    try:
        if records is None:
            if source != "federal_register":
                raise KeyError(f"Unknown agency source {source!r}")
            records = fetch_federal_register()
        federal = session.scalar(
            select(Jurisdiction).where(Jurisdiction.ocd_id == "ocd-division/country:us")
        )
        parents: dict[str, str] = {}
        for rec in records:
            if not rec.name:
                continue
            seen += 1
            agency = session.scalar(
                select(Agency).where(Agency.source == rec.source, Agency.source_id == rec.source_id)
            )
            if agency is None:
                agency = Agency(source=rec.source, source_id=rec.source_id, name=rec.name)
                session.add(agency)
                inserted += 1
            else:
                updated += 1
            agency.name = rec.name
            agency.short_name = rec.short_name
            agency.slug = rec.slug
            agency.level = rec.level
            agency.description = rec.description
            agency.website = rec.website
            agency.extra_data = rec.extra_data or None
            if rec.level == "federal" and federal is not None:
                agency.jurisdiction_id = federal.id
            if rec.parent_source_id:
                parents[rec.source_id] = rec.parent_source_id
        session.flush()
        for child_sid, parent_sid in parents.items():
            child = session.scalar(select(Agency).where(Agency.source == source, Agency.source_id == child_sid))
            parent = session.scalar(select(Agency).where(Agency.source == source, Agency.source_id == parent_sid))
            if child and parent:
                child.parent_id = parent.id
        run.status = "succeeded"
    except Exception as exc:
        run.status = "failed"
        run.error_message = str(exc)
        raise
    finally:
        run.records_seen, run.records_inserted, run.records_updated = seen, inserted, updated
        run.finished_at = datetime.now(tz=timezone.utc)
        status = run.status
        session.commit()
        if owns:
            session.close()
    return {"source": f"agencies:{source}", "run_id": run_id, "status": status,
            "seen": seen, "inserted": inserted, "updated": updated, "failed": 0}
