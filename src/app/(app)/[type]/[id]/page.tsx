import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import DistrictPageClient from './DistrictPageClient';

const KNOWN_DISTRICTS: { type: 'ward' | 'city' | 'county' | 'state' | 'federal'; ids: string[] }[] = [
  { type: 'ward', ids: ['chicago-48'] },
  { type: 'city', ids: ['chicago', 'new-york', 'los-angeles', 'houston', 'phoenix', 'philadelphia',
    'san-antonio', 'san-diego', 'dallas', 'austin', 'jacksonville', 'fort-worth', 'columbus',
    'charlotte', 'indianapolis', 'san-francisco', 'seattle', 'denver', 'nashville', 'washington-dc',
    'el-paso', 'boston', 'portland', 'las-vegas', 'detroit', 'memphis', 'louisville', 'baltimore',
    'milwaukee', 'albuquerque', 'tucson', 'fresno', 'sacramento', 'atlanta', 'kansas-city',
    'omaha', 'miami', 'minneapolis', 'tulsa', 'tampa', 'new-orleans', 'cleveland', 'honolulu',
    'cincinnati', 'orlando', 'pittsburgh', 'st-louis', 'anchorage', 'lincoln', 'north-liberty'] },
  { type: 'county', ids: ['cook'] },
  { type: 'state', ids: ['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
    'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana',
    'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
    'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new-hampshire',
    'new-jersey', 'new-mexico', 'new-york', 'north-carolina', 'north-dakota', 'ohio', 'oklahoma',
    'oregon', 'pennsylvania', 'rhode-island', 'south-carolina', 'south-dakota', 'tennessee',
    'texas', 'utah', 'vermont', 'virginia', 'washington', 'west-virginia', 'wisconsin', 'wyoming',
    'district-of-columbia'] },
  { type: 'federal', ids: ['us'] },
];

export function generateStaticParams() {
  const params: { type: string; id: string }[] = [];
  for (const group of KNOWN_DISTRICTS) {
    for (const id of group.ids) {
      params.push({ type: group.type, id });
    }
  }
  return params;
}

// ─── Existence validation ────────────────────────────────────────────────
// This page used to render a 200 shell for ANY type/id, so /ward/chicago-99
// or /city/does-not-exist returned an empty "coming soon" page instead of a
// 404 — a soft-404 that wastes crawl budget and confuses visitors who
// mistype a link. Validate against the real data on the server and 404
// anything that doesn't exist. Fails OPEN (renders) if the data files can't
// be read, so a packaging issue can never take real pages down.
let citySlugsCache: Set<string> | null = null;
function validCitySlugs(): Set<string> {
  if (citySlugsCache) return citySlugsCache;
  const slugs = new Set<string>();
  const cwd = process.cwd();
  try {
    const curated = JSON.parse(
      fs.readFileSync(path.join(cwd, 'public', 'data', 'cities.json'), 'utf8')
    );
    for (const c of curated) if (c?.id) slugs.add(String(c.id));
  } catch { /* curated list optional */ }
  try {
    const districts = JSON.parse(
      fs.readFileSync(path.join(cwd, 'data', 'seed', 'city_districts.json'), 'utf8')
    );
    for (const d of districts) {
      const did = String(d?.district_id || '');
      if (did.endsWith('-city')) slugs.add(did.replace(/-city$/, ''));
    }
  } catch { /* seed optional */ }
  citySlugsCache = slugs;
  return slugs;
}

const STATE_SLUGS = new Set(
  KNOWN_DISTRICTS.find((g) => g.type === 'state')!.ids
);

function districtExists(type: string, id: string): boolean {
  switch (type) {
    case 'ward': {
      const m = id.match(/^chicago-(\d{1,2})$/);
      return !!m && Number(m[1]) >= 1 && Number(m[1]) <= 50;
    }
    case 'city': {
      const slugs = validCitySlugs();
      return slugs.size === 0 ? true : slugs.has(id);
    }
    case 'state':
      return STATE_SLUGS.has(id);
    case 'county':
      return id === 'cook';
    case 'federal':
      return id === 'us';
    default:
      return false;
  }
}

export default async function DistrictPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (!districtExists(type, id)) notFound();
  return <DistrictPageClient />;
}
