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
}

const SEED_DIR = path.join(process.cwd(), 'data', 'seed');

function readJson(name: string): any[] {
  const p = path.join(SEED_DIR, name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
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
  ];
  const candidates = readJson('xlsx_candidates.json');
  const districts = [...readJson('chicago_districts.json'), ...readJson('state_districts.json')];
  const agencies = readJson('executive_agencies.json');
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

  const data: SeedData = { officials, candidates, districts, agencies, contacts, terms, wards };
  g.__civicpie_seed = data;
  return data;
}
