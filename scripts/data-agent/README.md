# CivicPie Data Agent — operator guide

Scraper framework that builds CivicPie's information backend (officials,
districts, meetings, elections) from official public sources. Output lands
in **staging only**; a human reviews before anything touches production
(`data/seed/`). Full spec: `PRD.md`.

Free, neutral, strictly nonpartisan. No fabrication, ever — official
records only, no editorial content, no campaign material, no endorsements.
Party affiliation only where an official source states it.

## Layout

```
scripts/data-agent/
├── sources.yaml      # source registry (priority order)
├── fetcher.py        # polite HTTP: robots, rate limit, cache, backoff
├── pipeline.py       # fetch → parse → normalize → dedupe → stage
├── staging.py        # staging/ store: records.jsonl, review_queue.jsonl, promotions.log
├── review.py         # CLI: review the staging queue (read-only)
├── promote.py        # CLI: ONLY writer into data/seed/ (needs --approve)
├── run.py            # weekly entry point: run.py --weekly [--dry-run]
├── adapters/         # per-source adapters (separate workstream; may be empty)
├── .cache/          # HTTP cache, 7-day TTL (gitignored)
├── staging/         # staging data (gitignored)
└── tests/test_framework.py   # QA suite: python3 scripts/data-agent/tests/test_framework.py
```

## Adding a source

1. Add one entry to `sources.yaml` (fields: `id`, `name`, `base_url`,
   `cadence`, `adapter`, `rate_limit_rps`, `respect_robots`, `auth_env`,
   `enabled`).
2. Add `adapters/<adapter>.py` implementing the contract below.
3. No pipeline rewrites — the pipeline discovers the adapter by file name.

### Adapter contract

```python
URLS = ["https://example.org/directory"]   # or: def get_urls(ctx) -> list[str]

def parse(payload: dict, ctx: dict) -> list[dict]:
    """payload: {"url","status","headers","body","from_cache","fetched_at"}
    ctx: {"source": <sources.yaml entry>, "fetched_at": <iso UTC>}
    Return record dicts matching the PRD §3 schema."""
```

### Record schema (all adapters MUST emit this)

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
  "source_url": "https://…",
  "scraped_at": "2026-09-18T20:00:00Z",
  "conflicts": []
}
```

* `source_key` must be **stable across runs** — it is the dedupe key.
* `source_url` + `scraped_at` are **mandatory provenance**; records missing
  them are rejected.
* `conflicts`: `[{field, ours, theirs, reason}]` — conflicts go to the review
  queue, never auto-resolved.

## Weekly run

Cron `civicpie-data-agent-weekly` runs Sundays 6:00 AM America/Chicago:

```
cd ~/workspace/CivicPie && python3 scripts/data-agent/run.py --weekly
```

Manual: `python3 scripts/data-agent/run.py --weekly [--dry-run] [--source <id>]`.
`--dry-run` fetches/parses/normalizes but writes nothing to staging.

Each run writes a report to
`~/workspace/goals/civicpie-meetings-calendar-weekly-scrape/hidden_files/data-agent-runs/YYYY-MM-DD.{md,json}`
(sources hit, new/changed/flagged counts, errors, duration).

Existing meetings-goal snapshots (`~/workspace/civicpie-data/data/meetings/`)
are **consumed, not re-scraped** — the run reports their count/freshness; the
meetings adapter turns them into records.

## Review workflow

1. `python3 scripts/data-agent/review.py --summary [--source <id>] [--limit N]`
   (also: `python3 -m scripts.data-agent.review --summary`) prints:
   * **new** — staged records awaiting review
   * **changed** — same `source_key`, new content (field-level diffs shown)
   * **conflicted** — fuzzy name+district matches needing human judgment
2. Investigate against the official source. Photos go to staging; Leni's
   photo (and any official photo) is promoted only after Patrick approves.
3. Promote approved keys:

```
python3 scripts/data-agent/promote.py --approve <source_key> [<source_key> ...]
```

Rules: **no `--approve` → hard refusal** (exit 2, nothing written). Keys with
unresolved review-queue entries are skipped unless `--force`. Promoted records
merge into `data/seed/data-agent-promoted.json` (deduped by `source_key`) and
are removed from the staging queue. Every invocation — including refusals —
is appended to `staging/promotions.log`.

App wiring note: `data/seed/data-agent-promoted.json` is not yet read by
`src/lib/civic/seed.ts`; adding it to `loadSeed()` is a separate,
human-approved site change.

## Schedule & keys

* Weekly cron: `civicpie-data-agent-weekly`, Sundays 06:00 America/Chicago.
* `FEC_API_KEY` / `OPENSTATES_API_KEY` come from the environment; sources are
  skipped gracefully when unset. **Never print or commit secrets.**

## QA

```
python3 scripts/data-agent/tests/test_framework.py
```

Covers: robots.txt allow/block, 7-day cache + TTL expiry, 429→backoff→retry,
HTML stripping, date→ISO normalization, schema validation (incl. mandatory
provenance), exact + fuzzy dedupe, review-queue conflict capture,
`review.py --summary` output, `promote.py` refusal without `--approve`,
approve-path promotion + audit log, and an end-to-end `run_source` against a
local fixture server with a fake adapter.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `adapter unavailable` in run report | `adapters/<name>.py` missing — adapter workstream hasn't landed it yet |
| `blocked by robots.txt` | source disallows the path; check the site's robots.txt, pick an allowed endpoint |
| `skipped (missing FEC_API_KEY)` | expected without the key; export it to enable |
| `skipped (disabled)` | `enabled: false` in sources.yaml (e.g. North Liberty until feed URL confirmed) |
| stale data | delete `scripts/data-agent/.cache/` to force refetch |
| `promote.py` refuses | pass explicit `--approve <source_key> [...]`; unreviewed staging never ships |
| review entry won't promote | resolve the conflict first, or re-run with `--force` (logged) |
