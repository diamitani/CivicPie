"""U.S. Census Bureau county / county-equivalent seeder.

Populates the ~3,143 county-level Jurisdiction rows so Tier 2 ingestors
(sheriffs, commissioners, DAs, county judges) have a canonical target to
attach OfficialTerm rows to. No officials are ingested here -- this is a
pure jurisdiction seeder.

Data source:
    https://www2.census.gov/geo/docs/reference/codes/files/national_county.txt

Format: comma-separated, no header, columns:
    STATE (2-letter abbrev), STATEFP (2-digit), COUNTYFP (3-digit),
    COUNTYNAME (includes suffix like "County", "Parish", "Borough"), CLASSFP

Set CENSUS_COUNTY_FILE to override the URL / point at a local copy.

Some sandboxed / bot-detected clients get a 403 from www2.census.gov even
with a browser User-Agent -- in that case, download the file manually with
curl once and point CENSUS_COUNTY_FILE at the local path.

OCD ID convention (Open Civic Data):
    ocd-division/country:us/state:{state}/county:{slug}
where slug is the county name lowercased, "County"/"Parish"/"Borough"
suffixes stripped, spaces + apostrophes replaced with hyphens.
"""

from __future__ import annotations

import csv
import io
import logging
import os
import re
from typing import Any, Iterable

import httpx

from backend.ingestion.base import BaseIngestor, IngestedRecord
from backend.models.official import GovernmentLevel

log = logging.getLogger(__name__)

CENSUS_URL = "https://www2.census.gov/geo/docs/reference/codes/files/national_county.txt"

STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "District of Columbia",
    "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
    "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
    "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
    "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
    "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
    "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
    "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
    "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
    "WI": "Wisconsin", "WY": "Wyoming",
    "AS": "American Samoa", "GU": "Guam", "MP": "Northern Mariana Islands",
    "PR": "Puerto Rico", "VI": "United States Virgin Islands",
}

_SLUG_STRIP = re.compile(r"\s+(county|parish|borough|municipality|census area|city and borough)$", re.IGNORECASE)
_SLUG_CLEAN = re.compile(r"[^a-z0-9_]+")


def _county_slug(county_name: str) -> str:
    name = _SLUG_STRIP.sub("", county_name.strip())
    name = name.lower().replace("'", "").replace(".", "").replace("&", "and")
    name = re.sub(r"\s+", "_", name)
    return _SLUG_CLEAN.sub("", name)


class CensusCountiesIngestor(BaseIngestor):
    key = "census_counties"
    name = "U.S. Census County / County-Equivalent Seeder"
    description = (
        "Seeds ~3,143 county-level Jurisdiction rows from the Census Bureau's "
        "national_county file. Creates OCD IDs and FIPS codes; no officials."
    )
    coverage_levels = [GovernmentLevel.COUNTY.value]
    coverage_states = ["ALL"]

    def __init__(self, **params: Any) -> None:
        super().__init__(**params)
        self.csv_path = params.get("csv_path") or os.environ.get("CENSUS_COUNTY_FILE")
        self.url = params.get("url", CENSUS_URL)
        self.timeout = params.get("timeout", 60.0)

    def _load_rows(self) -> list[list[str]]:
        if self.csv_path:
            log.info("census_counties: reading %s", self.csv_path)
            with open(self.csv_path, "r", encoding="utf-8") as f:
                return list(csv.reader(f))
        log.info("census_counties: fetching %s", self.url)
        headers = {
            "User-Agent": "CivicPie Bot (civic engagement platform; +https://civicpie.com)",
            "Accept": "text/plain,text/csv,*/*",
        }
        with httpx.Client(timeout=self.timeout, headers=headers) as client:
            resp = client.get(self.url)
            resp.raise_for_status()
            return list(csv.reader(io.StringIO(resp.text)))

    def fetch(self) -> Iterable[IngestedRecord]:
        for row in self._load_rows():
            if not row or len(row) < 4:
                continue
            state_code = (row[0] or "").strip().upper()
            state_fp = (row[1] or "").strip()
            county_fp = (row[2] or "").strip()
            county_name = (row[3] or "").strip()
            classfp = (row[4] or "").strip() if len(row) >= 5 else ""
            if not (state_code and county_name):
                continue
            state_name = STATE_NAMES.get(state_code)
            if not state_name:
                continue

            fips = f"{state_fp}{county_fp}"
            slug = _county_slug(county_name)
            ocd_id = f"ocd-division/country:us/state:{state_code.lower()}/county:{slug}"

            yield IngestedRecord(
                # No person / office -- this is a jurisdiction-only seed.
                full_name="",
                jurisdiction_name=county_name,
                jurisdiction_level=GovernmentLevel.COUNTY,
                jurisdiction_ocd_id=ocd_id,
                jurisdiction_state_code=state_code,
                jurisdiction_parent_ocd_id=f"ocd-division/country:us/state:{state_code.lower()}",
                jurisdiction_extra_data={
                    "fips": fips,
                    "state_fips": state_fp,
                    "county_fips": county_fp,
                    "census_class": classfp or None,
                    "state_name": state_name,
                },
                office_title="",  # sentinel: upsert treats empty title as jurisdiction-only
            )
