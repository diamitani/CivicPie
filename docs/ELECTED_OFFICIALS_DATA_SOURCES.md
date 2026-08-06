# U.S. Elected Officials — Data Source Inventory

This document is the working map of every API, dataset, and scrape target we need to reach 100% coverage of the ~500,000 U.S. elected officials. It is organized by tier (mirroring the project plan), then by level, then by state. Update it as we build out ingestors.

> **Status legend**
> - Implemented — ingestor lives in `backend/ingestion/sources/`
> - Planned — ingestor not built yet, source identified
> - Gap — no clean public source; will require scraping or manual curation

---

## Tier 1 — Federal & State (~8,500 officials)

### Federal (~545)

| Office | Count | Source | Status |
|---|---|---|---|
| President + VP | 2 | Hand-curated seed | Implemented (`federal_executive`) |
| Cabinet (15 secretaries + ~10 cabinet-rank) | ~25 | Hand-curated seed; whitehouse.gov verification scrape | Implemented (seed) |
| U.S. Senate | 100 | `unitedstates/congress-legislators` (CC0, GitHub) | Implemented (`congress_legislators`) |
| U.S. House | 435 | Same | Implemented |
| DC, PR, GU, AS, VI, MP delegates | 6 | Same (`legislators-current.yaml`) | Implemented |
| Federal judiciary (Art. III) | ~870 | Federal Judicial Center CSV | Implemented (`federal_judiciary`) |

**Key APIs:**
- **Congress.gov API** (api.congress.gov) — bills, votes, statements; key required, free
- **ProPublica Congress API** — voting summaries; key required, free
- **GovTrack.us** — votes, bill text; bulk downloads, no key
- **Federal Judicial Center** — judges biographical directory CSV/JSON

### State Executives (~310)

| Role | Count | Source | Status |
|---|---|---|---|
| Governor | 50 | Hand-curated seed | Implemented (`state_executives`) |
| Attorney General | 50 | Hand-curated seed (NAAG-verified) | Implemented (`state_executives`) |
| Lt. Governor | 45 | NLGA roster (scrape) | Planned |
| Secretary of State | 47 | NASS roster | Planned |
| State Treasurer / Comptroller | ~50 | NAST directory | Planned |
| State Auditor | ~50 | NSAA roster | Planned |
| Insurance / Agriculture / Education Commissioners | ~70 | NASCO, NAIC, NASDA, CCSSO directories | Planned |

### State Legislatures (~7,386)

All 50 states + DC + PR via **OpenStates v3** — Implemented (`openstates`).

| State | Chambers | Total seats | Notes |
|---|---|---|---|
| AL | 2 | 140 | |
| AK | 2 | 60 | |
| AZ | 2 | 90 | |
| AR | 2 | 135 | |
| CA | 2 | 120 | |
| CO | 2 | 100 | |
| CT | 2 | 187 | |
| DE | 2 | 62 | |
| FL | 2 | 160 | |
| GA | 2 | 236 | |
| HI | 2 | 76 | |
| ID | 2 | 105 | |
| IL | 2 | 177 | |
| IN | 2 | 150 | |
| IA | 2 | 150 | |
| KS | 2 | 165 | |
| KY | 2 | 138 | |
| LA | 2 | 144 | |
| ME | 2 | 186 | |
| MD | 2 | 188 | |
| MA | 2 | 200 | |
| MI | 2 | 148 | |
| MN | 2 | 201 | |
| MS | 2 | 174 | |
| MO | 2 | 197 | |
| MT | 2 | 150 | |
| **NE** | 1 | 49 | Unicameral, officially nonpartisan |
| NV | 2 | 63 | |
| NH | 2 | 424 | Largest legislature in the country |
| NJ | 2 | 120 | |
| NM | 2 | 112 | |
| NY | 2 | 213 | |
| NC | 2 | 170 | |
| ND | 2 | 141 | |
| OH | 2 | 132 | |
| OK | 2 | 149 | |
| OR | 2 | 90 | |
| PA | 2 | 253 | |
| RI | 2 | 113 | |
| SC | 2 | 170 | |
| SD | 2 | 105 | |
| TN | 2 | 132 | |
| TX | 2 | 181 | |
| UT | 2 | 104 | |
| VT | 2 | 180 | |
| VA | 2 | 140 | |
| WA | 2 | 147 | |
| WV | 2 | 134 | |
| WI | 2 | 132 | |
| WY | 2 | 90 | |

**Edge cases caught by OpenStates:**
- Nebraska's unicameral Legislature (only `upper`).
- Multi-member districts (NH House, MD House, ND, SD, VT, WV).
- Vacancies — surfaced as `current_role: null`; skip in upsert.

---

## Tier 2 — County (~58,000 officials)

**Jurisdiction hierarchy is seeded** via `census_counties` — all ~3,143 U.S. counties
and county-equivalents (parishes, boroughs, census areas) come from the Census
Bureau's `national_county` file with FIPS codes and OCD IDs.  Officials attach
to these jurisdictions during subsequent per-state ingestion.

### Universal county roles

Every county has some combination of these. Coverage is highly state-specific.

| Role | Typical count per state | Notes |
|---|---|---|
| Commissioners / Supervisors | 3-7 per county | Legislative body |
| Sheriff | 1 per county | Elected in 46 of 50 states |
| District Attorney / Prosecutor | 1 per county or judicial district | |
| County Clerk | 1 per county | |
| Treasurer / Tax Collector | 1 per county | |
| Assessor / Appraiser | 1 per county | |
| Coroner / Medical Examiner | 1 per county | Elected in ~30 states |
| Surveyor / Recorder of Deeds | 1 per county | Varies |
| Trial-court judges | Many | Wide variance |

### Per-state county data sources

| State | Counties | Best source | Notes |
|---|---|---|---|
| AL | 67 | Sec. of State elected officials directory; ACCA roster | PDF rosters, scrape needed |
| AK | 19 boroughs + 11 census areas | DCRA officials directory | Boroughs, not counties |
| AZ | 15 | County websites (uniform CMS); SoS election results | 15 sites, manageable |
| AR | 75 | AAC (Assoc. of AR Counties) directory | Scrape |
| CA | 58 | CSAC directory; SoS roster | Each county also publishes JSON; 58 scrapers OK |
| CO | 64 | CCI directory | |
| CT | 8 | **No county government** — towns substitute (Tier 3) | |
| DE | 3 | Direct scrape | Trivial |
| FL | 67 | FAC directory; SoE per county | |
| GA | 159 | ACCG directory | Largest county count by tier-2 effort |
| HI | 4 (county-equivalents) | Direct scrape | Trivial |
| ID | 44 | IAC directory | |
| IL | 102 | ISACO directory; Cook County is its own beast | Cook → separate scraper |
| IN | 92 | AIC directory | |
| IA | 99 | ISAC directory | |
| KS | 105 | KAC directory | |
| KY | 120 | KaCo directory | |
| LA | 64 (parishes) | Police Jury Assoc. directory | |
| ME | 16 | MCCA directory | |
| MD | 23 + Baltimore City | MACo directory | |
| MA | 14 (vestigial) | Most counties dissolved; town-centric (Tier 3) | |
| MI | 83 | MAC directory | |
| MN | 87 | AMC directory | |
| MS | 82 | MAS directory | |
| MO | 114 + St. Louis City | MAC directory | |
| MT | 56 | MACo directory | |
| NE | 93 | NACO directory | |
| NV | 17 | NACO directory | |
| NH | 10 | NHAC directory; town-centric | |
| NJ | 21 | NJAC directory | County government strong |
| NM | 33 | NMC directory | |
| NY | 62 | NYSAC; NYC's 5 boroughs collapse to NYC government (Tier 3) | |
| NC | 100 | NCACC directory | |
| ND | 53 | NDACo directory | |
| OH | 88 | CCAO directory | |
| OK | 77 | ACCO directory | |
| OR | 36 | AOC directory | |
| PA | 67 | CCAP directory + city/county Philadelphia | Philly = county+city |
| RI | 5 (vestigial, no government) | — | Town-centric |
| SC | 46 | SCAC directory | |
| SD | 66 | SDACO directory | |
| TN | 95 | CTAS directory | |
| TX | 254 | TAC directory | Largest by raw count; per-county scrapes |
| UT | 29 | UAC directory | |
| VT | 14 (vestigial, judicial only) | — | Town-centric |
| VA | 95 + 38 indep. cities | VACo + VML | Cities = county-equivalents |
| WA | 39 | WSAC directory | |
| WV | 55 | CCAWV directory | |
| WI | 72 | WCA directory | |
| WY | 23 | WCCA directory | |

**Cross-state aggregators worth evaluating before per-state scraping:**
- **NACo** (naco.org) — partial elected officials roster, but coverage is uneven.
- **Ballotpedia** — comprehensive but ToS-restricted; use only as a verification source, not a primary feed.
- **Vote Smart** — covers many county-level executive offices in election years.
- **Civic Info API** (Google) — `representatives` endpoint by address; useful for backfilling contact info but not for bulk roster.

---

## Tier 3 — City / Municipal (~135,000 officials)

### Strategy

Cities are the hardest tier because there is no national registry. Approach in waves:

1. **Top 100 cities by population** (~5,000 officials) — bespoke scrapers per city. Cost amortizes because these cities cover ~30% of US population.
2. **State municipal leagues** (NLC affiliates) — every state has one; many publish member directories with mayor/clerk contacts. ~19,500 incorporated places nationally.
3. **Census of Governments (every 5 years)** — gives the universe; 2022 edition is current. Use to scope completeness.
4. **Council of State Governments / ICMA** — manager-council vs strong-mayor classification metadata.

### High-value city sources

| City | Officials | Source | Notes |
|---|---|---|---|
| New York, NY | 51 council + mayor + comptroller + PA + 5 BPs + 59 CB chairs | NYC Open Data, City Council API | Existing JSON feeds |
| Los Angeles, CA | 15 council + mayor + controller + city atty | LA city site, Socrata | |
| Chicago, IL | 50 alderpersons + mayor + clerk + treasurer | Chicago Data Portal (already covered by existing CivicPie scrapers) | Reuse `backend/scrapers/chicago_spiders.py` |
| Houston, TX | 16 council + mayor + controller | houston.gov scrape | |
| Phoenix, AZ | 8 council + mayor | phoenix.gov | |
| Philadelphia, PA | 17 council + mayor (city+county) | OpenDataPhilly | |
| San Antonio, TX | 10 council + mayor | sanantonio.gov | |
| San Diego, CA | 9 council + mayor + city atty | sandiego.gov | |
| Dallas, TX | 14 council + mayor | dallas.gov + Dallas OpenData | |
| Austin, TX | 10 council + mayor | data.austintexas.gov | |
| Jacksonville, FL | 19 council + mayor (consolidated) | coj.net | |
| San Jose, CA | 10 council + mayor | sanjoseca.gov | |
| Fort Worth, TX | 9 council + mayor | fortworthtexas.gov | |
| Columbus, OH | 7 council + mayor | columbus.gov | |
| Charlotte, NC | 11 council + mayor | charlottenc.gov | |
| Seattle, WA | 9 council + mayor | data.seattle.gov | Strong open-data |
| Denver, CO | 13 council + mayor | denvergov.org + OpenDataDenver | Consolidated city-county |
| Washington, DC | 13 council + mayor | dccouncil.gov | Tier-1 special: federal district |
| Boston, MA | 13 council + mayor | data.boston.gov | |

### Aggregators to evaluate

- **OpenStates Open Civic Data** — extends beyond legislators in some pilot cities.
- **Council Data Project** (councildataproject.org) — meeting transcripts; council member rosters as a side effect; covers Seattle, LA, Boston, Long Beach, Atlanta, Charlotte, Denver, etc.
- **Civic Eagle / Quorum / FiscalNote** — commercial, not viable for our cost profile but useful as benchmarks.

---

## Tier 4 — Township + School Board + Special Districts (~306,000 officials)

This tier is where the moat lives. Nobody has done this comprehensively. Approach:

### Townships (~16,000 with elected boards)

Concentrated in 20 states (the "township states"): IL, IN, KS, ME, MI, MN, MO, NE, NH, NJ, NY, ND, OH, PA, RI, SD, VT, WI, plus parts of IA, NC. Most maintain a county directory of township trustees/supervisors.

Strategy: scrape county clerks' rosters in township states. Coverage state-by-state:

- **Pennsylvania** — 1,547 townships; PSATS directory
- **Illinois** — 1,433; TOI directory
- **Ohio** — 1,308; OTA directory
- **Michigan** — 1,240; MTA directory
- **Indiana** — 1,005; ITA directory

### School boards (~95,000)

| Source | Coverage | Status |
|---|---|---|
| **NCES CCD** (Common Core of Data) | District list, no board roster | Foundation |
| State departments of education | Per-state board rosters | Highly variable |
| **NSBA** state affiliates | Board members; uneven | Partial |
| Ballotpedia | ~14,000 of largest districts | Verification only |

Largest districts (NYC, LAUSD, Chicago, Houston, Miami-Dade, Clark Co. NV, Hawaii statewide, Hillsborough, Orange Co. FL, Broward) — bespoke scrapers, ~10,000 officials.

### Special districts (~195,000)

The hardest segment. Census of Governments lists ~38,500 special districts, but most are governed by appointed boards (~80%) — only ~20% have elected boards (~40,000-50,000 officials nationally), heavily concentrated in:

- **California** — ~2,300 special districts, many elected (water, fire, irrigation)
- **Illinois** — ~3,200 (highest count in the country)
- **Texas** — ~3,000 (MUDs, water districts, ESDs)
- **Washington** — ~1,200 (PUDs, fire, port, school)
- **Pennsylvania** — ~1,800

Sources:
- **Census of Governments 2022** — CSV of every special district
- **State auditors' offices** — most require special districts to register with a unique ID
- **CSDA** (CA), **AISD** (IL), **TSDA** (TX) — state special-district associations

---

## Cross-cutting integrations

### Identity resolution

We rely on external IDs in this priority order:

1. `bioguide_id` — unambiguous for federal legislators
2. `openstates_id` — unambiguous for state legislators
3. `govtrack_id` / `votesmart_id` / `icpsr_id` — historical federal
4. `fec_id` — anyone who has ever run for federal office
5. `google_civic_id` — OCD division ID, useful at all levels
6. `(full_name, jurisdiction, district)` — fallback heuristic; we err toward creating a new Person rather than collapsing distinct humans

### Geographic / OCD IDs

Open Civic Data Division IDs are the canonical jurisdiction key across all sources. Format examples:

- `ocd-division/country:us`
- `ocd-division/country:us/state:il`
- `ocd-division/country:us/state:il/county:cook`
- `ocd-division/country:us/state:il/place:chicago`
- `ocd-division/country:us/state:il/place:chicago/ward:48`
- `ocd-division/country:us/state:il/cd:7`
- `ocd-division/country:us/state:il/sldl:25`
- `ocd-division/country:us/state:il/sldu:13`

Source for the full registry: `opencivicdata/ocd-division-ids` on GitHub (CC0).

### Update cadence

| Tier | Source | Refresh |
|---|---|---|
| 1 | congress_legislators | Daily (file updates frequently) |
| 1 | openstates | Weekly |
| 1 | state_executives, federal_executive | On change (manual) |
| 2 | County rosters | Quarterly |
| 3 | Top-100 cities | Monthly |
| 3 | All other cities | Quarterly |
| 4 | Townships / school boards | Annually post-election |
| 4 | Special districts | Annually post-election |

### Vacancies & dead reckoning

When a source delivers a complete current roster, the orchestrator marks rows it didn't touch as `is_current=False` (see `upsert.deactivate_stale_terms`). This handles vacancies, resignations, and deaths automatically as long as the source is authoritative for its scope.

---

## Open questions

1. **Judges below state supreme courts** — sourcing varies wildly. Federal Judicial Center covers Article III, but state and local trial judges require state-by-state work.
2. **Native nations** — 574 federally recognized tribes have elected councils. Not in any of the standard rosters. Likely a Tier-5 effort.
3. **Insular areas (PR, GU, USVI, MP, AS)** — partial OpenStates coverage; PR territorial legislature is in. GU/USVI/MP/AS need bespoke ingestors.
