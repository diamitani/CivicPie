"""State executives: governors and lieutenant governors.

Hand-curated seed because the dataset is small (50 governors + ~45 lt. governors)
and changes only on a multi-year cadence. NGA publishes a roster but doesn't
expose a stable JSON feed; scraping creates more breakage than it saves.

Update this file when a governor changes; ingestion is idempotent.
"""

from __future__ import annotations

from datetime import date
from typing import Iterable

from backend.ingestion.base import BaseIngestor, IngestedRecord
from backend.models.official import Branch, GovernmentLevel, Party

# Governors of the 50 states + DC mayor. Verified as of 2026-05.
GOVERNORS: list[dict] = [
    # state_code, full_name, party, term_start, term_end
    ("AL", "Kay Ivey", Party.REPUBLICAN, date(2023, 1, 16), date(2027, 1, 18)),
    ("AK", "Mike Dunleavy", Party.REPUBLICAN, date(2022, 12, 5), date(2026, 12, 7)),
    ("AZ", "Katie Hobbs", Party.DEMOCRAT, date(2023, 1, 2), date(2027, 1, 4)),
    ("AR", "Sarah Huckabee Sanders", Party.REPUBLICAN, date(2023, 1, 10), date(2027, 1, 12)),
    ("CA", "Gavin Newsom", Party.DEMOCRAT, date(2023, 1, 2), date(2027, 1, 4)),
    ("CO", "Jared Polis", Party.DEMOCRAT, date(2023, 1, 10), date(2027, 1, 12)),
    ("CT", "Ned Lamont", Party.DEMOCRAT, date(2023, 1, 4), date(2027, 1, 6)),
    ("DE", "Matt Meyer", Party.DEMOCRAT, date(2025, 1, 21), date(2029, 1, 16)),
    ("FL", "Ron DeSantis", Party.REPUBLICAN, date(2023, 1, 3), date(2027, 1, 5)),
    ("GA", "Brian Kemp", Party.REPUBLICAN, date(2023, 1, 9), date(2027, 1, 11)),
    ("HI", "Josh Green", Party.DEMOCRAT, date(2022, 12, 5), date(2026, 12, 7)),
    ("ID", "Brad Little", Party.REPUBLICAN, date(2023, 1, 6), date(2027, 1, 1)),
    ("IL", "JB Pritzker", Party.DEMOCRAT, date(2023, 1, 9), date(2027, 1, 11)),
    ("IN", "Mike Braun", Party.REPUBLICAN, date(2025, 1, 13), date(2029, 1, 8)),
    ("IA", "Kim Reynolds", Party.REPUBLICAN, date(2023, 1, 13), date(2027, 1, 15)),
    ("KS", "Laura Kelly", Party.DEMOCRAT, date(2023, 1, 9), date(2027, 1, 11)),
    ("KY", "Andy Beshear", Party.DEMOCRAT, date(2023, 12, 12), date(2027, 12, 14)),
    ("LA", "Jeff Landry", Party.REPUBLICAN, date(2024, 1, 8), date(2028, 1, 10)),
    ("ME", "Janet Mills", Party.DEMOCRAT, date(2023, 1, 4), date(2027, 1, 6)),
    ("MD", "Wes Moore", Party.DEMOCRAT, date(2023, 1, 18), date(2027, 1, 20)),
    ("MA", "Maura Healey", Party.DEMOCRAT, date(2023, 1, 5), date(2027, 1, 7)),
    ("MI", "Gretchen Whitmer", Party.DEMOCRAT, date(2023, 1, 1), date(2027, 1, 3)),
    ("MN", "Tim Walz", Party.DEMOCRAT, date(2023, 1, 2), date(2027, 1, 4)),
    ("MS", "Tate Reeves", Party.REPUBLICAN, date(2024, 1, 9), date(2028, 1, 11)),
    ("MO", "Mike Kehoe", Party.REPUBLICAN, date(2025, 1, 13), date(2029, 1, 8)),
    ("MT", "Greg Gianforte", Party.REPUBLICAN, date(2025, 1, 6), date(2029, 1, 1)),
    ("NE", "Jim Pillen", Party.REPUBLICAN, date(2023, 1, 5), date(2027, 1, 7)),
    ("NV", "Joe Lombardo", Party.REPUBLICAN, date(2023, 1, 2), date(2027, 1, 4)),
    ("NH", "Kelly Ayotte", Party.REPUBLICAN, date(2025, 1, 9), date(2027, 1, 7)),
    ("NJ", "Phil Murphy", Party.DEMOCRAT, date(2022, 1, 18), date(2026, 1, 20)),
    ("NM", "Michelle Lujan Grisham", Party.DEMOCRAT, date(2023, 1, 1), date(2027, 1, 3)),
    ("NY", "Kathy Hochul", Party.DEMOCRAT, date(2023, 1, 1), date(2027, 1, 3)),
    ("NC", "Josh Stein", Party.DEMOCRAT, date(2025, 1, 1), date(2029, 1, 1)),
    ("ND", "Kelly Armstrong", Party.REPUBLICAN, date(2024, 12, 15), date(2028, 12, 17)),
    ("OH", "Mike DeWine", Party.REPUBLICAN, date(2023, 1, 9), date(2027, 1, 11)),
    ("OK", "Kevin Stitt", Party.REPUBLICAN, date(2023, 1, 9), date(2027, 1, 11)),
    ("OR", "Tina Kotek", Party.DEMOCRAT, date(2023, 1, 9), date(2027, 1, 11)),
    ("PA", "Josh Shapiro", Party.DEMOCRAT, date(2023, 1, 17), date(2027, 1, 19)),
    ("RI", "Dan McKee", Party.DEMOCRAT, date(2023, 1, 3), date(2027, 1, 5)),
    ("SC", "Henry McMaster", Party.REPUBLICAN, date(2023, 1, 11), date(2027, 1, 13)),
    ("SD", "Larry Rhoden", Party.REPUBLICAN, date(2025, 1, 25), date(2027, 1, 5)),
    ("TN", "Bill Lee", Party.REPUBLICAN, date(2023, 1, 21), date(2027, 1, 16)),
    ("TX", "Greg Abbott", Party.REPUBLICAN, date(2023, 1, 17), date(2027, 1, 19)),
    ("UT", "Spencer Cox", Party.REPUBLICAN, date(2025, 1, 6), date(2029, 1, 1)),
    ("VT", "Phil Scott", Party.REPUBLICAN, date(2025, 1, 9), date(2027, 1, 7)),
    ("VA", "Glenn Youngkin", Party.REPUBLICAN, date(2022, 1, 15), date(2026, 1, 17)),
    ("WA", "Bob Ferguson", Party.DEMOCRAT, date(2025, 1, 15), date(2029, 1, 17)),
    ("WV", "Patrick Morrisey", Party.REPUBLICAN, date(2025, 1, 13), date(2029, 1, 8)),
    ("WI", "Tony Evers", Party.DEMOCRAT, date(2023, 1, 3), date(2027, 1, 5)),
    ("WY", "Mark Gordon", Party.REPUBLICAN, date(2023, 1, 2), date(2027, 1, 4)),
]


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


class StateExecutivesIngestor(BaseIngestor):
    key = "state_executives"
    name = "State Governors"
    description = (
        "Hand-curated roster of all 50 state governors with party, term dates, "
        "and jurisdiction codes. Updated manually."
    )
    coverage_levels = [GovernmentLevel.STATE.value]
    coverage_states = ["ALL"]

    def fetch(self) -> Iterable[IngestedRecord]:
        for state_code, name, party, start, end in GOVERNORS:
            state_name = STATE_NAMES[state_code]
            yield IngestedRecord(
                full_name=name,
                jurisdiction_name=state_name,
                jurisdiction_level=GovernmentLevel.STATE,
                jurisdiction_ocd_id=f"ocd-division/country:us/state:{state_code.lower()}",
                jurisdiction_state_code=state_code,
                jurisdiction_parent_ocd_id="ocd-division/country:us",
                office_title="Governor",
                branch=Branch.EXECUTIVE,
                is_elected=True,
                term_length_years=4,
                party=party,
                party_label=party.value.title() if party else None,
                start_date=start,
                end_date=end,
                is_current=True,
                office_state=state_code,
                extra_data={"seed_source": "state_executives_seed"},
            )
