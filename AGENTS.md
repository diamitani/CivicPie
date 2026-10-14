# CivicPie — Project Conventions

## Architecture
- Next.js 15 App Router, TypeScript, Tailwind CSS v4
- Static JSON data in `public/data/` (691KB master database)
- Vercel deployment
- Design system in DESIGN.md — always read before visual changes

## Backend (built, 2026-09-14 — branch `backend/master-db-api`)
- Live API routes in `src/app/api/`: health, lookup (address → ward → officials), districts, districts/[id], officials, candidates, agencies
- Data layer in `src/lib/civic/db.ts`: Supabase Postgres via `DATABASE_URL`, explicit bundled-seed fallback (`data/seed/`, committed). Every response carries `meta.source: "supabase" | "seed"`.
- Server mode: `output: 'export'` removed from next.config.js (API routes + middleware need it); `scripts/postbuild.mjs` no-ops without an `out/` dir
- Staged (not live) handlers remain in `src/api-routes/` — do not confuse with `src/app/api/`
- `npm run seed` refreshes `data/seed/` from ~/workspace/civicpie-data; `npm run test:api` runs the 22-assertion QA harness

## Key principles
- Location-first UX: address/zip/neighborhood is the primary interaction
- All data is static JSON until API is built — no runtime dependencies
- Dark theme only (civic authority, not consumer app)
- Components are self-contained, data is loaded client-side from public/data/

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
