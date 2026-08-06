# Civic Pie Roadmap

Tagline: Civic Pie: Get a Piece of Gov.

Last updated: April 8, 2026

## Product goal

Civic Pie should become a trusted civic engagement product for Chicago residents that helps people:

- Sign up for updates in their area
- Track voting, candidates, meetings, and volunteer opportunities
- Subscribe to daily, weekly, monthly, or event-driven newsletters
- Ask a personal civic AI assistant questions about their ward and community
- Discover neighborhood-level civic news in a format that feels as useful and habit-forming as a community app, but grounded in public-interest information rather than gossip

## Definition of operational

The product is operational when all of the following are true:

- The site deploys cleanly on Vercel from the main frontend app
- Core data is stored in a production database, not hard-coded files
- Each public record shown in the UI has a source URL, scrape timestamp, and confidence level
- Weekly scrape and reconcile jobs run automatically
- Users can sign up, set their ward or address, choose update topics, and manage frequency preferences
- CivicGuide answers from verified structured data first and only falls back to model reasoning when necessary
- Editors can review flagged data conflicts before publication

## Current status

## What is working

- Strong visual shell and clear civic brand direction
- Good static ward directory foundation
- Useful city-services resource page
- Basic source-aware AI route exists

## What is blocking launch

- Elections data is placeholder and currently breaks the production build
- Chat UI is simulated in the client instead of using the API
- Demographics are materially inaccurate in the generated dataset
- Backend APIs are mostly placeholder responses
- No auth, signup, subscriptions, newsletter engine, or editor workflow
- No durable database or provenance model

## Product pillars

## 1. Trusted civic data

- Official roster data for wards, alderpeople, contact info, city hall offices
- Meeting data from ward sites, City Clerk sources, election pages, and public calendars
- Candidate and election information from official election sources
- Community action data such as volunteer opportunities, neighborhood meetings, hearings, and service alerts

## 2. Personalized subscriptions

- Signup with email and optional passwordless auth
- Address or ward selection
- Topic preferences:
  - Voting and elections
  - Candidates
  - Meetings
  - Volunteer opportunities
  - Community news
  - City services and alerts
- Frequency preferences:
  - Daily digest
  - Weekly digest
  - Monthly digest
  - Event-driven alerts

## 3. Personal civic AI

- Dedicated chat screen with resident profile context
- Ward-aware and neighborhood-aware retrieval
- Verified answer cards with source links
- Structured answer types:
  - Who represents me?
  - What is the next meeting?
  - How do I vote?
  - What volunteer opportunities are nearby?
  - What issues are active in my area?

## 4. Community engagement feed

- Neighborhood civic feed inspired by community apps, but limited to public-interest content
- Sources include:
  - Ward office announcements
  - Official meeting notices
  - Public hearing notices
  - Election updates
  - Volunteer opportunities
  - Community organization events
- No anonymous posting in phase 1
- User submissions, if added later, require moderation and source rules

## Recommended architecture

## Frontend

- Vercel-hosted Next.js app
- Public site plus logged-in member experience
- Dedicated chat screen for CivicGuide
- Subscription settings and digest archive pages

## Backend and data

- Supabase for Postgres, Auth, Row Level Security, scheduled functions metadata, and object storage
- Separate worker for scraping and reconciliation
- GitHub Actions for scheduled weekly scrape jobs at first
- Optional migration to a dedicated worker runtime later if Playwright volume grows

## Why not Azure or AWS first

- Vercel plus Supabase is the fastest route to a stable product
- Azure or AWS adds operational surface area before the core product is proven
- Move to Azure or AWS only if the scraping workload, compliance requirements, or analytics workload outgrow the starter stack

## Data strategy

## Source hierarchy

1. Official APIs and open-data portals
2. Official government HTML pages
3. Official ward and agency websites
4. Public PDFs and agenda attachments
5. Community organization sites only for volunteer and event discovery, clearly labeled as non-government sources

## Collection approach

- API first whenever possible
- Static HTML scraping second
- Playwright only for JavaScript-heavy pages or hidden calendars
- Per-jurisdiction adapters with a shared normalized schema

## Provenance requirements

Every published record should include:

- `source_url`
- `source_type`
- `scraped_at`
- `effective_date`
- `parser_version`
- `confidence_score`
- `last_reviewed_at`

## Reconcile workflow

1. Scrape fresh raw records
2. Normalize into shared tables
3. Compare against active published records
4. Auto-publish low-risk changes
5. Flag high-risk changes for review
6. Save every diff for auditability

## High-risk changes

- Officeholder name changes
- Election date changes
- Candidate roster changes
- Meeting cancellations
- Address or contact changes that remove a previously valid channel

## Core data model

## Identity tables

- `users`
- `profiles`
- `locations`
- `user_locations`

## Civic data tables

- `jurisdictions`
- `officials`
- `offices`
- `meetings`
- `elections`
- `candidates`
- `community_items`
- `volunteer_opportunities`
- `sources`
- `source_snapshots`
- `reconcile_runs`
- `reconcile_diffs`

## Subscription tables

- `subscription_topics`
- `user_topic_preferences`
- `digest_preferences`
- `notification_events`
- `digest_runs`
- `digest_items`

## AI support tables

- `content_chunks`
- `embeddings`
- `chat_sessions`
- `chat_messages`

## Phase plan

## Phase 0: Stabilize the current app

Target: April 8, 2026 to April 15, 2026

- Fix build-breaking election data
- Remove simulated chat behavior and route all chat through the API
- Remove misleading placeholder claims from the UI
- Mark non-live modules clearly until data is real
- Set up Vercel production project and environment variables

Exit criteria:

- `npm run build` passes
- Production preview deploy works
- No page claims live data that is not actually live

## Phase 1: Trusted Chicago core

Target: April 15, 2026 to May 10, 2026

- Stand up Supabase
- Move ward and official data into Postgres
- Build source registry and provenance model
- Create weekly ward and meeting scrape job
- Build admin review page for flagged changes
- Ship real ward pages backed by database records

Exit criteria:

- All 50 wards are served from the database
- Weekly sync runs automatically
- Editors can approve or reject flagged diffs

## Phase 2: Signup and subscriptions

Target: May 10, 2026 to June 7, 2026

- Add signup and login
- Add address or ward onboarding
- Add topic and frequency preferences
- Generate daily, weekly, monthly, and event-driven digests
- Build digest email templates and archive page

Exit criteria:

- A user can sign up, pick a ward, set topics, and receive a working digest

## Phase 3: Elections and candidates

Target: June 7, 2026 to July 5, 2026

- Build official elections ingestion pipeline
- Add candidate records with source provenance
- Create election timeline pages
- Add registration, polling, and ballot helper flows

Exit criteria:

- Election and candidate pages are sourced from official records
- Users can subscribe to election-only alerts for their area

## Phase 4: CivicGuide and community feed

Target: July 5, 2026 to August 9, 2026

- Launch personal civic chat screen
- Add retrieval over structured civic records plus curated content chunks
- Build neighborhood civic feed
- Add volunteer and community opportunity discovery

Exit criteria:

- Chat answers are source-backed and ward-aware
- Feed feels active and useful for at least 3 pilot wards

## MVP for first launch

The first public launch should include:

- Clean Vercel deployment
- Signup and onboarding
- Ward-aware dashboard
- Weekly and event-driven subscriptions
- Real meetings, official contacts, and election notices
- CivicGuide with source citations
- Community feed from official and vetted public-interest sources

The first launch should not include:

- Anonymous social posting
- User-to-user messaging
- Financial monetization complexity
- Multi-city expansion

## Accuracy standards

- No invented meetings, candidates, or vote records
- No placeholder data displayed as real
- Every user-facing civic record must be attributable to a source
- Any incomplete data should be labeled clearly as unavailable or pending verification

## Initial KPI set

- Signup conversion rate
- Percent of users who complete ward or address onboarding
- Email open rate by digest type
- Click-through rate on meetings, elections, and volunteer items
- Weekly active chat users
- Source-backed answer rate
- Reconcile conflict rate
- Median time to review flagged diffs

## Immediate next build sequence

1. Fix the production build and remove misleading placeholder behavior
2. Set up Supabase schema and migrations
3. Build source registry plus weekly scrape and reconcile jobs
4. Move ward data from files into database tables
5. Add auth, profile, ward, topic, and digest preferences
6. Build email digests and event-triggered notifications
7. Launch the personal CivicGuide screen with source-backed retrieval

