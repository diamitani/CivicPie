// CivicPie master-DB data layer — dual mode:
//
//   DATABASE_URL set   → Supabase Postgres (pg + PostGIS). System of record.
//   DATABASE_URL unset  → bundled seed JSON in data/seed/ (npm run seed).
//
// Every response carries meta.source: 'supabase' | 'seed' so callers always
// know which data they are reading. Seed mode also logs a console warning
// once per process so it is never mistaken for live data.

import { Pool } from 'pg';
import { loadSeed, seedDirExists, type SeedData } from '@/lib/civic/seed';
import { geocodeAddress, wardForPoint } from '@/lib/civic/geo';
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

export function meta() {
  return { source: DATA_SOURCE };
}

if (DATA_SOURCE === 'seed') {
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
  if (DATA_SOURCE === 'supabase') {
    const p = getPool();
    const [o, c, d, a] = await Promise.all([
      p.query('SELECT COUNT(*) c FROM officials'),
      p.query('SELECT COUNT(*) c FROM candidates'),
      p.query('SELECT COUNT(*) c FROM districts'),
      p.query('SELECT COUNT(*) c FROM agencies'),
    ]);
    return {
      ok: true,
      source: DATA_SOURCE,
      counts: {
        officials: Number(o.rows[0].c),
        candidates: Number(c.rows[0].c),
        districts: Number(d.rows[0].c),
        agencies: Number(a.rows[0].c),
      },
    };
  }
  const s = loadSeed();
  return {
    ok: true,
    source: DATA_SOURCE,
    counts: {
      officials: s.officials.length,
      candidates: s.candidates.length,
      districts: s.districts.length,
      agencies: s.agencies.length,
    },
  };
}

function contactsFor(seed: SeedData, name: string, wardNum: string): ContactPoint[] {
  const rows = seed.contacts.filter(
    (c: any) => String(c.ward) === String(wardNum) && String(c.alderperson).trim() === String(name).trim()
  );
  const out: ContactPoint[] = [];
  const push = (kind: string, label: string | null, value: any) => {
    if (value && String(value).trim()) out.push({ kind, label, value: String(value).trim(), is_primary: false });
  };
  for (const r of rows) {
    push('phone', r.contact_type || 'phone', r.phone);
    push('email', null, r.email);
    push('website', null, r.website);
    push('address', r.address_type || 'office', r.address);
  }
  return out;
}

function seedOfficials(): Official[] {
  const seed = loadSeed();
  return seed.officials.map((r: any, i: number) => {
    const officeId = r.office_id || r.office || 'unknown';
    const wardNum = r.district_id?.match(/ward-(\d+)/)?.[1];
    const name = r.name || r.full_name || 'Unknown';
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
      photo_url: r.photo_url || null,
      contacts: wardNum ? contactsFor(seed, name, wardNum) : [],
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
  if (DATA_SOURCE === 'supabase') {
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
    if (f.district_id) add('district_id = ?', f.district_id);
    if (f.district_prefix) add('district_id LIKE ?', `${f.district_prefix}%`);
    if (f.office) add('office_id = ?', f.office);
    if (f.level) add('level = ?', f.level);
    if (f.q) add('(name ILIKE ? OR office_id ILIKE ?)', `%${f.q}%`, `%${f.q}%`);
    // NOTE: office title / contact points come from the offices & sources
    // tables — make sure those are seeded in Supabase before loading.
    const sql = `SELECT o.id, o.name, o.office_id, o.level, o.district_id, o.party,
      o.term_start, o.term_end, o.incumbent, o.email, o.photo_url, s.name AS source_name,
      of2.title AS office_title
      FROM officials o
      LEFT JOIN sources s ON s.id = o.source_id
      LEFT JOIN offices of2 ON of2.id = o.office_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY o.name ASC LIMIT ?`;
    args.push(limit);
    const { rows } = await p.query(sql, args);
    const totalQ = `SELECT COUNT(*) c FROM officials o ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
    const { rows: trows } = await p.query(totalQ, args.slice(0, args.length - 1));
    return {
      data: rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        office: r.office_id,
        office_title: r.office_title || officeTitle(r.office_id),
        level: r.level,
        district_id: r.district_id,
        party: r.party,
        term_start: r.term_start,
        term_end: r.term_end,
        incumbent: !!r.incumbent,
        email: r.email,
        photo_url: r.photo_url,
        contacts: [],
        source: r.source_name || 'supabase',
      })),
      total: Number(trows[0].c),
    };
  }
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
}

export async function searchCandidates(f: {
  district_id?: string;
  office?: string;
  limit?: number;
}): Promise<{ data: Candidate[]; total: number }> {
  const limit = clampLimit(f.limit);
  if (DATA_SOURCE === 'supabase') {
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
    if (f.district_id) add('district_id = ?', f.district_id);
    if (f.office) add('office_id = ?', f.office);
    const sql = `SELECT c.id, c.name, c.office_id, c.district_id, c.state_abbr, c.party,
      c.election_year, c.election_date, c.incumbent, s.name AS source_name,
      of2.title AS office_title
      FROM candidates c
      LEFT JOIN sources s ON s.id = c.source_id
      LEFT JOIN offices of2 ON of2.id = c.office_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY c.name ASC LIMIT ?`;
    args.push(limit);
    const { rows } = await p.query(sql, args);
    const totalQ = `SELECT COUNT(*) c FROM candidates c ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
    const { rows: trows } = await p.query(totalQ, args.slice(0, args.length - 1));
    return {
      data: rows.map((r: any) => ({
        id: r.id,
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
  }
  let out = seedCandidates();
  if (f.district_id) out = out.filter((c) => c.district_id === f.district_id);
  if (f.office) out = out.filter((c) => c.office === f.office);
  out = out.sort((a, b) => a.name.localeCompare(b.name));
  return { data: out.slice(0, limit), total: out.length };
}

export async function searchDistricts(f: { type?: string; city?: string; state?: string }) {
  if (DATA_SOURCE === 'supabase') {
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
  }
  let out = seedDistricts();
  if (f.type) out = out.filter((d) => d.district_type === f.type);
  if (f.city) out = out.filter((d) => d.city?.toLowerCase() === f.city!.toLowerCase());
  if (f.state) out = out.filter((d) => d.state_abbr?.toLowerCase() === f.state!.toLowerCase());
  return out.sort((a, b) => a.district_name.localeCompare(b.district_name)).slice(0, 500);
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
  if (DATA_SOURCE === 'supabase') {
    const p = getPool();
    const args: any[] = [];
    const where = f.level ? 'WHERE level = $1' : '';
    if (f.level) args.push(f.level);
    const { rows } = await p.query(
      `SELECT a.id, a.name, a.level, a.agency_type, a.description, a.city, a.state_abbr,
              s.name AS source_name
       FROM agencies a LEFT JOIN sources s ON s.id = a.source_id
       ${where} ORDER BY a.name ASC LIMIT 500`,
      args
    );
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      level: r.level,
      agency_type: r.agency_type,
      description: r.description,
      city: r.city,
      state_abbr: r.state_abbr,
      source: r.source_name || 'supabase',
    }));
  }
  let out = seedAgencies();
  if (f.level) out = out.filter((a) => a.level === f.level);
  return out.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 500);
}

// ---------------------------------------------------------------------------
// Address lookup: geocode → ward (PostGIS in Supabase, point-in-polygon on seed)
// ---------------------------------------------------------------------------

export type Coverage = 'local' | 'none';

export interface LookupResult {
  address: string;
  lat: number;
  lng: number;
  coverage: Coverage;
  ward: string | null;
  district_id: string | null;
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

  let district_id: string | null = null;
  if (DATA_SOURCE === 'supabase') {
    const p = getPool();
    const { rows } = await p.query(
      `SELECT district_id FROM districts
       WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326))
       AND district_type = 'ward' LIMIT 1`,
      [geo.lng, geo.lat]
    );
    district_id = rows[0]?.district_id || null;
  } else {
    const seed = loadSeed();
    district_id = wardForPoint(seed.wards, geo.lat, geo.lng);
  }

  // In-coverage: identical shape to before, plus the coverage flag.
  if (district_id) {
    const { data: officials } = await searchOfficials({ district_id, limit: MAX_LIMIT });
    return {
      address: geo.matchedAddress,
      lat: geo.lat,
      lng: geo.lng,
      coverage: 'local',
      ward: district_id,
      district_id,
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
