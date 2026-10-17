"""Wikipedia enrichment: biography extract + photo for people, summary for states.

Only records with an *exact* Wikipedia page title are enriched -- Congress
members (`extra_ids["wikipedia"]` from congress-legislators) and states (by
name). We never guess a page from a person's name: a wrong match would attach
someone else's biography/photo to an elected official.

Wikimedia asks API clients for a descriptive User-Agent with contact info and
rate-limits aggressively, so requests are throttled and 429s honor Retry-After.
Photo URLs point at upload.wikimedia.org (hotlinked, not copied); image
licenses vary per file, so the page URL is stored for attribution.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional
from urllib.parse import quote

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.db import SessionLocal
from backend.db.models import Jurisdiction, Person
from backend.models.official import GovernmentLevel

log = logging.getLogger(__name__)

USER_AGENT = "CivicPie/1.0 (civic engagement platform; https://civicpie.com; contact via repo)"
SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"


# Bare state names that are disambiguation pages on Wikipedia.
STATE_TITLES = {
    "New York": "New York (state)",
    "Washington": "Washington (state)",
    "Georgia": "Georgia (U.S. state)",
}


def fetch_summary(client: httpx.Client, title: str, max_retries: int = 4) -> Optional[dict]:
    url = SUMMARY_URL.format(title=quote(title.replace(" ", "_"), safe="_(),.'-"))
    for attempt in range(max_retries):
        resp = client.get(url)
        if resp.status_code == 429:
            wait = min(float(resp.headers.get("retry-after", 2 ** (attempt + 1))), 60)
            log.warning("wikipedia 429 for %s, sleeping %.0fs", title, wait)
            time.sleep(wait)
            continue
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        if data.get("type") == "disambiguation":
            return None
        return data
    log.warning("wikipedia gave up on %s after %d tries", title, max_retries)
    return None


def run_wikipedia_enrichment(
    session: Optional[Session] = None,
    limit: Optional[int] = None,
    delay: float = 1.0,
    transport: Optional[httpx.BaseTransport] = None,
) -> dict[str, Any]:
    owns = session is None
    session = session or SessionLocal()
    stats = {"people_enriched": 0, "states_enriched": 0, "not_found": 0, "skipped_existing": 0}
    try:
        with httpx.Client(timeout=30, headers={"User-Agent": USER_AGENT}, transport=transport) as client:
            states = session.scalars(
                select(Jurisdiction).where(Jurisdiction.level == GovernmentLevel.STATE)
            ).all()
            for j in states:
                if (j.extra_data or {}).get("wikipedia"):
                    stats["skipped_existing"] += 1
                    continue
                data = fetch_summary(client, STATE_TITLES.get(j.name, j.name))
                time.sleep(delay)
                if not data:
                    stats["not_found"] += 1
                    continue
                j.extra_data = {**(j.extra_data or {}), "wikipedia": {
                    "title": data.get("title"), "extract": data.get("extract"),
                    "url": data.get("content_urls", {}).get("desktop", {}).get("page"),
                    "thumbnail": (data.get("thumbnail") or {}).get("source"),
                }}
                stats["states_enriched"] += 1
            session.commit()

            done = 0
            for person in session.scalars(select(Person)).all():
                title = (person.extra_ids or {}).get("wikipedia")
                if not title:
                    continue
                if person.biography and person.photo_url:
                    stats["skipped_existing"] += 1
                    continue
                if limit is not None and done >= limit:
                    break
                data = fetch_summary(client, title)
                time.sleep(delay)
                done += 1
                if not data:
                    stats["not_found"] += 1
                    continue
                person.biography = person.biography or data.get("extract")
                person.photo_url = person.photo_url or (data.get("thumbnail") or {}).get("source")
                person.extra_ids = {**person.extra_ids, "wikipedia_url":
                                    data.get("content_urls", {}).get("desktop", {}).get("page")}
                stats["people_enriched"] += 1
                if done % 10 == 0:
                    session.commit()
                    log.info("wikipedia: %d people processed (%d enriched)", done, stats["people_enriched"])
            session.commit()
    finally:
        if owns:
            session.close()
    return stats
