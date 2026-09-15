// Copies staged master-DB JSON from ~/workspace/civicpie-data into data/seed/,
// making this repo self-contained (no dependency on the data workspace at runtime).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const SRC = join(process.env.HOME, 'workspace', 'civicpie-data');
const DEST = join(repoRoot, 'data', 'seed');

const FILES = [
  ['data/staged/congress_officials.json', 'congress_officials.json'],
  ['data/staged/congress_terms.json', 'congress_terms.json'],
  ['data/staged/executive_officials.json', 'executive_officials.json'],
  ['data/staged/executive_agencies.json', 'executive_agencies.json'],
  ['data/staged/xlsx_officials.json', 'xlsx_officials.json'],
  ['data/staged/xlsx_candidates.json', 'xlsx_candidates.json'],
  ['data/staged/chicago_officials.json', 'chicago_officials.json'],
  ['data/staged/chicago_districts.json', 'chicago_districts.json'],
  ['data/staged/state_districts.json', 'state_districts.json'],
  ['data/staged/city_districts.json', 'city_districts.json'],
  ['data/staged/city_officials.json', 'city_officials.json'],
  ['data/staged/chicago_contacts.json', 'chicago_contacts.json'],
  ['data/raw/chicago_wards_2023.geojson', 'chicago_wards_2023.geojson'],
];

if (!existsSync(SRC)) {
  console.error(`Source workspace not found: ${SRC}`);
  process.exit(1);
}
mkdirSync(DEST, { recursive: true });

let totalBytes = 0;
for (const [rel, name] of FILES) {
  const from = join(SRC, rel);
  const to = join(DEST, name);
  if (!existsSync(from)) {
    console.error(`MISSING: ${from}`);
    process.exit(1);
  }
  copyFileSync(from, to);
  const { size } = await import('node:fs').then((fs) => fs.statSync(to));
  totalBytes += size;
  console.log(`  ${name} (${(size / 1024 / 1024).toFixed(1)} MB)`);
}
console.log(`✓ Seed data copied to data/seed/ (${(totalBytes / 1024 / 1024).toFixed(1)} MB total)`);
