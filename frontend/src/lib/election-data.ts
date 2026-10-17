export interface ElectionResource {
  title: string
  description: string
  url: string
  category: string
}

export interface ElectionReadinessStep {
  title: string
  description: string
}

export const OFFICIAL_ELECTION_RESOURCES: ElectionResource[] = [
  {
    title: 'Chicago Board of Elections',
    description: 'Official source for registration lookups, polling places, and election notices.',
    url: 'https://chicagoelections.gov/',
    category: 'Official',
  },
  {
    title: 'Your Voter Information',
    description: 'Find your ward, polling place, and registration status.',
    url: 'https://chicagoelections.gov/your-voter-information',
    category: 'Registration',
  },
  {
    title: 'Ward Maps and Elected Officials',
    description: 'Look up ward maps and official district references.',
    url: 'https://chicagoelections.gov/districts-maps/ward-maps-electeds',
    category: 'Ward Lookup',
  },
  {
    title: 'Election Results',
    description: 'Official historical results and certified returns.',
    url: 'https://chicagoelections.gov/election-results',
    category: 'Results',
  },
]

export const ELECTION_READINESS_STEPS: ElectionReadinessStep[] = [
  {
    title: 'Confirm your ward and registration',
    description: 'Use the Board of Elections lookup first so every update is tailored to the correct district.',
  },
  {
    title: 'Track filing and ballot notices',
    description: 'Candidate and ballot information should come from official election publications, not speculation.',
  },
  {
    title: 'Watch for polling and schedule changes',
    description: 'Polling places, early voting, and election-day details can shift, so official verification matters.',
  },
  {
    title: 'Subscribe to event-driven alerts',
    description: 'Candidate filings, registration deadlines, and polling updates are the highest-value election triggers.',
  },
]

export const ELECTION_ALERT_TOPICS = [
  'Registration reminders',
  'Polling place changes',
  'Candidate filing notices',
  'Ward-specific election updates',
]
