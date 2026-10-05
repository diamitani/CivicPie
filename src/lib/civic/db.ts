// CivicPie master-DB data layer — dual mode with resilient fallback:
//
//   DATABASE_URL set + healthy DB → Supabase Postgres (pg + PostGIS).
//   Otherwise                    → bundled seed JSON in data/seed/ (npm run seed).
//
// The effective source is resolved per process: if DATABASE_URL is set but the
// database is unreachable or the schema is missing, every query transparently
// falls back to seed JSON so the site never 500s on a broken/empty database.
// Every response carries meta.source: 'supabase' | 'seed' so callers always
// know which data they are reading.

import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { loadSeed, seedDirExists, type SeedData } from '@/lib/civic/seed';
import { geocodeAddress, wardForPoint, US_STATES } from '@/lib/civic/geo';
import { officeTitle, levelOf } from '@/lib/civic/offices';
import type {
  Official,
  District,
  DistrictDetail,
  Candidate,
  Agency,
  ContactPoint,
  DataSource,
} from '@/lib/civic/types';

export const DATA_SOURCE: DataSource = process.env.DATABASE_URL ? 'supabase' : 'seed';
// CONFIGURED_SOURCE is env-only; the effective source is resolved by useDb().
export const CONFIGURED_SOURCE: DataSource = DATA_SOURCE;

// Per-process DB health: null = not yet probed. Once a probe or query fails,
// the rest of the process serves seed JSON (serverless processes recycle, so
// a repaired DB is picked up on the next cold start).
let dbOk: boolean | null = process.env.DATABASE_URL ? null : false;

async function probeDb(): Promise<boolean> {
  if (dbOk !== null) return dbOk;
  try {
    await getPool().query('SELECT 1 FROM districts LIMIT 1');
    dbOk = true;
  } catch (e: any) {
    dbOk = false;
    console.error(
      '[civicpie] database unreachable or schema missing — serving bundled seed JSON. ' +
        `Fix DATABASE_URL or load the schema, then redeploy. (${e?.message || e})`
    );
  }
  return dbOk;
}

async function useDb(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  return probeDb();
}

// Run dbFn when the database is healthy; on ANY db failure, mark it unhealthy
// for this process and serve seedFn() instead. The site stays up regardless.
async function withDbFallback<T>(dbFn: () => Promise<T>, seedFn: () => T | Promise<T>): Promise<T> {
  if (await useDb()) {
    try {
      return await dbFn();
    } catch (e: any) {
      dbOk = false;
      console.error(
        '[civicpie] database query failed — falling back to seed JSON for this process. ' +
          `(${e?.message || e})`
      );
    }
  }
  return seedFn();
}

export async function meta() {
  const source: DataSource = (await useDb()) ? 'supabase' : 'seed';
  return { source, db_configured: !!process.env.DATABASE_URL };
}

if (CONFIGURED_SOURCE === 'seed') {
  console.warn(
    '[civicpie] DATABASE_URL not set — serving bundled seed JSON (data/seed/). ' +
      'Set DATABASE_URL to use the live Supabase database.'
  );
}

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 8000,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

// ---------------------------------------------------------------------------
// Officials
// ---------------------------------------------------------------------------

export interface OfficialFilter {
  district_id?: string;
  district_prefix?: string;
  office?: string;
  level?: 'federal' | 'state' | 'local';
  q?: string;
  limit?: number;
}

const MAX_LIMIT = 200;
function clampLimit(n?: number): number {
  if (!n || Number.isNaN(n)) return 50;
  return Math.min(Math.max(1, Math.floor(n)), MAX_LIMIT);
}

export async function getHealth() {
  return withDbFallback(
    async () => {
      const p = getPool();
      const [o, c, d, a] = await Promise.all([
        p.query('SELECT COUNT(*) c FROM officials'),
        p.query('SELECT COUNT(*) c FROM candidates'),
        p.query('SELECT COUNT(*) c FROM districts'),
        p.query('SELECT COUNT(*) c FROM agencies'),
      ]);
      return {
        ok: true,
        source: 'supabase' as DataSource,
        counts: {
          officials: Number(o.rows[0].c),
          candidates: Number(c.rows[0].c),
          districts: Number(d.rows[0].c),
          agencies: Number(a.rows[0].c),
        },
      };
    },
    () => {
      const s = loadSeed();
      return {
        ok: true,
        source: 'seed' as DataSource,
        counts: {
          officials: s.officials.length,
          candidates: s.candidates.length,
          districts: s.districts.length,
          agencies: s.agencies.length,
        },
      };
    }
  );
}

function contactsFor(seed: SeedData, sourceKey: string): ContactPoint[] {
  // Contacts are keyed by official_source_key (e.g. 'chicago-wards-xlsx:alderman:48')
  // — join on the official's own source_key, not ward/alderperson fields.
  const rows = seed.contacts.filter(
    (c: any) => String(c.official_source_key) === String(sourceKey)
  );
  const out: ContactPoint[] = [];
  const push = (kind: string, label: string | null, value: any) => {
    if (value && String(value).trim()) out.push({ kind, label, value: String(value).trim(), is_primary: false });
  };
  for (const r of rows) {
    push(r.kind || 'phone', r.label || null, r.value);
  }
  return out;
}

function seedOfficials(): Official[] {
  const seed = loadSeed();
  return seed.officials.map((r: any, i: number) => {
    const officeId = r.office_id || r.office || 'unknown';
    const name = r.name || r.full_name || 'Unknown';
    const key = r.source_key || `seed-official-${i}`;
    return {
      id: `seed-${i}`,
      name,
      office: officeId,
      office_title: officeTitle(officeId),
      level: r.level && ['federal', 'state', 'local'].includes(r.level) ? r.level : levelOf(officeId),
      district_id: r.district_id || null,
      party: r.party || null,
      term_start: r.term_start || null,
      term_end: r.term_end || null,
      incumbent: !!r.incumbent,
      email: r.email || null,
      photo_url: r.photo_url || r.external_ids?.photo_url || null,
      contacts: contactsFor(seed, key),
      source: r.source || 'seed',
    };
  });
}

function seedCandidates(): Candidate[] {
  const seed = loadSeed();
  return seed.candidates.map((r: any, i: number) => {
    const officeId = r.office_id || r.office || 'unknown';
    return {
      id: `seed-${i}`,
      name: r.name || r.full_name || 'Unknown',
      office: officeId,
      office_title: officeTitle(officeId),
      district_id: r.district_id || null,
      state_abbr: r.state_abbr || null,
      party: r.party || null,
      election_year: r.election_year ?? null,
      election_date: r.election_date || null,
      incumbent: !!r.incumbent,
      source: r.source || 'seed',
    };
  });
}

function seedDistricts(): District[] {
  const seed = loadSeed();
  return seed.districts.map((r: any) => ({
    district_id: r.district_id,
    district_type: r.district_type,
    district_name: r.district_name,
    district_number: r.district_number ?? null,
    city: r.city || null,
    state_abbr: r.state_abbr || null,
  }));
}

function seedAgencies(): Agency[] {
  const seed = loadSeed();
  return seed.agencies.map((r: any, i: number) => ({
    id: r.id || `seed-${i}`,
    name: r.name,
    level: r.level || null,
    agency_type: r.agency_type || null,
    description: r.description || null,
    city: r.city || null,
    state_abbr: r.state_abbr || null,
    source: r.source || 'seed',
  }));
}

export async function searchOfficials(f: OfficialFilter): Promise<{ data: Official[]; total: number }> {
  const limit = clampLimit(f.limit);
  const fromDb = async () => {
    const p = getPool();
    const where: string[] = [];
    const args: any[] = [];
    const add = (sql: string, ...vals: any[]) => {
      for (const v of vals) {
        args.push(v);
        sql = sql.replace('?', `$${args.length}`);
      }
      where.push(sql);
    };
    if (f.district_id) add('o.district_id = ?', f.district_id);
    if (f.district_prefix) add('o.district_id LIKE ?', `${f.district_prefix}%`);
    if (f.office) add('o.office_id = ?', f.office);
    if (f.level) add('of2.level = ?', f.level);
    if (f.q) add('(o.full_name ILIKE ? OR o.office_id ILIKE ?)', `%${f.q}%`, `%${f.q}%`);
    // Schema: civicpie-data/migrations/001_civicpie_master_schema.sql.
    // officials carries no level/email columns — level comes from offices,
    // email + contact points come from contact_points (aggregated per official).
    const join = `FROM officials o
      LEFT JOIN sources s ON s.source_id = o.source_id
      LEFT JOIN offices of2 ON of2.office_id = o.office_id
      LEFT JOIN LATERAL (
        SELECT json_agg(json_build_object('kind', cp.kind, 'value', cp.value,
          'label', cp.label, 'is_primary', cp.is_primary)
          ORDER BY cp.is_primary DESC NULLS LAST) AS contacts
        FROM contact_points cp WHERE cp.official_id = o.official_id
      ) ct ON true`;
    const sql = `SELECT o.official_id AS id, o.full_name AS name, o.office_id,
      of2.level, o.district_id, o.party,
      o.term_start, o.term_end, o.is_incumbent AS incumbent, o.photo_url,
      s.name AS source_name, of2.title AS office_title, ct.contacts
      ${join}
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY o.full_name ASC LIMIT ?`;
    args.push(limit);
    const { rows } = await p.query(sql, args);
    const totalQ = `SELECT COUNT(*) c ${join} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
    const { rows: trows } = await p.query(totalQ, args.slice(0, args.length - 1));
    return {
      data: rows.map((r: any) => {
        const contacts = (r.contacts || []).map((c: any) => ({
          kind: c.kind,
          label: c.label ?? null,
          value: c.value,
          is_primary: !!c.is_primary,
        }));
        const email =
          contacts.find((c: any) => c.kind === 'email' && c.is_primary)?.value ||
          contacts.find((c: any) => c.kind === 'email')?.value ||
          null;
        return {
          id: String(r.id),
          name: r.name,
          office: r.office_id,
          office_title: r.office_title || officeTitle(r.office_id),
          level: r.level,
          district_id: r.district_id,
          party: r.party,
          term_start: r.term_start,
          term_end: r.term_end,
          incumbent: !!r.incumbent,
          email,
          photo_url: r.photo_url,
          contacts,
          source: r.source_name || 'supabase',
        };
      }),
      total: Number(trows[0].c),
    };
  };
  const fromSeed = () => {
    let out = seedOfficials();
    if (f.district_id) out = out.filter((o) => o.district_id === f.district_id);
    if (f.district_prefix) out = out.filter((o) => (o.district_id || '').startsWith(f.district_prefix!));
    if (f.office) out = out.filter((o) => o.office === f.office);
    if (f.level) out = out.filter((o) => o.level === f.level);
    if (f.q) {
      const q = f.q.toLowerCase();
      out = out.filter(
        (o) => o.name.toLowerCase().includes(q) || o.office_title.toLowerCase().includes(q)
      );
    }
    out = out.sort((a, b) => a.name.localeCompare(b.name));
    return { data: out.slice(0, limit), total: out.length };
  };
  return withDbFallback<{ data: Official[]; total: number }>(fromDb, fromSeed);
}

export async function searchCandidates(f: {
  district_id?: string;
  office?: string;
  limit?: number;
}): Promise<{ data: Candidate[]; total: number }> {
  const limit = clampLimit(f.limit);
  const fromDb = async () => {
    const p = getPool();
    const where: string[] = [];
    const args: any[] = [];
    const add = (sql: string, ...vals: any[]) => {
      for (const v of vals) {
        args.push(v);
        sql = sql.replace('?', `$${args.length}`);
      }
      where.push(sql);
    };
    if (f.district_id) add('c.district_id = ?', f.district_id);
    if (f.office) add('c.office_id = ?', f.office);
    // Schema: civicpie-data/migrations/001 — candidates use candidate_id/full_name
    // PKs, sources/offices join on source_id/office_id (not id).
    const sql = `SELECT c.candidate_id AS id, c.full_name AS name, c.office_id,
      c.district_id, c.state_abbr, c.party,
      c.election_year, c.election_date, c.is_incumbent AS incumbent,
      s.name AS source_name, of2.title AS office_title
      FROM candidates c
      LEFT JOIN sources s ON s.source_id = c.source_id
      LEFT JOIN offices of2 ON of2.office_id = c.office_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY c.full_name ASC LIMIT ?`;
    args.push(limit);
    const { rows } = await p.query(sql, args);
    const totalQ = `SELECT COUNT(*) c FROM candidates c ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
    const { rows: trows } = await p.query(totalQ, args.slice(0, args.length - 1));
    return {
      data: rows.map((r: any) => ({
        id: String(r.id),
        name: r.name,
        office: r.office_id,
        office_title: r.office_title || officeTitle(r.office_id),
        district_id: r.district_id,
        state_abbr: r.state_abbr,
        party: r.party,
        election_year: r.election_year,
        election_date: r.election_date,
        incumbent: !!r.incumbent,
        source: r.source_name || 'supabase',
      })),
      total: Number(trows[0].c),
    };
  };
  const fromSeed = () => {
    let out = seedCandidates();
    if (f.district_id) out = out.filter((c) => c.district_id === f.district_id);
    if (f.office) out = out.filter((c) => c.office === f.office);
    out = out.sort((a, b) => a.name.localeCompare(b.name));
    return { data: out.slice(0, limit), total: out.length };
  };
  return withDbFallback(fromDb, fromSeed);
}

export async function searchDistricts(f: { type?: string; city?: string; state?: string }) {
  const fromDb = async () => {
    const p = getPool();
    const where: string[] = [];
    const args: any[] = [];
    const add = (sql: string, ...vals: any[]) => {
      for (const v of vals) {
        args.push(v);
        sql = sql.replace('?', `$${args.length}`);
      }
      where.push(sql);
    };
    if (f.type) add('district_type = ?', f.type);
    if (f.city) add('city ILIKE ?', f.city);
    if (f.state) add('state_abbr ILIKE ?', f.state);
    const { rows } = await p.query(
      `SELECT district_id, district_type, district_name, district_number, city, state_abbr
       FROM districts ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY district_name ASC LIMIT 500`,
      args
    );
    return rows;
  };
  const fromSeed = () => {
    let out = seedDistricts();
    if (f.type) out = out.filter((d) => d.district_type === f.type);
    if (f.city) out = out.filter((d) => d.city?.toLowerCase() === f.city!.toLowerCase());
    if (f.state) out = out.filter((d) => d.state_abbr?.toLowerCase() === f.state!.toLowerCase());
    return out.sort((a, b) => a.district_name.localeCompare(b.district_name)).slice(0, 500);
  };
  return withDbFallback(fromDb, fromSeed);
}

export async function getDistrict(id: string): Promise<DistrictDetail | null> {
  const district = (await searchDistricts({})).find((d) => d.district_id === id);
  if (!district) return null;
  const [{ data: officials, total: official_count }, { total: candidate_count }] =
    await Promise.all([
      searchOfficials({ district_id: id, limit: MAX_LIMIT }),
      searchCandidates({ district_id: id, limit: 1 }),
    ]);
  return { ...district, officials, official_count, candidate_count };
}

export async function searchAgencies(f: { level?: string }) {
  const fromDb = async () => {
    const p = getPool();
    const args: any[] = [];
    const where = f.level ? 'WHERE level = $1' : '';
    if (f.level) args.push(f.level);
    const { rows } = await p.query(
      `SELECT a.agency_id AS id, a.name, a.level, a.agency_type, a.description, a.city, a.state_abbr,
              s.name AS source_name
       FROM agencies a LEFT JOIN sources s ON s.source_id = a.source_id
       ${where} ORDER BY a.name ASC LIMIT 500`,
      args
    );
    return rows.map((r: any) => ({
      id: String(r.id),
      name: r.name,
      level: r.level,
      agency_type: r.agency_type,
      description: r.description,
      city: r.city,
      state_abbr: r.state_abbr,
      source: r.source_name || 'supabase',
    }));
  };
  const fromSeed = () => {
    let out = seedAgencies();
    if (f.level) out = out.filter((a) => a.level === f.level);
    return out.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 500);
  };
  return withDbFallback(fromDb, fromSeed);
}

// ---------------------------------------------------------------------------
// Address lookup: geocode → ward (PostGIS in Supabase, point-in-polygon on seed)
// ---------------------------------------------------------------------------

export type Coverage = 'local' | 'none';

// City-level coverage (no geometry): a district of type 'city' in the seed
// (see data/seed/city_districts.json) covers every address whose geocoded
// city + state match. This is how smaller cities get hyperlocal coverage
// without a ward-boundary dataset.
function cityDistrictFor(city: string | undefined, stateAbbr: string | undefined): string | null {
  if (!city || !stateAbbr) return null;
  const key = `${city.trim().toLowerCase()}|${stateAbbr.trim().toLowerCase()}`;
  const d = loadSeed().districts.find(
    (r: any) =>
      r.district_type === 'city' &&
      `${String(r.city || '').toLowerCase()}|${String(r.state_abbr || '').toLowerCase()}` === key
  );
  return d?.district_id || null;
}

// Slugs of cities that have a dedicated /city/[slug] page (public/data/cities.json).
let _citySlugs: Set<string> | null = null;
function cityPageSlugs(): Set<string> {
  if (!_citySlugs) {
    try {
      const cities = JSON.parse(
        fs.readFileSync(path.join(process.cwd(), 'public', 'data', 'cities.json'), 'utf8')
      );
      _citySlugs = new Set((cities || []).map((c: any) => String(c.id)));
    } catch {
      _citySlugs = new Set();
    }
  }
  return _citySlugs;
}

function citySlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Human label + in-app link for a covered district. Chicago wards get their
// ward page; city districts link to /city/[slug] when that page exists.
function describeDistrict(district_id: string): { label: string; href: string | null } {
  const m = district_id.match(/^il-chicago-ward-(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    return { label: `Ward ${n} · Chicago`, href: `/ward/chicago-${n}` };
  }
  const d = loadSeed().districts.find((r: any) => r.district_id === district_id);
  if (d?.district_type === 'city' && d.city) {
    const stateName = US_STATES[String(d.state_abbr || '').toUpperCase()] || d.state_abbr || '';
    const label = `${d.city} · ${stateName}`.trim();
    const slug = citySlug(String(d.district_name || d.city));
    const href = cityPageSlugs().has(slug) ? `/city/${slug}` : null;
    return { label, href };
  }
  return { label: district_id, href: null };
}

export interface LookupResult {
  address: string;
  lat: number;
  lng: number;
  coverage: Coverage;
  ward: string | null;
  district_id: string | null;
  district_label: string | null;
  district_href: string | null;
  officials: Official[];
  // Out-of-coverage extras (coverage === 'none')
  state_abbr?: string | null;
  state_name?: string | null;
  message?: string;
  federal_officials?: Official[];
  state_officials?: Official[];
  state_officials_total?: number;
}

// Senators first, then House reps, then alphabetical — for the
// out-of-coverage card.
function sortFederalFirst(a: Official, b: Official): number {
  const rank = (o: Official) => (o.office === 'us-senate' ? 0 : o.office === 'us-house' ? 1 : 2);
  return rank(a) - rank(b) || a.name.localeCompare(b.name);
}

export async function lookupAddress(address: string): Promise<LookupResult> {
  const geo = await geocodeAddress(address);
  if (!geo) throw Object.assign(new Error('Address not found'), { status: 404 });

  // Ward resolution: PostGIS when the DB is healthy, point-in-polygon on the
  // seed ward geometry otherwise. When no ward matches, fall back to
  // city-level coverage (a 'city' district in the seed keyed by geocoded
  // city + state — e.g. North Liberty, IA). Never throws on a broken database.
  const wardId: string | null = await withDbFallback(
    async () => {
      const { rows } = await getPool().query(
        `SELECT district_id FROM districts
         WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
         AND district_type = 'ward' LIMIT 1`,
        [geo.lng, geo.lat]
      );
      return rows[0]?.district_id || null;
    },
    () => wardForPoint(loadSeed().wards, geo.lat, geo.lng)
  );
  const district_id: string | null = wardId || cityDistrictFor(geo.city, geo.state_abbr);

  // In-coverage: identical shape to before, plus the coverage flag.
  if (district_id) {
    const { data: officials } = await searchOfficials({ district_id, limit: MAX_LIMIT });
    const { label, href } = describeDistrict(district_id);
    return {
      address: geo.matchedAddress,
      lat: geo.lat,
      lng: geo.lng,
      coverage: 'local',
      ward: wardId,
      district_id,
      district_label: label,
      district_href: href,
      officials,
    };
  }

  // Out-of-coverage: NEVER a 404. Resolve whatever state/federal
  // representation we can for the location and say so plainly.
  const st = (geo.state_abbr || '').toLowerCase();
  let federal_officials: Official[] = [];
  let state_officials: Official[] = [];
  let state_officials_total = 0;
  if (st) {
    const [senate, house] = await Promise.all([
      searchOfficials({ district_prefix: `us-senate-${st}`, limit: MAX_LIMIT }),
      searchOfficials({ district_prefix: `us-house-${st}-`, limit: MAX_LIMIT }),
    ]);
    federal_officials = [...senate.data, ...house.data].sort(sortFederalFirst);
    const states = await searchOfficials({ district_id: `us-state-${st}`, limit: 20 });
    state_officials = states.data;
    state_officials_total = states.total;
  }
  const place = geo.matchedAddress || 'this area';
  return {
    address: geo.matchedAddress,
    lat: geo.lat,
    lng: geo.lng,
    coverage: 'none',
    ward: null,
    district_id: null,
    district_label: null,
    district_href: null,
    officials: [],
    state_abbr: geo.state_abbr || null,
    state_name: geo.state_name || null,
    message: st
      ? `We don't have hyperlocal coverage for ${place} yet — CivicPie is expanding city by city. ` +
        `Here are your ${geo.state_name || st.toUpperCase()} state and federal representatives in the meantime.`
      : `We don't have hyperlocal coverage for ${place} yet — CivicPie is expanding city by city.`,
    federal_officials,
    state_officials,
    state_officials_total,
  };
}

export { seedDirExists };
