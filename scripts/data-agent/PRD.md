# CivicPie Data Agent — PRD

**Date:** 2026-09-18 · **Requested by:** Patrick · **Constraint:** free, neutral, strictly nonpartisan. No fabrication, ever.

## 1. Objective
A scraper agent that builds out CivicPie's information backend (officials directory, districts, meetings, elections) from official public sources. Output lands in **staging only**; a human reviews before anything touches production data (`data/seed/`).

## 2. Why repo-side + Rostr-registered
The worker code lives in the CivicPie repo at `scripts/data-agent/` because the existing scrapers, the data schema, and the cron infrastructure all live there, and Rostr's tool policy denies `shell:exec` — Rostr is the orchestration/invocation layer, not the HTTP fetcher. A `civicpie-data-agent` skill is registered in `~/workspace/your_files/rostr-core/skills/` so the runtime can invoke it (`python3 scripts/data-agent/run.py`) via manifest.

## 3. Record schema (all adapters MUST emit this)
```json
{
  "record_type": "official | meeting | district | committee",
  "office_id": "chi-alderman",
  "district_id": "il-chicago-ward-48",
  "full_name": "Leni Manaa-Hoppenworth",
  "first_name": "Leni", "last_name": "Manaa-Hoppenworth",
  "party": null,
  "is_incumbent": true,
  "term_start": null, "term_end": null,
  "contact": {"email": null, "phone": null, "website": null},
  "external_ids": {"photo_url": null},
  "source_id": "chicago-council-official",
  "source_key": "chicago-council-official:alderman:48",
  "source_url": "https://www.chicago.gov/city/en/depts/mayor/supp_info/city_council.html",
  "scraped_at": "2026-09-18T20:00:00Z",
  "conflicts": []
}
```
- `source_key` must be stable across runs (for dedupe).
- `source_url` + `scraped_at` are mandatory provenance.
- `conflicts`: array of `{field, ours, theirs, reason}` — conflicts go to the review queue, never auto-resolved.

## 4. Source registry (`sources.yaml`) — priority order
| # | Source | What it feeds | Auth |
|---|--------|---------------|------|
| 1 | Chicago City Council official site (chicago.gov) | 50 aldermen: names, wards, photos, contact, committees | none |
| 2 | IL State Board of Elections (elections.il.gov) | election dates, offices on ballot | none |
| 3 | North Liberty CivicClerk | meetings/agendas | none — **adapter stubbed until Patrick confirms feed URL** |
| 4 | FEC API | federal candidates/committees | `FEC_API_KEY` — **skipped without key** |
| 5 | OpenStates API | state legislators | `OPENSTATES_API_KEY` — **skipped without key** |
| 6 | Census | population/geography refresh | none |
| — | Existing meetings goal snapshots (`~/workspace/civicpie-data/data/meetings/`) | meetings input — **consume, don't re-scrape** (complements, not duplicates) |

Adding a source = one `sources.yaml` entry + one adapter file. No pipeline rewrites.

## 5. Pipeline stages
`fetch` (polite: robots.txt respected, rate-limited, cached, backoff on 429/5xx)
→ `parse` (per-source adapter → schema records)
→ `normalize` (names, dates, office IDs; strip HTML)
→ `dedupe` (by `source_key` + fuzzy name/district match; matches → review queue)
→ `stage` (append to `staging/records.jsonl`; conflicts → `staging/review_queue.jsonl`)

## 6. Review gate (non-negotiable)
- `review.py` prints a queue summary: new / changed / conflicted records with diffs.
- `promote.py --approve <ids>` is the ONLY path into `data/seed/`. Unreviewed staging never ships.
- Weekly cron runs the pipeline and writes a run report to `~/workspace/goals/civicpie-meetings-calendar-weekly-scrape/hidden_files/data-agent-runs/`.

## 7. Nonpartisan & factual rules
Official records only. No editorial content, no campaign material, no endorsements. Party affiliation only where an official source states it. Photos go to staging; Leni's photo (and any official photo) is promoted only after Patrick approves.

## 8. Success criteria
- `run.py --dry-run` completes against all keyless sources with real fetched records.
- Each adapter QA'd against live source: sample parsed records shown.
- Staging holds records with full provenance; review queue catches a seeded conflict.
- Weekly cron registered; run report format verified.
- Operator README + Rostr skill registered. No secrets committed. No production data touched.
