# CivicPie - Project Summary

## Overview
CivicPie is a beautiful, AI-powered civic engagement platform designed to connect Chicago residents with their local government. Built with a focus on simplicity and accessibility, it aggregates publicly available information about wards, aldermen, meetings, and civic processes.

## Architecture

### Frontend (Next.js 14 + TypeScript)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom civic-themed design system
- **Animations**: Framer Motion for smooth, polished interactions
- **Icons**: Lucide React

### Backend (Python + FastAPI)
- **API Framework**: FastAPI for high-performance async API
- **Web Scraping**: Scrapy spiders for collecting public data
- **AI Agent**: Custom CivicGuide agent for natural language civic assistance
- **Database**: PostgreSQL (planned) with Redis for caching

## Key Features

### 1. Ward Explorer
- Browse all 50 Chicago wards
- Detailed ward profiles with demographics
- Interactive map visualization (planned)
- Alderman information and contact details

### 2. CivicGuide AI Assistant
- Natural language questions about civic topics
- Instant answers about meetings, officials, and processes
- Context-aware responses based on user's ward
- Cited sources for all information

### 3. Meeting Calendar
- Upcoming ward meetings, committee hearings, and city council sessions
- Meeting details including time, location, and agendas
- Historical meeting archives

### 4. Alderman Profiles
- Comprehensive profiles for all 50 aldermen
- Contact information and office hours
- Committee assignments
- Voting records (planned)

### 5. Mobile-First Design
- Responsive design that works beautifully on all devices
- Glass morphism UI elements
- Smooth animations and transitions
- Accessible color contrast and typography

## Project Structure

```
CivicPie/
├── frontend/              # Next.js frontend application
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # Utility functions
│   │   └── types/        # TypeScript type definitions
│   ├── public/           # Static assets
│   └── package.json      # Frontend dependencies
│
├── backend/              # Python FastAPI backend
│   ├── main.py          # FastAPI application entry point
│   ├── scrapers/        # Scrapy spiders for data collection
│   ├── agents/          # AI agent implementations
│   └── requirements.txt # Python dependencies
│
├── shared/              # Shared resources
│   └── data/           # Data models and schemas
│
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore rules
└── README.md           # Project documentation
```

## Pages

1. **Home (/)** - Landing page with hero, features, ward preview, and AI chat demo
2. **Wards (/wards)** - Browse all 50 wards with search and filter
3. **Ward Detail (/wards/[id])** - Detailed ward page with tabs for overview, meetings, budget, and contact
4. **Aldermen (/aldermen)** - List of all aldermen with search
5. **Meetings (/meetings)** - Calendar of upcoming and past meetings
6. **Chat (/chat)** - Full-screen CivicGuide AI assistant

## Design Philosophy

- **Simplicity**: Complex civic information presented simply
- **Beauty**: Modern, polished UI that respects users
- **Accessibility**: Works for everyone, regardless of technical ability
- **Transparency**: All data sourced from public records with clear attribution
- **Empowerment**: Helps citizens understand and engage with their government

## Data Sources

All data is sourced from publicly available government resources:
- Chicago City Council official website
- Individual aldermanic websites
- Chicago Data Portal
- Chicago Board of Elections
- City Clerk's office

## Future Enhancements

- Interactive ward map with Mapbox
- Real-time meeting streaming integration
- Email alerts for meetings and votes
- Mobile app (React Native)
- Multi-city support
- Machine learning for issue categorization
- Public comment submission tools
- Budget visualization tools

## Getting Started

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### Environment Variables
Copy `.env.example` to `.env` and configure:
- Database connection
- API keys for AI services
- Mapbox token for maps

## Deployment

- **Frontend**: Vercel (optimized for Next.js)
- **Backend**: Railway, Render, or AWS
- **Database**: PostgreSQL on Railway or AWS RDS
- **Scraping**: Scheduled via GitHub Actions or AWS Lambda

## License

All code is open source. Data is sourced from public records and remains public domain.

## Contributing

This platform is built for the public good. Contributions welcome!

---

Built with ❤️ for Chicago
