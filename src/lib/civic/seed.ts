// Seed-data loader: reads the bundled JSON snapshot (copied by
// `npm run seed` from ~/workspace/civicpie-data) into memory once per process.
// This is the explicit fallback used when DATABASE_URL is not set — see db.ts.
//
// Seed JSON lives in <repo>/data/seed/ (NOT public/) so the ~9MB snapshot is
// never served as static assets or shipped to the client bundle.

import fs from 'node:fs';
import path from 'node:path';

export interface WardPoly {
  district_id: string;
  polygons: number[][][][]; // GeoJSON MultiPolygon coordinates ([lng, lat])
}

export interface SeedData {
  officials: any[];
  candidates: any[];
  districts: any[];
  agencies: any[];
  contacts: any[];
  terms: any[];
  wards: WardPoly[];
  meetings: any[];
}

const SEED_DIR = path.join(process.cwd(), 'data', 'seed');

function readJson(name: string): any[] {
  const p = path.join(SEED_DIR, name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Optional seed files (e.g. city-level coverage added after the master ingest).
// Missing files resolve to [] so older snapshots still load.
function readJsonOptional(name: string): any[] {
  try {
    return readJson(name);
  } catch {
    return [];
  }
}

export function seedDirExists(): boolean {
  return fs.existsSync(path.join(SEED_DIR, 'chicago_officials.json'));
}

export function loadSeed(): SeedData {
  const g = globalThis as unknown as { __civicpie_seed?: SeedData };
  if (g.__civicpie_seed) return g.__civicpie_seed;
  if (!seedDirExists()) {
    throw new Error(
      'data/seed/ is missing and DATABASE_URL is not set. Run `npm run seed` first.'
    );
  }

  const officials = [
    ...readJson('congress_officials.json'),
    ...readJson('executive_officials.json'),
    ...readJson('xlsx_officials.json'),
    ...readJson('chicago_officials.json'),
    ...readJsonOptional('city_officials.json'),
    ...readJsonOptional('territory_officials.json'),
  ];
  const candidates = readJson('xlsx_candidates.json');
  const districts = [
    ...readJson('chicago_districts.json'),
    ...readJson('state_districts.json'),
    ...readJsonOptional('city_districts.json'),
  ];
  // State agencies ship in the public-data shape (type / jurisdiction_abbr);
  // normalize them into the executive-agency shape so the API serves one
  // uniform agency record. 600 rows — without this the API only ever
  // served the 15 federal cabinet departments.
  const stateAgencies = readJsonOptional('state_agencies.json').map((r: any) => ({
    id: r.id || null,
    name: r.name,
    level: r.level || 'state',
    agency_type: r.type || r.agency_type || null,
    description: r.description || null,
    city: r.city || null,
    state_abbr: r.jurisdiction_abbr || r.state_abbr || null,
    source: 'public-data',
  }));
  const agencies = [...readJson('executive_agencies.json'), ...stateAgencies];
  const contacts = readJson('chicago_contacts.json');
  let terms: any[] = [];
  try {
    terms = readJson('congress_terms.json');
  } catch {
    terms = [];
  }

  const geo = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'chicago_wards_2023.geojson'), 'utf8'));
  const wards: WardPoly[] = geo.features.map((f: any) => ({
    district_id: `il-chicago-ward-${String(f.properties.ward).padStart(2, '0')}`,
    polygons: f.geometry.coordinates,
  }));

  const meetings = readJsonOptional('meetings.json');
  const data: SeedData = { officials, candidates, districts, agencies, contacts, terms, wards, meetings };
  g.__civicpie_seed = data;
  return data;
}
