# CivicPie Nationwide Data Plan

**Goal:** every city in America has its officials, local agencies and election data in CivicPie, and the live app actually serves it.
**Written:** 2026-10-14 · **Repos:** `CivicPie` (app) + `civicpie-data` (data) · **Branch:** `claude/dreamy-curie-4jteed`

---

## 1. Where we really are (audit, 2026-10-14)

| Question | Answer |
|---|---|
| Do we know every place that exists? | **Yes.** `master_places.db` has 48,514 rows from the Census: 19,465 incorporated cities/towns/villages with a population, plus townships, CDPs and territories. |
| How many have council/mayor data? | **~2,081 municipalities** (81 big cities + 2,000 "long-tail" across 4 waves), 13,412 long-tail members. That's about **11% of cities**, but roughly **55% of the population in incorporated places**. |
| Biggest cities covered? | Top 100 by population: 99. Top 1,000: 998. After rank ~2,070 (~10k people) coverage stops. |
| Weakest states | DC 0/1, SD 4/310, VT 1/39, AK 3/149, ND 7/355, WV 7/230, NE 9/528, IA 27/939. |
| How good is the member data? | Email on **14%**, phone on **16%**, term dates on **29%**. 519 of 2,000 have no council page URL saved. 40 have zero members. Only the original 81 cities have a `verification` flag. |
| **Is any of it live in the app?** | **No.** The 13k council members are in `civicpie-data/data/staged/` only. The app's seed (`data/seed/`) has Chicago plus *one* other city (North Liberty, IA). Lookup works for Chicago wards, plus federal and state officials. Everywhere else returns "no local coverage". |
| Is the database activated? | **Can't confirm from here, and probably not.** `DATABASE_URL` isn't set in this environment. The Supabase README says you must paste the DDL in the dashboard by hand, and it references `003_load_places.py`, which **doesn't exist** in the repo. So the 48.5k places are not loadable as shipped. |
| Local agencies? | Almost none. `agencies` is federal and state only. No school districts, special districts or county offices. |
| Elections? | `elections_master_election_guide.json` has 33 candidates, 14 polling-place records, 11 dates and 42 states. This is Senate/federal-level and thin. There are no municipal, school-board, county or judicial races. |

**Bottom line:** the *map* of America is complete, but the *people* are about 11% done and none of that reaches the website yet. Fix that order: **activate and wire first, then scale scraping.**

---

## 2. What "every city" has to mean (needs your OK)

There are two different universes. I recommend we define it like this:

- **Tier A, cities, towns, villages, boroughs:** 19,465 incorporated places. Council + mayor + clerk + meeting info.
- **Tier B, townships:** 12,567 that have real governments (mostly the Midwest and Northeast).
- **Tier C, "local agencies":** the Census of Governments lists ~90,000 governments (3,031 counties, ~13k school districts, ~39k special districts such as fire, water, parks and libraries). It's the free, authoritative list. **Do counties and school districts first. Special districts last.**
- CDPs (12,754) are **not governments**. They get a link to their county and nothing else.

---

## 3. How the scraping works (your Google Maps + city council idea)

One city goes through this pipeline. The agents run it ~19,000 times.

```
1. FIND     Google Places API  →  "City Hall, <City>, <ST>"  → official website, phone, address
2. LOCATE   Crawl that site (Firecrawl) → find the "City Council / Mayor / Elected Officials" page
3. EXTRACT  Claude reads the page → structured JSON: name, title, ward/district, email, phone, term, source_url
4. VERIFY   Second source check: Ballotpedia-style/state municipal league/Wikipedia count + .gov domain check
5. SCORE    verified / single-source / needs-review  (nothing is published without a source_url)
6. LOAD     staged JSON → Supabase → app API
```

Honest notes on the Google Maps part:
- **Don't scrape Google Maps pages.** It violates Google's terms and gets blocked. Use the **Places API (official)**. It returns website, phone and address per city. Roughly a few cents per lookup, so budget **a few hundred dollars for all ~19.5k**, and run a 100-city pilot first to get the real cost. Check current pricing before the full run.
- The 81 + 2,000 cities we already have a `website` or `council_page_url` for **skip step 1**. Only about 17k need discovery.
- The sandbox can't reach many `.gov` sites directly (San Jose returned 403). **Firecrawl can**, so all fetching goes through Firecrawl. (I tested one page: it connected. My guessed URL was a 404, which is exactly why step 2 discovers pages instead of guessing.)

---

## 4. The agent team

| # | Agent | Job | Runs |
|---|---|---|---|
| 1 | **QA Auditor** | Tests current data and API: duplicates, null rates, bad emails/phones, name oddities, FK breaks, `/api/health`, the existing 22-assertion `test:api`. Produces a scorecard. | First, then after every phase |
| 2 | **Ops/Loader** | Gets Supabase live: runs DDL, fixes the missing `003_load_places.py`, loads places + 13.4k council members, sets `DATABASE_URL` on Vercel, makes `/api/health` report `source: supabase`. | Phase 1 |
| 3 | **Universe Builder** | Downloads the Census of Governments list; builds `agencies` universe (counties, school districts, special districts) with IDs linked to places. | Phase 2 |
| 4 | **Site Finder** | Step 1: Google Places lookup for every city lacking a website. Validates `.gov`/official domain. | Phase 3 |
| 5 | **Council Scrapers (×50, one per state)** | Steps 2-3 for their state's cities, biggest population first. Output: `council/<ST>/batch_N.json` in the existing schema. | Phase 3 |
| 6 | **Election Agent** | Per state: Secretary of State / election board candidate filings and election calendars, plus FEC (federal) and OpenStates (state legislature). Municipal races from city clerk pages found by agent 5. | Phase 4 |
| 7 | **Agency Agent** | For each city: police, fire, library, parks, utilities, school district, county seat. Pulls from the city site map plus the Census list. | Phase 4 |
| 8 | **Verifier (independent)** | Re-checks a random 5% sample per state against a *different* source. Reports an accuracy %. Nothing counts as "done" until a state hits the threshold. | After each batch |

Why a separate Verifier: the scrapers can't grade their own work. This is the main defense against the "fabricated name" risk with LLM extraction.

---

## 5. Phases and exit gates

| Phase | Work | Done when |
|---|---|---|
| **0. Audit** (agent 1) | Scorecard of existing data. Dedupe, fix the 40 empty and 519 URL-less records. | Report published; known-bad rows fixed or flagged |
| **1. Activate** (agent 2) | Supabase live, all staged data loaded, **council members wired into the app** (new `/city/<state>/<slug>` pages + API), health check says `supabase`. | A search for e.g. "Cedar Rapids, IA" shows its real council members with a source link |
| **2. Fill the head** (agents 4, 5) | Remaining cities ≥10k pop (~1,100), then 2.5k-10k (~3,700). | ≥95% of cities ≥10k covered; Verifier ≥90% accurate |
| **3. Fill the tail** (agents 4, 5) | 12.6k places under 2.5k people + townships. Many have no website. Use county or state municipal-league pages and the clerk's Facebook/PDF only if no site. | Every incorporated place has at least **mayor + clerk**, with full council where published |
| **4. Elections + agencies** (agents 3, 6, 7) | Candidate filings, election dates, polling info per state; local agencies per city. | Each city page shows next election date + local agencies |
| **5. Keep it fresh** | Weekly job using the existing `scripts/data-agent` + `weekly_update.py`; re-verify any council page whose hash changed. Elections get extra runs Aug-Nov. | Freshness date visible on each page |

Realistic scale: ~17,500 cities left. At 50 parallel workers and Firecrawl rate limits that's a matter of days of compute, not weeks. **Cost and API quotas will be the limiter, not time.**

---

## 6. What I need from you (the blockers)

I can't get past these on my own:

1. **Supabase access.** `DATABASE_URL` (or the service-role key) for project `zuhacughnenhongixfre`, plus you pasting `001_multitenant_ddl.sql` in the SQL editor if it hasn't been run. I can't confirm whether it was.
2. **Google Places API key** (Google Cloud, billing on). Set a **hard budget cap** (e.g. $300) in the console.
3. **Firecrawl credits.** Each page is ~1 credit; expect ~3-6 pages per city, roughly 60-100k credits for the full run. Check your plan.
4. **Free keys:** FEC (`api.data.gov`), OpenStates, Census (optional). Add them as environment secrets in this environment's settings, not in chat.
5. **Scope decision:** Tier A + B + counties + school districts now, special districts later. OK?

---

## 7. Risks I'm designing around

- **Accuracy is the product.** Officials change after elections. Every record carries `source_url`, `scraped_at` and a `verification` level. UI shows "last verified" dates. No source = not published.
- **Terms of service.** No Google Maps page scraping (use the API). The repo already has Ballotpedia and BallotReady Playwright scrapers; those sites restrict scraping, so I'd move that work to official state/FEC/OpenStates sources and tell you before using them at scale.
- **Nonpartisan rule** (from `AGENTS.md`): party only when an official source states it. No endorsements.
- **Beginner-friendly operation:** everything runs through a single command per phase, writes a plain-English report, and never publishes without passing the gate.

---

## 8. Proposed first move (nothing risky, no spend)

Start **Phase 0 and the code half of Phase 1** now, with no new keys needed:
1. QA Auditor scorecard on the 13.4k members and API.
2. Write the missing places loader and the council-members loader; add council data to the app's seed so cities beyond Chicago show up even before Supabase is live.
3. Run a **25-city pilot** of the scrape pipeline through Firecrawl to measure real accuracy, credits per city and time per city, so the big run's cost is a measured number and not a guess.
