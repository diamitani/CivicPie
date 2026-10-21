import fs from 'node:fs';
import path from 'node:path';
import type { MetadataRoute } from 'next';

const BASE_URL = 'https://civicpie.com';

// Core routes plus every real district page (wards, cities, states,
// county, federal). District URLs are derived from the same data the site
// serves, so the sitemap can never list a page that doesn't exist.
const coreRoutes: { path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }[] = [
  { path: '/', changeFrequency: 'daily', priority: 1 },
  { path: '/coverage', changeFrequency: 'daily', priority: 0.9 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/explore', changeFrequency: 'daily', priority: 0.8 },
  { path: '/officials', changeFrequency: 'daily', priority: 0.7 },
  { path: '/elections', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/meetings', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/events', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/services', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/resources', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
];

const STATE_SLUGS = [
  'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
  'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
  'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine',
  'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi',
  'missouri', 'montana', 'nebraska', 'nevada', 'new-hampshire', 'new-jersey',
  'new-mexico', 'new-york', 'north-carolina', 'north-dakota', 'ohio',
  'oklahoma', 'oregon', 'pennsylvania', 'rhode-island', 'south-carolina',
  'south-dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia',
  'washington', 'west-virginia', 'wisconsin', 'wyoming', 'district-of-columbia',
];

function citySlugs(): string[] {
  const slugs = new Set<string>();
  const cwd = process.cwd();
  try {
    const curated = JSON.parse(
      fs.readFileSync(path.join(cwd, 'public', 'data', 'cities.json'), 'utf8')
    );
    for (const c of curated) if (c?.id) slugs.add(String(c.id));
  } catch { /* optional */ }
  try {
    const districts = JSON.parse(
      fs.readFileSync(path.join(cwd, 'data', 'seed', 'city_districts.json'), 'utf8')
    );
    for (const d of districts) {
      const did = String(d?.district_id || '');
      if (did.endsWith('-city')) slugs.add(did.replace(/-city$/, ''));
    }
  } catch { /* optional */ }
  return [...slugs];
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = coreRoutes.map((r) => ({
    url: `${BASE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
  const add = (path: string, priority: number) =>
    entries.push({ url: `${BASE_URL}${path}`, lastModified: now, changeFrequency: 'weekly', priority });

  for (let n = 1; n <= 50; n++) add(`/ward/chicago-${n}`, 0.7);
  for (const slug of citySlugs()) add(`/city/${slug}`, 0.5);
  for (const s of STATE_SLUGS) add(`/state/${s}`, 0.6);
  add('/county/cook', 0.6);
  add('/federal/us', 0.6);
  return entries;
}
