// Public API shapes for the CivicPie master-DB backend.

export type DataSource = 'supabase' | 'seed';

export interface Meta {
  source: DataSource;
}

export interface ContactPoint {
  kind: string; // phone | email | website | address | office_hours
  label: string | null;
  value: string;
  is_primary: boolean;
}

export interface Official {
  id: string;
  name: string;
  office: string; // office_id, e.g. 'chi-alderman'
  office_title: string;
  level: 'federal' | 'state' | 'local';
  district_id: string | null;
  party: string | null;
  term_start: string | null;
  term_end: string | null;
  incumbent: boolean;
  email: string | null;
  photo_url: string | null;
  contacts: ContactPoint[];
  source: string;
}

export interface District {
  district_id: string;
  district_type: string;
  district_name: string;
  district_number: string | null;
  city: string | null;
  state_abbr: string | null;
}

export interface DistrictDetail extends District {
  officials: Official[];
  official_count: number;
  candidate_count: number;
}

export interface Candidate {
  id: string;
  name: string;
  office: string;
  office_title: string;
  district_id: string | null;
  state_abbr: string | null;
  party: string | null;
  election_year: number | null;
  election_date: string | null;
  incumbent: boolean;
  source: string;
}

export interface Agency {
  id: string;
  name: string;
  level: string | null;
  agency_type: string | null;
  description: string | null;
  city: string | null;
  state_abbr: string | null;
  source: string;
}
