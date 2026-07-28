# CivicPie — Project Conventions

## Architecture
- Next.js 15 App Router, TypeScript, Tailwind CSS v4
- Static JSON data in `public/data/` (691KB master database)
- Vercel deployment
- Design system in DESIGN.md — always read before visual changes

## Backend (planned)
- API routes in `src/app/api/` for geocoding, ward lookup, data serving
- Supabase for user accounts, saved locations, community posts
- Chicago Data Portal integration for live data refresh

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
