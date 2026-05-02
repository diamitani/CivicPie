"""State legislature ingestion via OpenStates v3.

OpenStates is the only project with consistent, cross-state coverage of all
~7,400 state legislators. Their v3 REST API exposes /people with cursor
pagination, scoped by jurisdiction OCD ID. We iterate jurisdictions one at a
time so partial failures are recoverable.

Auth: requires OPENSTATES_API_KEY (free tier covers our refresh cadence).
"""

from __future__ import annotations

import logging
import os
import time
from datetime import datetime
from typing import Any, Iterable, Optional

import httpx

from backend.ingestion.base import BaseIngestor, IngestedRecord
from backend.models.official import Branch, GovernmentLevel, Party

log = logging.getLogger(__name__)

OPENSTATES_BASE = "https://v3.openstates.org"

PARTY_MAP = {
    "Democratic": Party.DEMOCRAT,
    "Republican": Party.REPUBLICAN,
    "Independent": Party.INDEPENDENT,
    "Libertarian": Party.LIBERTARIAN,
    "Green": Party.GREEN,
}

STATES = [
    "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
    "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
    "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
    "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
    "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy",
    "dc", "pr",
]


class OpenStatesIngestor(BaseIngestor):
    key = "openstates"
    name = "OpenStates State Legislators"
    description = (
        "All current state legislators across 50 states + DC + PR via the "
        "OpenStates v3 REST API. Includes party, district, contact, committees."
    )
    coverage_levels = [GovernmentLevel.STATE.value]
    coverage_states = ["ALL"]

    def __init__(self, **params: Any) -> None:
        super().__init__(**params)
        self.api_key = params.get("api_key") or os.environ.get("OPENSTATES_API_KEY")
        if not self.api_key:
            raise RuntimeError(
                "OpenStates ingestion requires OPENSTATES_API_KEY (env or kwarg)."
            )
        self.states = params.get("states") or STATES
        self.timeout = params.get("timeout", 60.0)
        self.sleep_between_pages = params.get("sleep_between_pages", 1.1)

    def fetch(self) -> Iterable[IngestedRecord]:
        with httpx.Client(
            base_url=OPENSTATES_BASE,
            headers={"X-API-KEY": self.api_key},
            timeout=self.timeout,
        ) as client:
            for state_code in self.states:
                yield from self._fetch_state(client, state_code)

    def _fetch_state(self, client: httpx.Client, state_code: str) -> Iterable[IngestedRecord]:
        jurisdiction_ocd = f"ocd-jurisdiction/country:us/state:{state_code}/government"
        page = 1
        while True:
            log.info("openstates: fetching %s page %d", state_code, page)
            resp = client.get(
                "/people",
                params={
                    "jurisdiction": jurisdiction_ocd,
                    "include": ["other_names", "other_identifiers", "links", "sources", "offices"],
                    "page": page,
                    "per_page": 50,
                },
            )
            if resp.status_code == 429:
                log.warning("openstates: rate limited, sleeping 30s")
                time.sleep(30)
                continue
            resp.raise_for_status()
            payload = resp.json()
            for person in payload.get("results", []):
                record = self._person_to_record(person, state_code)
                if record is not None:
                    yield record
            pagination = payload.get("pagination", {})
            if page >= pagination.get("max_page", page):
                break
            page += 1
            time.sleep(self.sleep_between_pages)

    def _person_to_record(self, person: dict, state_code: str) -> Optional[IngestedRecord]:
        current_role = person.get("current_role") or {}
        if not current_role:
            return None

        org_classification = current_role.get("org_classification")  # "lower" | "upper"
        title = current_role.get("title") or (
            "State Senator" if org_classification == "upper" else "State Representative"
        )
        district = current_role.get("district")

        offices = person.get("offices") or []
        capitol_office = next(
            (o for o in offices if o.get("classification") == "capitol"),
            offices[0] if offices else {},
        )

        party_label = current_role.get("party")
        party = PARTY_MAP.get(party_label, Party.OTHER if party_label else None)

        upper_state = state_code.upper()
        return IngestedRecord(
            full_name=person.get("name", ""),
            first_name=person.get("given_name"),
            last_name=person.get("family_name"),
            gender=person.get("gender"),
            birth_date=_parse_iso_date(person.get("birth_date")),
            photo_url=person.get("image"),
            biography=person.get("biography"),
            openstates_id=person.get("id"),
            extra_ids={
                ident.get("scheme"): ident.get("identifier")
                for ident in person.get("other_identifiers", [])
                if ident.get("scheme")
            },
            jurisdiction_name=current_role.get("jurisdiction") or upper_state,
            jurisdiction_level=GovernmentLevel.STATE,
            jurisdiction_ocd_id=f"ocd-division/country:us/state:{state_code}",
            jurisdiction_state_code=upper_state,
            jurisdiction_parent_ocd_id="ocd-division/country:us",
            district_name=f"{upper_state} {org_classification or 'legislative'} district {district}"
            if district is not None
            else None,
            district_type=f"sl{org_classification}" if org_classification else "state_legislative",
            district_identifier=str(district) if district is not None else None,
            office_title=title,
            branch=Branch.LEGISLATIVE,
            chamber=org_classification,
            is_elected=True,
            party=party,
            party_label=party_label,
            contact_email=person.get("email"),
            contact_phone=capitol_office.get("voice"),
            office_address=capitol_office.get("address"),
            office_state=upper_state,
            official_website=_first_link(person.get("links")),
            extra_data={
                "links": person.get("links"),
                "sources": person.get("sources"),
                "offices": offices,
                "openstates_url": person.get("openstates_url"),
            },
        )


def _parse_iso_date(value: Any):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value)).date()
    except ValueError:
        return None


def _first_link(links: Optional[list]) -> Optional[str]:
    if not links:
        return None
    for link in links:
        if link.get("note", "").lower() in {"homepage", "official website", "website"}:
            return link.get("url")
    return links[0].get("url") if links else None
