import { CHICAGO_WARDS } from './ward-data'

export type SubscriptionTopicId =
  | 'voting'
  | 'candidates'
  | 'meetings'
  | 'volunteer'
  | 'community-news'
  | 'city-services'

export type DigestFrequencyId = 'daily' | 'weekly' | 'monthly' | 'event-driven'

export interface SubscriptionTopicOption {
  id: SubscriptionTopicId
  label: string
  description: string
}

export interface DigestFrequencyOption {
  id: DigestFrequencyId
  label: string
  description: string
}

export interface SourceCard {
  title: string
  description: string
  url: string
  category: string
}

export const SUBSCRIPTION_TOPICS: SubscriptionTopicOption[] = [
  { id: 'voting', label: 'Voting and registration', description: 'Registration deadlines, polling changes, and ballot reminders.' },
  { id: 'candidates', label: 'Candidates', description: 'Candidate filings, election notices, and municipal race updates.' },
  { id: 'meetings', label: 'Meetings', description: 'Ward meetings, hearings, agendas, and public comment opportunities.' },
  { id: 'volunteer', label: 'Volunteer opportunities', description: 'Community events, city programs, and neighborhood help opportunities.' },
  { id: 'community-news', label: 'Community news', description: 'Ward office announcements and neighborhood civic updates.' },
  { id: 'city-services', label: 'City services', description: '311, street issues, permits, safety updates, and service notices.' },
]

export const DIGEST_FREQUENCIES: DigestFrequencyOption[] = [
  { id: 'daily', label: 'Daily', description: 'A short morning civic brief for your area.' },
  { id: 'weekly', label: 'Weekly', description: 'A roundup of the most important ward and city items.' },
  { id: 'monthly', label: 'Monthly', description: 'A high-level community snapshot and planning brief.' },
  { id: 'event-driven', label: 'Event-driven', description: 'Immediate alerts when something important changes.' },
]

export const CITYWIDE_TRACKED_SOURCES: SourceCard[] = [
  {
    title: 'Chicago Board of Elections',
    description: 'Official election schedules, registration lookups, and polling information.',
    url: 'https://chicagoelections.gov/',
    category: 'Elections',
  },
  {
    title: 'Chicago City Clerk eLMS',
    description: 'Agendas, minutes, legislation, and city council records.',
    url: 'https://chicityclerkelms.chicago.gov/',
    category: 'Meetings',
  },
  {
    title: 'Chicago Data Portal',
    description: 'Open civic datasets including ward office contacts and demographics.',
    url: 'https://data.cityofchicago.org/',
    category: 'Open Data',
  },
  {
    title: 'Chicago 311',
    description: 'Official service requests and issue reporting for residents.',
    url: 'https://311.chicago.gov/',
    category: 'City Services',
  },
  {
    title: 'Mayor’s Office Volunteer Opportunities',
    description: 'Citywide public-service and volunteer entry points.',
    url: 'https://www.chicago.gov/city/en/depts/mayor/volunteer_opportunities.html',
    category: 'Volunteer',
  },
]

export const COMMUNITY_SIGNAL_TYPES = [
  {
    title: 'Ward office announcements',
    description: 'Newsletters, notices, neighborhood alerts, and office updates from official ward channels.',
  },
  {
    title: 'Meeting notices and agendas',
    description: 'City council sessions, committee hearings, ward meetings, and public participation links.',
  },
  {
    title: 'Election and candidate alerts',
    description: 'Registration reminders, filing notices, polling guidance, and municipal cycle updates.',
  },
  {
    title: 'Volunteer and community opportunities',
    description: 'Ways to show up locally through city programs and civic organizations.',
  },
]

export const DIGEST_PREVIEW = [
  {
    title: 'Morning civic brief',
    description: 'Top ward developments, citywide action items, and official links in one scan.',
  },
  {
    title: 'Election readiness reminders',
    description: 'Track voter registration, polling place updates, and filing announcements.',
  },
  {
    title: 'Community opportunities',
    description: 'Volunteer calls, local meetings, and neighborhood public-service events.',
  },
]

export const WARD_SOURCE_DIRECTORY = CHICAGO_WARDS.map((ward) => ({
  ward: ward.ward,
  alderperson: ward.alderperson,
  website: ward.website,
  email: ward.email,
  phone: ward.wardPhone,
  neighborhoods: ward.neighborhoods,
}))

export const CIVIC_COVERAGE_METRICS = {
  totalWards: CHICAGO_WARDS.length,
  wardSites: WARD_SOURCE_DIRECTORY.filter((ward) => Boolean(ward.website)).length,
  trackedCitySources: CITYWIDE_TRACKED_SOURCES.length,
  digestModes: DIGEST_FREQUENCIES.length,
}
