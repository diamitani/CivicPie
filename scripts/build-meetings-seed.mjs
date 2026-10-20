// Builds data/seed/meetings.json from the weekly meeting-scraper output in
// the civicpie-data workspace (data/meetings/meetings_*.json snapshots).
// Deterministic cleaning only: dedupe by source_key, split the scraped
// multi-line titles into title + location, keep records that carry a date.
// Run directly (`node scripts/build-meetings-seed.mjs`) or via `npm run seed`.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const candidates = [
  process.env.CIVICPIE_DATA_DIR,
  join(repoRoot, '..', 'civicpie-data'),
  join(process.env.HOME || '', 'workspace', 'civicpie-data'),
].filter(Boolean);
const SRC = candidates.find((p) => existsSync(join(p, 'data', 'meetings')));
const DEST = join(repoRoot, 'data', 'seed', 'meetings.json');

if (!SRC) {
  console.log('  (meetings seed skipped: no civicpie-data/data/meetings found)');
  process.exit(0);
}

const dir = join(SRC, 'data', 'meetings');
const files = readdirSync(dir).filter((f) => /^meetings_.*\.json$/.test(f)).sort();
const byKey = new Map();
for (const f of files) {
  const snap = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  for (const r of snap.records || []) {
    if (!r.date || !r.title) continue;
    const key = r.source_key || `${r.title}|${r.start || r.date}`;
    byKey.set(key, r); // later snapshots win (freshest scrape of the same meeting)
  }
}

function cleanTitle(raw) {
  const lines = String(raw).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return { title: lines[0] || String(raw).trim(), rest: lines.slice(1).join(', ') };
}

const cleaned = [...byKey.values()].map((r) => {
    const { title, rest } = cleanTitle(r.title);
    return {
      id: r.source_key || null,
      title,
      body: r.body || null,
      date: r.date,
      start: r.start || null,
      time: r.time_raw || null,
      location: (r.location || rest || null)?.replace(/,\s*,/g, ',') || null,
      is_virtual: !!r.is_virtual,
      status: r.status || null,
      level: r.level || null,
      source_url: r.source_url || null,
      agenda_url: r.agenda_url || null,
      detail_url: r.detail_url || null,
    };
  })
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

// Second pass: the same meeting can be scraped under different source_keys
// when its raw title text shifts between snapshots — collapse those on the
// cleaned title + date + start time.
const seen = new Set();
const meetings = cleaned.filter((m) => {
  const k = `${m.title}|${m.date}|${m.start || ''}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

writeFileSync(DEST, JSON.stringify(meetings, null, 1));
console.log(`  meetings.json (${meetings.length} unique meetings from ${files.length} scrape snapshots)`);
