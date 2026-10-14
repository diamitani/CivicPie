# CivicPie - Chicago Civic Engagement Platform

A beautiful, AI-powered civic engagement platform connecting Chicago residents with their local government.

## Vision

Empower citizens with clear, accessible information about their wards, aldermen, and local government through:
- Beautiful, intuitive design
- AI-powered assistance
- Aggregated public information
- Neighborhood-by-neighborhood focus

## Architecture

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Python/FastAPI for scraping and AI agents
- **Database**: PostgreSQL with vector embeddings for AI
- **AI**: OpenAI/Claude for civic assistance agent
- **Scraping**: Python/scrapy for public data aggregation

## Features

- Ward explorer with interactive map
- Alderman profiles with aggregated information
- AI civic assistant ("CivicGuide")
- Meeting calendars and agendas
- Election information tracker
- Public comment submission tools
- Mobile-first responsive design

## Getting Started

```bash
# Frontend
npm install
npm run dev

# Backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

## Data Sources

All data is sourced from publicly available government websites:
- Chicago City Council website
- Individual aldermanic websites
- Chicago Board of Elections
- City of Chicago data portal

## Elected-officials database (backend)

```bash
pip install -r backend/requirements.txt
alembic upgrade head                          # create schema (SQLite by default; set DATABASE_URL for Postgres)
python -m backend.ingestion.cli seed          # fill from every keyless source (see below)
python -m backend.ingestion.cli enrich-wikipedia      # bios + photos (exact Wikipedia titles only)
uvicorn backend.main:app --reload             # API at /docs
```

`seed` loads: President/VP, 50 governors + 50 attorneys general, Congress (~539),
active Article III judges (~850, via the Federal Judicial Center), ~3,200 county
jurisdictions (Census) and ~470 federal agencies (Federal Register).

Needs an API key (not run by `seed`):

| Command | Env var | Notes |
|---|---|---|
| `run openstates` | `OPENSTATES_API_KEY` | ~7,400 state legislators |
| `run google_civic --address ...` | `GOOGLE_CIVIC_API_KEY` | address-keyed cross-reference |
| `enrich-places --limit N` | `GOOGLE_MAPS_API_KEY` | county office address/phone/website; **billed per request** |

Read endpoints: `/api/stats`, `/api/officials`, `/api/officials/{id}`, `/api/jurisdictions`, `/api/agencies`.
