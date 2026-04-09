"""
Source registry for Chicago civic data collection.

Builds a unified list of official citywide and ward-level sources so the
weekly sync job can scrape, snapshot, and reconcile them consistently.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any
import requests

WARD_OFFICES_API = "https://data.cityofchicago.org/resource/htai-wnw4.json"
USER_AGENT = "CivicPie Civic Sync Bot (public-interest civic data collection)"


@dataclass
class CivicSource:
    source_id: str
    title: str
    jurisdiction: str
    source_type: str
    url: str
    ward_number: int | None = None
    metadata: dict[str, Any] | None = None


def _ward_detail_url(ward_number: int) -> str:
    return f"https://www.chicago.gov/city/en/about/wards/{str(ward_number).zfill(2)}.html"


def _fetch_ward_offices() -> list[dict[str, Any]]:
    response = requests.get(
        WARD_OFFICES_API,
        timeout=30,
        headers={"User-Agent": USER_AGENT},
    )
    response.raise_for_status()
    return response.json()


def build_source_registry() -> list[CivicSource]:
    citywide_sources = [
        CivicSource(
            source_id="city-chicago-wards",
            title="Chicago Wards Directory",
            jurisdiction="Chicago",
            source_type="directory",
            url="https://www.chicago.gov/city/en/about/wards.html",
        ),
        CivicSource(
            source_id="city-clerk-elms",
            title="Chicago City Clerk eLMS",
            jurisdiction="Chicago",
            source_type="meetings",
            url="https://chicityclerkelms.chicago.gov/",
        ),
        CivicSource(
            source_id="city-elections",
            title="Chicago Board of Elections",
            jurisdiction="Chicago",
            source_type="elections",
            url="https://chicagoelections.gov/",
        ),
        CivicSource(
            source_id="city-311",
            title="Chicago 311",
            jurisdiction="Chicago",
            source_type="services",
            url="https://311.chicago.gov/",
        ),
        CivicSource(
            source_id="city-volunteer",
            title="Mayor's Office Volunteer Opportunities",
            jurisdiction="Chicago",
            source_type="volunteer",
            url="https://www.chicago.gov/city/en/depts/mayor/volunteer_opportunities.html",
        ),
    ]

    ward_sources: list[CivicSource] = []
    for record in _fetch_ward_offices():
        ward_number = int(record["ward"])
        alderperson = record.get("alderman", "")
        website = record.get("website", {})
        ward_site_url = website.get("url") if isinstance(website, dict) else website

        ward_sources.append(
            CivicSource(
                source_id=f"ward-{ward_number:02d}-detail",
                title=f"Ward {ward_number} Official Chicago Page",
                jurisdiction="Chicago",
                source_type="ward-detail",
                url=_ward_detail_url(ward_number),
                ward_number=ward_number,
                metadata={"alderperson": alderperson},
            )
        )

        if ward_site_url:
            ward_sources.append(
                CivicSource(
                    source_id=f"ward-{ward_number:02d}-site",
                    title=f"Ward {ward_number} Official Ward Site",
                    jurisdiction="Chicago",
                    source_type="ward-site",
                    url=ward_site_url,
                    ward_number=ward_number,
                    metadata={"alderperson": alderperson},
                )
            )

    deduped: dict[str, CivicSource] = {}
    for source in [*citywide_sources, *ward_sources]:
        deduped[source.url] = source

    return list(deduped.values())


def serialize_registry() -> list[dict[str, Any]]:
    return [asdict(source) for source in build_source_registry()]
