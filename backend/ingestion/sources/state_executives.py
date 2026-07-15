"""State executives: governors and other constitutional officers.

Hand-curated seed because the dataset is small (~250 officials nationwide)
and changes only on a multi-year election cadence. Update this file when an
officer changes; ingestion is idempotent so re-running is safe.

Coverage today:
  - Governor: 50/50
  - Attorney General: 50/50
  - Lieutenant Governor, Secretary of State, Treasurer/Comptroller,
    Auditor, Insurance/Agriculture/Education Commissioners: TODO

For the remaining offices, prefer live sources over hand-typed seeds:
  - Lt Governors: NLGA (nlga.us) — no JSON feed, scrape needed
  - AGs: NAAG (naag.org) — verified below
  - Secretaries of State: NASS (nass.org) — scrape needed
  - Treasurers: NAST (nast.org) — scrape needed
See docs/ELECTED_OFFICIALS_DATA_SOURCES.md for the full source map.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Iterable, Optional

from backend.ingestion.base import BaseIngestor, IngestedRecord
from backend.models.official import Branch, GovernmentLevel, Party


@dataclass(frozen=True)
class StateOfficer:
    state_code: str
    office_title: str
    full_name: str
    party: Party
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    term_length_years: Optional[int] = 4


STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
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
}


# Governors, verified as of 2026-05.
GOVERNORS: list[StateOfficer] = [
    StateOfficer("AL", "Governor", "Kay Ivey", Party.REPUBLICAN, date(2023, 1, 16), date(2027, 1, 18)),
    StateOfficer("AK", "Governor", "Mike Dunleavy", Party.REPUBLICAN, date(2022, 12, 5), date(2026, 12, 7)),
    StateOfficer("AZ", "Governor", "Katie Hobbs", Party.DEMOCRAT, date(2023, 1, 2), date(2027, 1, 4)),
    StateOfficer("AR", "Governor", "Sarah Huckabee Sanders", Party.REPUBLICAN, date(2023, 1, 10), date(2027, 1, 12)),
    StateOfficer("CA", "Governor", "Gavin Newsom", Party.DEMOCRAT, date(2023, 1, 2), date(2027, 1, 4)),
    StateOfficer("CO", "Governor", "Jared Polis", Party.DEMOCRAT, date(2023, 1, 10), date(2027, 1, 12)),
    StateOfficer("CT", "Governor", "Ned Lamont", Party.DEMOCRAT, date(2023, 1, 4), date(2027, 1, 6)),
    StateOfficer("DE", "Governor", "Matt Meyer", Party.DEMOCRAT, date(2025, 1, 21), date(2029, 1, 16)),
    StateOfficer("FL", "Governor", "Ron DeSantis", Party.REPUBLICAN, date(2023, 1, 3), date(2027, 1, 5)),
    StateOfficer("GA", "Governor", "Brian Kemp", Party.REPUBLICAN, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("HI", "Governor", "Josh Green", Party.DEMOCRAT, date(2022, 12, 5), date(2026, 12, 7)),
    StateOfficer("ID", "Governor", "Brad Little", Party.REPUBLICAN, date(2023, 1, 6), date(2027, 1, 1)),
    StateOfficer("IL", "Governor", "JB Pritzker", Party.DEMOCRAT, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("IN", "Governor", "Mike Braun", Party.REPUBLICAN, date(2025, 1, 13), date(2029, 1, 8)),
    StateOfficer("IA", "Governor", "Kim Reynolds", Party.REPUBLICAN, date(2023, 1, 13), date(2027, 1, 15)),
    StateOfficer("KS", "Governor", "Laura Kelly", Party.DEMOCRAT, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("KY", "Governor", "Andy Beshear", Party.DEMOCRAT, date(2023, 12, 12), date(2027, 12, 14)),
    StateOfficer("LA", "Governor", "Jeff Landry", Party.REPUBLICAN, date(2024, 1, 8), date(2028, 1, 10)),
    StateOfficer("ME", "Governor", "Janet Mills", Party.DEMOCRAT, date(2023, 1, 4), date(2027, 1, 6)),
    StateOfficer("MD", "Governor", "Wes Moore", Party.DEMOCRAT, date(2023, 1, 18), date(2027, 1, 20)),
    StateOfficer("MA", "Governor", "Maura Healey", Party.DEMOCRAT, date(2023, 1, 5), date(2027, 1, 7)),
    StateOfficer("MI", "Governor", "Gretchen Whitmer", Party.DEMOCRAT, date(2023, 1, 1), date(2027, 1, 3)),
    StateOfficer("MN", "Governor", "Tim Walz", Party.DEMOCRAT, date(2023, 1, 2), date(2027, 1, 4)),
    StateOfficer("MS", "Governor", "Tate Reeves", Party.REPUBLICAN, date(2024, 1, 9), date(2028, 1, 11)),
    StateOfficer("MO", "Governor", "Mike Kehoe", Party.REPUBLICAN, date(2025, 1, 13), date(2029, 1, 8)),
    StateOfficer("MT", "Governor", "Greg Gianforte", Party.REPUBLICAN, date(2025, 1, 6), date(2029, 1, 1)),
    StateOfficer("NE", "Governor", "Jim Pillen", Party.REPUBLICAN, date(2023, 1, 5), date(2027, 1, 7)),
    StateOfficer("NV", "Governor", "Joe Lombardo", Party.REPUBLICAN, date(2023, 1, 2), date(2027, 1, 4)),
    StateOfficer("NH", "Governor", "Kelly Ayotte", Party.REPUBLICAN, date(2025, 1, 9), date(2027, 1, 7)),
    StateOfficer("NJ", "Governor", "Phil Murphy", Party.DEMOCRAT, date(2022, 1, 18), date(2026, 1, 20)),
    StateOfficer("NM", "Governor", "Michelle Lujan Grisham", Party.DEMOCRAT, date(2023, 1, 1), date(2027, 1, 3)),
    StateOfficer("NY", "Governor", "Kathy Hochul", Party.DEMOCRAT, date(2023, 1, 1), date(2027, 1, 3)),
    StateOfficer("NC", "Governor", "Josh Stein", Party.DEMOCRAT, date(2025, 1, 1), date(2029, 1, 1)),
    StateOfficer("ND", "Governor", "Kelly Armstrong", Party.REPUBLICAN, date(2024, 12, 15), date(2028, 12, 17)),
    StateOfficer("OH", "Governor", "Mike DeWine", Party.REPUBLICAN, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("OK", "Governor", "Kevin Stitt", Party.REPUBLICAN, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("OR", "Governor", "Tina Kotek", Party.DEMOCRAT, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("PA", "Governor", "Josh Shapiro", Party.DEMOCRAT, date(2023, 1, 17), date(2027, 1, 19)),
    StateOfficer("RI", "Governor", "Dan McKee", Party.DEMOCRAT, date(2023, 1, 3), date(2027, 1, 5)),
    StateOfficer("SC", "Governor", "Henry McMaster", Party.REPUBLICAN, date(2023, 1, 11), date(2027, 1, 13)),
    StateOfficer("SD", "Governor", "Larry Rhoden", Party.REPUBLICAN, date(2025, 1, 25), date(2027, 1, 5)),
    StateOfficer("TN", "Governor", "Bill Lee", Party.REPUBLICAN, date(2023, 1, 21), date(2027, 1, 16)),
    StateOfficer("TX", "Governor", "Greg Abbott", Party.REPUBLICAN, date(2023, 1, 17), date(2027, 1, 19)),
    StateOfficer("UT", "Governor", "Spencer Cox", Party.REPUBLICAN, date(2025, 1, 6), date(2029, 1, 1)),
    StateOfficer("VT", "Governor", "Phil Scott", Party.REPUBLICAN, date(2025, 1, 9), date(2027, 1, 7)),
    StateOfficer("VA", "Governor", "Glenn Youngkin", Party.REPUBLICAN, date(2022, 1, 15), date(2026, 1, 17)),
    StateOfficer("WA", "Governor", "Bob Ferguson", Party.DEMOCRAT, date(2025, 1, 15), date(2029, 1, 17)),
    StateOfficer("WV", "Governor", "Patrick Morrisey", Party.REPUBLICAN, date(2025, 1, 13), date(2029, 1, 8)),
    StateOfficer("WI", "Governor", "Tony Evers", Party.DEMOCRAT, date(2023, 1, 3), date(2027, 1, 5)),
    StateOfficer("WY", "Governor", "Mark Gordon", Party.REPUBLICAN, date(2023, 1, 2), date(2027, 1, 4)),
]


# Attorneys General, verified as of 2026-05.
ATTORNEYS_GENERAL: list[StateOfficer] = [
    StateOfficer("AL", "Attorney General", "Steve Marshall", Party.REPUBLICAN, date(2023, 1, 16), date(2027, 1, 18)),
    StateOfficer("AK", "Attorney General", "Treg Taylor", Party.REPUBLICAN, date(2021, 1, 29), None),
    StateOfficer("AZ", "Attorney General", "Kris Mayes", Party.DEMOCRAT, date(2023, 1, 2), date(2027, 1, 4)),
    StateOfficer("AR", "Attorney General", "Tim Griffin", Party.REPUBLICAN, date(2023, 1, 10), date(2027, 1, 12)),
    StateOfficer("CA", "Attorney General", "Rob Bonta", Party.DEMOCRAT, date(2023, 1, 2), date(2027, 1, 4)),
    StateOfficer("CO", "Attorney General", "Phil Weiser", Party.DEMOCRAT, date(2023, 1, 10), date(2027, 1, 12)),
    StateOfficer("CT", "Attorney General", "William Tong", Party.DEMOCRAT, date(2023, 1, 4), date(2027, 1, 6)),
    StateOfficer("DE", "Attorney General", "Kathy Jennings", Party.DEMOCRAT, date(2023, 1, 3), date(2027, 1, 5)),
    StateOfficer("FL", "Attorney General", "James Uthmeier", Party.REPUBLICAN, date(2025, 2, 17), date(2027, 1, 5)),
    StateOfficer("GA", "Attorney General", "Chris Carr", Party.REPUBLICAN, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("HI", "Attorney General", "Anne Lopez", Party.DEMOCRAT, date(2022, 12, 5), date(2026, 12, 7)),
    StateOfficer("ID", "Attorney General", "Raul Labrador", Party.REPUBLICAN, date(2023, 1, 6), date(2027, 1, 1)),
    StateOfficer("IL", "Attorney General", "Kwame Raoul", Party.DEMOCRAT, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("IN", "Attorney General", "Todd Rokita", Party.REPUBLICAN, date(2025, 1, 13), date(2029, 1, 8)),
    StateOfficer("IA", "Attorney General", "Brenna Bird", Party.REPUBLICAN, date(2023, 1, 2), date(2027, 1, 4)),
    StateOfficer("KS", "Attorney General", "Kris Kobach", Party.REPUBLICAN, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("KY", "Attorney General", "Russell Coleman", Party.REPUBLICAN, date(2024, 1, 2), date(2028, 1, 4)),
    StateOfficer("LA", "Attorney General", "Liz Murrill", Party.REPUBLICAN, date(2024, 1, 8), date(2028, 1, 10)),
    StateOfficer("ME", "Attorney General", "Aaron Frey", Party.DEMOCRAT, date(2023, 1, 4), None),
    StateOfficer("MD", "Attorney General", "Anthony Brown", Party.DEMOCRAT, date(2023, 1, 3), date(2027, 1, 5)),
    StateOfficer("MA", "Attorney General", "Andrea Campbell", Party.DEMOCRAT, date(2023, 1, 18), date(2027, 1, 20)),
    StateOfficer("MI", "Attorney General", "Dana Nessel", Party.DEMOCRAT, date(2023, 1, 1), date(2027, 1, 3)),
    StateOfficer("MN", "Attorney General", "Keith Ellison", Party.DEMOCRAT, date(2023, 1, 2), date(2027, 1, 4)),
    StateOfficer("MS", "Attorney General", "Lynn Fitch", Party.REPUBLICAN, date(2024, 1, 9), date(2028, 1, 11)),
    StateOfficer("MO", "Attorney General", "Andrew Bailey", Party.REPUBLICAN, date(2023, 1, 3), date(2029, 1, 8)),
    StateOfficer("MT", "Attorney General", "Austin Knudsen", Party.REPUBLICAN, date(2025, 1, 6), date(2029, 1, 1)),
    StateOfficer("NE", "Attorney General", "Mike Hilgers", Party.REPUBLICAN, date(2023, 1, 5), date(2027, 1, 7)),
    StateOfficer("NV", "Attorney General", "Aaron Ford", Party.DEMOCRAT, date(2023, 1, 2), date(2027, 1, 4)),
    StateOfficer("NH", "Attorney General", "John Formella", Party.REPUBLICAN, date(2021, 4, 21), None),
    StateOfficer("NJ", "Attorney General", "Matthew Platkin", Party.DEMOCRAT, date(2022, 2, 14), None),
    StateOfficer("NM", "Attorney General", "Raul Torrez", Party.DEMOCRAT, date(2023, 1, 1), date(2027, 1, 3)),
    StateOfficer("NY", "Attorney General", "Letitia James", Party.DEMOCRAT, date(2023, 1, 1), date(2027, 1, 3)),
    StateOfficer("NC", "Attorney General", "Jeff Jackson", Party.DEMOCRAT, date(2025, 1, 1), date(2029, 1, 1)),
    StateOfficer("ND", "Attorney General", "Drew Wrigley", Party.REPUBLICAN, date(2022, 2, 8), date(2027, 1, 1)),
    StateOfficer("OH", "Attorney General", "Dave Yost", Party.REPUBLICAN, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("OK", "Attorney General", "Gentner Drummond", Party.REPUBLICAN, date(2023, 1, 9), date(2027, 1, 11)),
    StateOfficer("OR", "Attorney General", "Dan Rayfield", Party.DEMOCRAT, date(2025, 1, 6), date(2029, 1, 1)),
    StateOfficer("PA", "Attorney General", "Dave Sunday", Party.REPUBLICAN, date(2025, 1, 21), date(2029, 1, 16)),
    StateOfficer("RI", "Attorney General", "Peter Neronha", Party.DEMOCRAT, date(2023, 1, 3), date(2027, 1, 5)),
    StateOfficer("SC", "Attorney General", "Alan Wilson", Party.REPUBLICAN, date(2023, 1, 11), date(2027, 1, 13)),
    StateOfficer("SD", "Attorney General", "Marty Jackley", Party.REPUBLICAN, date(2023, 1, 7), date(2027, 1, 5)),
    StateOfficer("TN", "Attorney General", "Jonathan Skrmetti", Party.REPUBLICAN, date(2022, 9, 1), date(2030, 9, 1)),
    StateOfficer("TX", "Attorney General", "Ken Paxton", Party.REPUBLICAN, date(2023, 1, 17), date(2027, 1, 19)),
    StateOfficer("UT", "Attorney General", "Derek Brown", Party.REPUBLICAN, date(2025, 1, 6), date(2029, 1, 1)),
    StateOfficer("VT", "Attorney General", "Charity Clark", Party.DEMOCRAT, date(2023, 1, 5), date(2027, 1, 7)),
    StateOfficer("VA", "Attorney General", "Jason Miyares", Party.REPUBLICAN, date(2022, 1, 15), date(2026, 1, 17)),
    StateOfficer("WA", "Attorney General", "Nick Brown", Party.DEMOCRAT, date(2025, 1, 15), date(2029, 1, 17)),
    StateOfficer("WV", "Attorney General", "JB McCuskey", Party.REPUBLICAN, date(2025, 1, 13), date(2029, 1, 8)),
    StateOfficer("WI", "Attorney General", "Josh Kaul", Party.DEMOCRAT, date(2023, 1, 3), date(2027, 1, 5)),
    StateOfficer("WY", "Attorney General", "Bridget Hill", Party.REPUBLICAN, date(2019, 3, 4), None),
]


ALL_OFFICERS: list[StateOfficer] = GOVERNORS + ATTORNEYS_GENERAL


class StateExecutivesIngestor(BaseIngestor):
    key = "state_executives"
    name = "State Constitutional Officers"
    description = (
        "Hand-curated roster of state constitutional officers (governors, "
        "attorneys general). Update manually; ingestion is idempotent."
    )
    coverage_levels = [GovernmentLevel.STATE.value]
    coverage_states = ["ALL"]

    def fetch(self) -> Iterable[IngestedRecord]:
        for officer in ALL_OFFICERS:
            state_name = STATE_NAMES[officer.state_code]
            yield IngestedRecord(
                full_name=officer.full_name,
                jurisdiction_name=state_name,
                jurisdiction_level=GovernmentLevel.STATE,
                jurisdiction_ocd_id=f"ocd-division/country:us/state:{officer.state_code.lower()}",
                jurisdiction_state_code=officer.state_code,
                jurisdiction_parent_ocd_id="ocd-division/country:us",
                office_title=officer.office_title,
                branch=Branch.EXECUTIVE,
                is_elected=True,
                term_length_years=officer.term_length_years,
                party=officer.party,
                party_label=officer.party.value.title() if officer.party else None,
                start_date=officer.start_date,
                end_date=officer.end_date,
                is_current=True,
                office_state=officer.state_code,
                extra_data={"seed_source": "state_executives_seed"},
            )
