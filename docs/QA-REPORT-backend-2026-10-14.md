# Backend QA report — elected-officials backend + master data merge

**Date:** 2026-10-14 · **Scope:** full tree (`backend/`, `supabase/`, `data/master/`, API surface) · **Type:** pre-merge / pre-load QA
**Method:** `/jev-backend-qa` workflow. The skill's own tooling (`bin/backend_checks.py`, `agent/pal_verdict.py`, Jev gateway) was **not installed** in this environment (only SKILL.md), and no AI Gateway key was available, so:

> **Verdict: UNADJUDICATED** — deterministic checks are clean after fixes, but the Jev/PAL adjudication step did not run. Treat the results below as candidates verified by direct evidence, not as a calibrated PASS. Re-run `jev-qa` once the tool and gateway key are available.

## What was actually verified

| Area | Evidence | Result |
|---|---|---|
| Migrations on a real Postgres 16 | Applied `202604090001` + `202610140001` in order on a fresh DB, then re-applied the new one | Clean, idempotent |
| RLS | `pg_class.relrowsecurity` for all 12 `public` tables | 12/12 enabled; 9 public-read policies; PII + ops tables deny-by-default |
| Data load | `load-master` run twice into that Postgres | 1,489 officials / 3,773 districts / 473 agencies / 1,617 contacts; **0 duplicate `source_key`s** on re-run |
| Seed compatibility | Compared Congress `source_key`s with `data/seed/congress_officials.json` | 539/539 overlap → loading upserts, does not duplicate |
| App query shape | Ran the Next app's officials/contacts join (`db.ts`) against the loaded DB | Returns governors with `level=state` |
| API (browser) | Playwright **and** Selenium drove the live FastAPI app (`backend.qa.e2e_smoke`) | Both pass: OpenAPI lists routes, IL federal = 19, `limit=5000` rejected |
| Deterministic scan | `backend.qa.backend_checks` over the whole repo | 0 secrets; see findings below |
| Unit/integration tests | `pytest backend/tests` | 23 passing |

## Findings

**Blockers:** none.

**Warnings (fixed in this change)**
1. `community_subscriptions` (subscriber emails/addresses) and four other tables had **no RLS** in the initial migration. → `202610140001` enables RLS; subscriptions stay deny-by-default. Confirmed the only writer (`frontend/src/app/api/subscriptions/route.ts`) uses the service-role key, which bypasses RLS, so signup is unaffected.
2. FJC ingestor was validated only against an invented fixture; the real CSV differs. → rewritten against the real schema; live result is 9 justices / 179 appeals / 653 district / 9 CIT.

**Minors**
- 15 env vars read by code but absent from `.env.example` → added.
- 5 FastAPI GET routes have no auth (tripwire, `info`): **public by design** (read-only civic reference data). All list endpoints are bounded (`le=` limits) and tested (422 on over-limit).

## Open items — not fixed, your call

1. **Duplicate agencies.** Federal Register names ("Agriculture Department") differ from the seed's 15 cabinet departments ("Department of Agriculture"). Both will appear in `/api/agencies`. Needs a name-normalisation/merge rule.
2. **Two frontends in the tree.** Root `src/` (the app on `main`) and the older `frontend/` (+ `48th Ward/`, `shared/`, old `PROJECT_SUMMARY.md`) from this branch's history. Only root `src/` is the deployed Next app. Recommend deleting the legacy dirs after confirming nothing needs them — I did not delete anything.
3. **Seed-fallback mode doesn't see the new data.** Without `DATABASE_URL` the Next app serves `data/seed/*.json`. The new judges / governors / AGs / counties / 473 agencies appear only after `load-master` into Supabase.
4. **Not run against production.** No Supabase connection string or deploy URL was available. Migrations and loader were tested on local Postgres 16 (with `anon`/`authenticated` roles stubbed), not on your Supabase project. Apply with `supabase db push` and run `python -m backend.ingestion.cli load-master --dsn <SUPABASE_DB_URL>` yourself.
5. **Two schema definitions.** SQLAlchemy/Alembic (internal DB) and Supabase SQL (master) are kept aligned by `backend/ingestion/master.py`; changes to one need a matching change to the other. The upstream `civicpie-data/migrations/001_civicpie_master_schema.sql` referenced in `db.ts` is not in this repo — the new migration is `if not exists` so it won't clobber it, but column drift against that file is possible.
6. **Coverage gaps:** governors/AGs/judges have no bios (no Wikipedia IDs); judges have no state; Wikipedia enrichment is rate-limited and resumable.

## Re-verification log
- Scanner false positive (`table_without_rls` ×5) traced to the scanner reading only git-tracked files while the new migration was uncommitted → scanner now includes untracked files; re-run clean. Independently confirmed on Postgres (RLS true on all tables).
- Selenium initially failed (chromedriver 147 vs Chromium 141) → matched driver downloaded; both engines now pass.
- Playwright initially failed TLS to external sites → sandbox proxy CA imported into the NSS store (verification stays on).
