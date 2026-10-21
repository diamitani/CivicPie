// Build data/seed/zip_congressional.json from the U.S. Census Bureau's
// 2020 ZCTA -> 119th Congressional District relationship file.
//
//   node scripts/build-zip-congressional.mjs [path-to-tab20_cd11920_zcta520_natl.txt]
//
// With no argument the script downloads the file from census.gov.
// Method: for each ZCTA (ZIP), sum AREALAND_PART per congressional
// district and keep the plurality district; `s` is that district's share
// of the ZCTA's land area (s < 0.6 = the ZIP meaningfully spans districts).
// Output shape: { "60614": { "d": "us-house-il-05", "s": 0.98 }, ... }
// where `d` matches the district_id used by congress_officials.json
// (at-large and delegate districts use the "-al" suffix there).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const URL =
  'https://www2.census.gov/geo/docs/maps-data/data/rel2020/cd-sld/tab20_cd11920_zcta520_natl.txt';

const FIPS = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
  '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY', '60': 'AS', '66': 'GU', '69': 'MP',
  '72': 'PR', '78': 'VI',
};

async function loadText() {
  const arg = process.argv[2];
  if (arg) return fs.readFileSync(arg, 'utf8');
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`Census download failed: HTTP ${res.status}`);
  return res.text();
}

const text = await loadText();
const lines = text.replace(/^﻿/, '').split('\n');
const header = lines[0].split('|');
const iCd = header.indexOf('GEOID_CD119_20');
const iZip = header.indexOf('GEOID_ZCTA5_20');
const iLand = header.indexOf('AREALAND_PART');
const iWater = header.indexOf('AREAWATER_PART');
if (iCd < 0 || iZip < 0 || iLand < 0) throw new Error('unexpected Census file header');

// zip -> Map(cdDistrictId -> landArea), plus water fallback per cd
const byZip = new Map();
for (let i = 1; i < lines.length; i++) {
  const f = lines[i].split('|');
  const zip = f[iZip];
  const cd = f[iCd];
  if (!zip || !cd) continue;
  const fips = cd.slice(0, 2);
  const num = cd.slice(2);
  const abbr = FIPS[fips];
  if (!abbr) continue;
  // Census codes district-less water areas as "ZZ" — not a real district.
  if (!/^\d{2}$/.test(num)) continue;
  const suffix = num === '00' || num === '98' ? 'al' : num;
  const districtId = `us-house-${abbr.toLowerCase()}-${suffix}`;
  const area = Number(f[iLand]) || Number(f[iWater]) || 0;
  if (!byZip.has(zip)) byZip.set(zip, new Map());
  const m = byZip.get(zip);
  m.set(districtId, (m.get(districtId) || 0) + area);
}

const out = {};
let split = 0;
for (const [zip, m] of byZip) {
  let best = null;
  let bestArea = -1;
  let total = 0;
  for (const [d, a] of m) {
    total += a;
    if (a > bestArea) { bestArea = a; best = d; }
  }
  if (!best || total <= 0) continue;
  const share = Math.round((bestArea / total) * 1000) / 1000;
  if (share < 0.6) split++;
  out[zip] = { d: best, s: share };
}

const here = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(here, '..', 'data', 'seed', 'zip_congressional.json');
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`wrote ${dest}: ${Object.keys(out).length} ZIPs mapped, ${split} split (top share < 0.6)`);

// Validate against the officials seed: every mapped district should exist.
try {
  const officials = JSON.parse(
    fs.readFileSync(path.join(here, '..', 'data', 'seed', 'congress_officials.json'), 'utf8')
  );
  const known = new Set(officials.map((o) => o.district_id));
  const missing = [...new Set(Object.values(out).map((v) => v.d))].filter((d) => !known.has(d));
  console.log('districts in map:', new Set(Object.values(out).map((v) => v.d)).size,
    '| not in officials seed (vacant?):', missing.length ? missing.join(', ') : 'none');
} catch {
  console.log('officials validation skipped (seed not found)');
}
