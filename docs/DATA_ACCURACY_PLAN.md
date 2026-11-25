# CivicPie data-accuracy plan (POP) — 2026-11-25

## Intent brief
Make every record in the CivicPie backend defensible against an independent public source, and make
"unverified" visible instead of silently looking correct. Trigger: the governor/AG seed was typed from
memory and labelled "verified 2026-05" without being checked; on 2026-11-25 an audit found 8 of 100 wrong.

## JTBD
1. When a record is shown to a voter, I want to know who actually holds the office today.
2. When a source disagrees with us, I want it caught by a script, not a user.
3. When a field can't be verified, I want it blank and flagged, never guessed.

## Audit results (2026-11-25)
| Dataset | Rows | Independent check | Result |
|---|---|---|---|
| Governors | 50 | NGA roster | 2 wrong (NJ, VA) → fixed |
| Attorneys general | 50 | NAAG roster | 6 wrong (AK, MO, NJ, OH, VA, WY) → fixed |
| Congress | 539 | structural: 100 senators, 2/state, no duplicate districts; matches seed 539/539 | structurally sound; **content not re-verified** against congress.gov |
| Federal judges | 850 seats | FJC row logic; 9 SCOTUS / 179 appeals match statute | sound; 4 "duplicate" names are one judge on several district seats |
| Counties | 3,234 | Census file | not independently cross-checked (count only) |
| Agencies | 473 | Federal Register; 15 cabinet depts merged with seed | includes defunct agencies (e.g. ACTION); `is_active` not derived |

Fixes shipped: corrected 8 names; blank (not guessed) party/dates for the new holders; seeds now retire the
previous holder on re-ingest (`replaces_office_holders`); verified snapshot in `data/verified/` + regression test.

## NPAO task list
**N — Necessity (do first)**
- [x] Verify governors vs NGA, AGs vs NAAG; fix seed
- [ ] Re-verify party/term dates for the 100 exec rows (names only so far) — source: state SoS / Ballotpedia (verify, don't scrape wholesale)
- [ ] Decide what to do about Husted/Moody (OH/FL Senate): `term_end` is the 2026-11-03 special-election date; re-run `congress_legislators` after upstream updates
**A — Anxiety (risk)**
- [ ] Wire a scheduled re-check (monthly; after every Nov election) — GitHub Action calling a roster-diff script
- [ ] Cross-check Congress party/district vs congress.gov API (needs `CONGRESS_GOV_API_KEY`)
**P — Priority**
- [ ] Lt. governors / SoS / treasurers: source from NLGA / NASS / NAST before adding (do not hand-type)
- [ ] Derive `agencies.is_active` (flag defunct Federal Register entries)
**O — Opportunity**
- [ ] OpenStates ingest (needs key) to replace the 7,100 spreadsheet legislators with a sourced, refreshable feed

## KPIs
| KPI | Baseline (today) | Target | Source |
|---|---|---|---|
| % exec rows whose NAME matches an independent source | 100% (100/100, after fix) | 100% each check | NGA/NAAG diff |
| % exec rows with verified party AND dates | 0% | 100% | per-state official sites |
| Days since last full roster check | 0 | ≤ 30 | `data/verified/*.json` date |
| Rows showing "unverified" explicitly | n/a | 100% of unverified | `name_verified` in `extra_data` |

**P&L / accountability:** Patrick Diamitani (Diamitani Industries) owns accuracy of published CivicPie data; the builder
agent owns running the checks and reporting misses.

## Guardrails
- Hard stops: guessing a party/date/name · deleting history (retire, don't delete) · publishing unverified values as verified
- Confirm first: bulk changes >10 records · loading to production Supabase
- Autonomous: read-only verification, writing audit files, running tests
