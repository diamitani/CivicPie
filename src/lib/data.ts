// Data loading utilities for CivicPie v1
// All data lives in public/data/ as static JSON files

export interface Official {
  id: string;
  name: string;
  title: string;
  level: string;
  party?: string;
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
    office?: string;
  };
  keyIssues?: string[];
  achievements?: string[];
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  location: string;
  category: string;
  description: string;
  link?: string;
  tags?: string[];
}

export interface Agency {
  id: string;
  name: string;
  type: string;
  level: string;
  description: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  services: string[];
}

export interface DirectoryEntry {
  id: string;
  name: string;
  category: string;
  address?: string;
  neighborhood?: string;
  website?: string;
  phone?: string;
}

export interface CivicGroup {
  id: string;
  name: string;
  type: string;
  focus: string;
  description: string;
  website?: string;
  tags: string[];
}

export interface DistrictMeta {
  id: string;
  name: string;
  city: string;
  state: string;
  alderman?: string;
  description: string;
  population: string;
  neighborhoods: string[];
  totalEntities: number;
  wardOffice?: {
    address: string;
    phone: string;
    email: string;
    website: string;
    hours: string;
  };
  participatoryBudgeting?: {
    totalBudget: string;
    winners2026: string[];
  };
}

export interface WardData {
  districtMeta: DistrictMeta;
  officials: Official[];
  events: Event[];
  agencies: Agency[];
  civicGroups: CivicGroup[];
  legislation: Array<{ id: string; title: string; status: string; link?: string }>;
  benefits: Array<{ id: string; name: string; description: string; eligibility: string; link?: string }>;
  communityHighlights: Array<{ id: string; title: string; description: string; image?: string }>;
  wardBusinesses: Array<{ id: string; name: string; type: string; address: string; website?: string }>;
  quickStats: Array<{ id: string; label: string; value: string; icon?: string }>;
}

export interface DirectoryData {
  [category: string]: DirectoryEntry[];
}

// Static data loaded from public/data/
let _wardData: WardData | null = null;
let _directoryData: DirectoryData | null = null;

export async function loadWardData(): Promise<WardData> {
  if (_wardData) return _wardData;
  const res = await fetch('/data/ward_data.json');
  _wardData = await res.json();
  return _wardData!;
}

export async function loadDirectoryData(): Promise<DirectoryData> {
  if (_directoryData) return _directoryData;
  const res = await fetch('/data/ward_directory.json');
  _directoryData = await res.json();
  return _directoryData!;
}

export async function loadStates(): Promise<any[]> {
  const res = await fetch('/data/states.json');
  return res.json();
}

export async function loadCities(): Promise<any[]> {
  const res = await fetch('/data/cities.json');
  return res.json();
}
