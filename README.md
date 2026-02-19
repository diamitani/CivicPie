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
