"""Google Places enrichment: government-office address, phone, website, lat/lng.

Uses the Places API (New) Text Search with a field mask. Requires
GOOGLE_MAPS_API_KEY with "Places API (New)" enabled. Requests are BILLED per
call, so the default `limit` is small and counties already enriched are
skipped; raise --limit deliberately (3,234 counties is a few hundred dollars
at list price -- check your quota/pricing first).

Results are stored on Jurisdiction.extra_data["places"]; the website is also
copied to Jurisdiction.website when empty. A hit is accepted only if Places
returns a result whose address contains the jurisdiction's state, to avoid
attaching a same-named county in another state.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.db.models import Jurisdiction
from backend.ingestion.enrich_wikipedia import USER_AGENT
from backend.models.official import GovernmentLevel

log = logging.getLogger(__name__)

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join(
    f"places.{f}" for f in
    ("id", "displayName", "formattedAddress", "location", "websiteUri", "nationalPhoneNumber")
)


def _query(j: Jurisdiction) -> str:
    kind = "county government offices" if j.level == GovernmentLevel.COUNTY else "city hall"
    return f"{j.name} {kind}, {j.state_code}"


def run_places_enrichment(
    level: str = "county",
    limit: int = 25,
    state: Optional[str] = None,
    session: Optional[Session] = None,
    api_key: Optional[str] = None,
    delay: float = 0.1,
    transport: Optional[httpx.BaseTransport] = None,
) -> dict[str, Any]:
    api_key = api_key or os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise RuntimeError("Places enrichment requires GOOGLE_MAPS_API_KEY.")
    owns = session is None
    session = session or SessionLocal()
    stats = {"enriched": 0, "no_match": 0, "requests": 0}
    try:
        stmt = select(Jurisdiction).where(Jurisdiction.level == GovernmentLevel(level))
        if state:
            stmt = stmt.where(Jurisdiction.state_code == state.upper())
        todo = [j for j in session.scalars(stmt.order_by(Jurisdiction.state_code, Jurisdiction.name))
                if not (j.extra_data or {}).get("places")]
        headers = {"X-Goog-Api-Key": api_key, "X-Goog-FieldMask": FIELD_MASK, "User-Agent": USER_AGENT}
        with httpx.Client(timeout=30, headers=headers, transport=transport) as client:
            for j in todo[:limit]:
                resp = client.post(PLACES_URL, json={"textQuery": _query(j), "maxResultCount": 1})
                stats["requests"] += 1
                resp.raise_for_status()
                places = resp.json().get("places") or []
                hit = places[0] if places else None
                if not hit or f", {j.state_code}" not in (hit.get("formattedAddress") or ""):
                    stats["no_match"] += 1
                    j.extra_data = {**(j.extra_data or {}), "places": {"matched": False}}
                    continue
                loc = hit.get("location") or {}
                j.extra_data = {**(j.extra_data or {}), "places": {
                    "matched": True, "place_id": hit.get("id"),
                    "name": (hit.get("displayName") or {}).get("text"),
                    "address": hit.get("formattedAddress"), "phone": hit.get("nationalPhoneNumber"),
                    "lat": loc.get("latitude"), "lng": loc.get("longitude"),
                }}
                j.website = j.website or hit.get("websiteUri")
                stats["enriched"] += 1
                time.sleep(delay)
        session.commit()
    finally:
        if owns:
            session.close()
    return stats
