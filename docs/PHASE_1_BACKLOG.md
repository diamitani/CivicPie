# Phase 1 Backlog

Last updated: April 8, 2026

## Track A: Stabilization

- Replace placeholder election data with either verified data or a temporary unavailable state
- Wire `frontend/src/components/chat/CivicChat.tsx` to `frontend/src/app/api/chat/route.ts`
- Remove or downgrade claims about voting records, live updates, alerts, and meetings until they are real
- Add build, typecheck, and lint to CI

## Track B: Data platform

- Create Supabase project
- Add local env vars for Supabase URL, anon key, service role key, and app URL
- Create schema for jurisdictions, officials, offices, meetings, elections, candidates, sources, snapshots, diffs, and subscriptions
- Add migration workflow to the repo

## Track C: Source ingestion

- Build source registry for all 50 ward pages and official ward sites
- Add parser adapters for:
  - Chicago Data Portal
  - Chicago ward detail pages
  - Ward websites
  - Chicago elections pages
  - City Clerk legislative and meeting pages
- Add Playwright fallback for JS-heavy pages only

## Track D: Reconciliation

- Add raw snapshot storage
- Add normalized tables
- Add diff engine for changed records
- Add confidence scoring rules
- Add admin review queue for high-risk changes

## Track E: User onboarding

- Signup and login
- Address or ward selection
- Topic preferences
- Digest frequency preferences

## Track F: Notifications

- Build digest composer
- Add daily, weekly, monthly schedule runners
- Add event-triggered notification rules for:
  - Newly announced meetings
  - Candidate filing changes
  - Election date changes
  - Volunteer opportunity additions

## Launch blockers

- Build must pass in production
- Elections page must stop using placeholder candidate records
- Demographics file must not ship fake zero values as facts
- Chat must not fabricate meeting dates or voting records
