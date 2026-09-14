# CivicPie

Hyperlocal civic engagement platform — nonpartisan civic information. Location-first UX: an address resolves to its districts, officials, candidates, and agencies.

**Strictly nonpartisan.** CivicPie carries no partisan organizing, voter lists, canvassing data, or party branding. (Leni 48dash and your48.com are separate sibling properties.)

## Quickstart

```bash
npm install
npm run seed        # copies staged JSON from ~/workspace/civicpie-data → data/seed/
npm run dev         # or: npm run build && npm start
```

Without `DATABASE_URL` the API serves the bundled seed snapshot in `data/seed/` (11.7 MB, committed to the repo so Vercel works out of the box). Set `DATABASE_URL` to a Supabase Postgres connection string and the same API reads the live database instead — no code change.

## API

All endpoints return `{ ok, meta: { source: "supabase" | "seed" }, … }` so callers always know which data they're reading.

| Endpoint | Description |
|---|---|
| `GET /api/health` | Liveness + table counts + active `source` |
| `GET /api/lookup?address=…` | Census geocode → ward district → officials for that district |
| `GET /api/districts?type=&city=&state=` | Filter districts (101 seeded: 50 Chicago wards + 51 state districts) |
| `GET /api/districts/[id]` | One district with officials, `official_count`, `candidate_count` |
| `GET /api/officials?district_id=&office=&level=&q=&limit=` | Search officials; pages capped at 200 rows, `total` reports the full match count |
| `GET /api/candidates?district_id=&office=&limit=` | Candidates; same paging contract |
| `GET /api/agencies?level=` | Government agencies |

Examples:

```bash
curl "http://localhost:3000/api/health"
curl "http://localhost:3000/api/lookup?address=6007%20N%20Sheridan%20Rd%2C%20Chicago%2C%20IL"
curl "http://localhost:3000/api/officials?level=federal&limit=1000"   # 200-row page, total=556
curl "http://localhost:3000/api/districts?type=ward&city=Chicago&state=IL"
```

## Data layer (`src/lib/civic/`)

- `db.ts` — dual-mode access. Supabase via `pg` when `DATABASE_URL` is set (PostGIS `ST_Contains` for ward lookup); otherwise the seed JSON.
- `seed.ts` — loads `data/seed/*.json` once per process.
- `geo.ts` — Census geocoder (no key) + point-in-polygon ward assignment for seed mode.
- `offices.ts` — office-id → title/level mapping (kept in code because the current ingest doesn't populate the `offices` table).
- `types.ts` — public API shapes.

## Scripts

| Script | Purpose |
|---|---|
| `npm run seed` | Refresh `data/seed/` from `~/workspace/civicpie-data` staged JSON |
| `npm run test:api` | 22-assertion QA harness: builds a server, checks real counts, real Census lookup, pagination, error codes |
| `npm run build` | `next build && node scripts/postbuild.mjs` |

## Deployment notes

- **Server mode.** `next.config.js` no longer uses `output: 'export'` — API routes and middleware require a dynamic app. Vercel serves this as a serverless Next.js app. `scripts/postbuild.mjs` no-ops in server mode.
- **Staged routes.** `src/api-routes/` holds pre-existing staged handlers (geocode/search/ward) that are not wired into the app; the live backend is `src/app/api/`. Leave the staged ones alone unless consolidating deliberately.
- **Frontend** still reads its static JSON from `public/data/` (ward pilot pages, district pages, dashboard, auth shells) — untouched by the backend work.

## Supabase flip checklist

1. Add the session-pooler connection string as `DATABASE_URL` (Vercel env / `.env`).
2. Load the schema from `~/workspace/civicpie-data/migrations/001_civicpie_master_schema.sql`, then run its `ingest.py`.
3. **Known upstream blocker:** the migration defines FKs from `officials`/`candidates` to `sources` and `offices`, but `ingest.py` never inserts into those two tables — a fresh load will fail FK checks until they're seeded first. Backend seed mode is unaffected.
4. The API switches automatically once `DATABASE_URL` is present (`/api/health` will report `"source": "supabase"`).
