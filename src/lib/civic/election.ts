// Nov. 3, 2026 general election data layer.
//
// Data files (built by data/election-2026/build_*.py from cited public sources):
//   data/seed/election_2026_states.json  poll hours, polling-place lookup, mail deadlines,
//                                        Election Day registration — all 50 states + DC
//   data/seed/election_2026_races.json   U.S. Senate (35), Governor (36), U.S. House (435)
//                                        general-election candidates
//
// District resolution: the U.S. Census Bureau's TIGERweb "Legislative" service
// publishes the 120th Congressional Districts (the maps used for the 2026 House
// elections) and 2026 state legislative districts. We query it with the voter's
// geocoded point, so voters in the nine states that redrew their maps for 2026
// (AL, CA, FL, LA, NC, OH, TN, TX, UT) see the district they actually vote in.
//
// One verified exception: Census's 120th layer carries Missouri's 2025 map,
// but federal courts enjoined that map and the 2022 districts remain in effect
// for 2026 — so Missouri resolves against the 119th Congressional Districts.

import fs from 'node:fs';
import path from 'node:path';

export interface Candidate {
  name: string;
  party: string | null;
  wiki: string | null;
  incumbent: boolean;
}

export interface Race {
  state: string;
  office: 'U.S. Senate' | 'Governor' | 'U.S. House';
  district?: number; // 0 = at-large
  special?: boolean;
  incumbent: string | null;
  status: string;
  candidates: Candidate[];
}

export interface StateElectionInfo {
  abbr: string;
  name: string;
  poll_hours: string;
  poll_notes: string;
  polling_place_url: string;
  mail_voting: 'automatic' | 'on_request';
  mail_return: {
    type: 'Received' | 'Postmarked';
    deadline: string;
    in_person_deadline: string | null;
    official_info_url: string;
  };
  election_day_registration: 'yes' | 'no' | 'no_registration' | 'limited' | 'check';
  election_day_registration_note: string;
  redistricted_2026: boolean;
}

interface RacesFile {
  meta: any;
  senate: Race[];
  governor: Race[];
  house: Race[];
}

interface StatesFile {
  meta: any;
  states: Record<string, StateElectionInfo>;
}

const SEED_DIR = path.join(process.cwd(), 'data', 'seed');

function load(): { races: RacesFile; states: StatesFile } {
  const g = globalThis as unknown as { __civicpie_election?: { races: RacesFile; states: StatesFile } };
  if (g.__civicpie_election) return g.__civicpie_election;
  const races = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'election_2026_races.json'), 'utf8'));
  const states = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'election_2026_states.json'), 'utf8'));
  g.__civicpie_election = { races, states };
  return g.__civicpie_election;
}

export function electionMeta() {
  const { races, states } = load();
  return {
    election_date: '2026-11-03',
    counts: races.meta.counts,
    race_sources: races.meta.sources,
    state_sources: states.meta.sources,
    note: races.meta.note,
  };
}

export function allStates(): StateElectionInfo[] {
  return Object.values(load().states.states);
}

export function stateInfo(abbr: string): StateElectionInfo | null {
  return load().states.states[abbr.toUpperCase()] || null;
}

export function racesForState(abbr: string) {
  const { races } = load();
  const st = abbr.toUpperCase();
  return {
    senate: races.senate.filter((r) => r.state === st),
    governor: races.governor.filter((r) => r.state === st),
    house: races.house.filter((r) => r.state === st).sort((a, b) => (a.district ?? 0) - (b.district ?? 0)),
  };
}

export function houseRace(abbr: string, district: number): Race | null {
  return load().races.house.find((r) => r.state === abbr.toUpperCase() && r.district === district) || null;
}

// ─── Point → 2026 districts (Census TIGERweb) ─────────────────────────────────

const TIGER = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer';
const LAYER = { cd120: 0, sldu2026: 1, sldl2026: 2, cd119: 4 } as const;

// States whose in-effect 2026 congressional map is NOT Census's 120th layer.
const USE_119TH: Record<string, string> = {
  MO: 'Missouri uses its 2022 congressional map in 2026: federal courts blocked the 2025 map.',
};

async function tigerAt(layer: number, lat: number, lng: number): Promise<any | null> {
  const url =
    `${TIGER}/${layer}/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326` +
    `&spatialRel=esriSpatialRelIntersects&outFields=GEOID,BASENAME,NAME,STATE&returnGeometry=false&f=json`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'civicpie/2.0' } });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.features?.[0]?.attributes || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export interface PointDistricts {
  congressional: number | null; // 0 = at-large
  congressional_map: '120th' | '119th' | null;
  congressional_map_note: string | null;
  state_senate: string | null;
  state_house: string | null;
}

export async function districtsForPoint(stateAbbr: string, lat: number, lng: number): Promise<PointDistricts> {
  const st = stateAbbr.toUpperCase();
  const cdLayer = USE_119TH[st] ? LAYER.cd119 : LAYER.cd120;
  const [cd, up, low] = await Promise.all([
    tigerAt(cdLayer, lat, lng),
    tigerAt(LAYER.sldu2026, lat, lng),
    tigerAt(LAYER.sldl2026, lat, lng),
  ]);
  let congressional: number | null = null;
  if (cd?.GEOID && String(cd.GEOID).length === 4) {
    const n = parseInt(String(cd.GEOID).slice(2), 10);
    // GEOID suffix 00 = at-large; 98 = non-voting delegate (DC, territories).
    congressional = n === 98 ? null : n;
  }
  return {
    congressional,
    congressional_map: cd ? (USE_119TH[st] ? '119th' : '120th') : null,
    congressional_map_note: USE_119TH[st] || null,
    state_senate: up?.BASENAME ? String(up.BASENAME) : null,
    state_house: low?.BASENAME ? String(low.BASENAME) : null,
  };
}

// ─── Ballot summary for a looked-up location ─────────────────────────────────

export interface Ballot2026 {
  election_date: '2026-11-03';
  state: StateElectionInfo;
  senate: Race[];
  governor: Race[];
  house: Race | null;
  house_district: number | null;
  house_precision: 'exact' | 'zip_center' | 'at_large' | 'unknown';
  house_note: string | null;
  state_senate_district: string | null;
  state_house_district: string | null;
  sources: { races: string; districts: string };
}

const AT_LARGE = new Set(['AK', 'DE', 'ND', 'SD', 'VT', 'WY']);

export async function ballotFor(
  stateAbbr: string | null | undefined,
  point: { lat: number; lng: number } | null,
  opts: { zipOnly: boolean }
): Promise<Ballot2026 | null> {
  if (!stateAbbr) return null;
  const st = stateAbbr.toUpperCase();
  const info = stateInfo(st);
  if (!info) return null; // territories: no state-level data
  const r = racesForState(st);

  let house: Race | null = null;
  let house_district: number | null = null;
  let precision: Ballot2026['house_precision'] = 'unknown';
  let note: string | null = null;
  let sldu: string | null = null;
  let sldl: string | null = null;

  if (st === 'DC') {
    note = 'D.C. elects a non-voting Delegate to the U.S. House; check your D.C. sample ballot for that race.';
  } else if (AT_LARGE.has(st)) {
    house = houseRace(st, 0);
    house_district = 0;
    precision = 'at_large';
  }

  if (point && st !== 'DC') {
    const d = await districtsForPoint(st, point.lat, point.lng);
    sldu = opts.zipOnly ? null : d.state_senate;
    sldl = opts.zipOnly ? null : d.state_house;
    if (!AT_LARGE.has(st) && d.congressional !== null) {
      house_district = d.congressional;
      house = houseRace(st, d.congressional);
      precision = opts.zipOnly ? 'zip_center' : 'exact';
      if (opts.zipOnly) {
        note =
          'Based on the center of your ZIP code. ZIP codes can cross district lines — enter your full street address for an exact match.';
      }
      if (d.congressional_map_note) note = [d.congressional_map_note, note].filter(Boolean).join(' ');
    }
  }
  if (precision === 'unknown' && st !== 'DC') {
    note =
      `We couldn't place this location in a 2026 congressional district. ${info.name} has ${r.house.length} House races — ` +
      `your official sample ballot shows yours.`;
  }

  return {
    election_date: '2026-11-03',
    state: info,
    senate: r.senate,
    governor: r.governor,
    house,
    house_district,
    house_precision: precision,
    house_note: note,
    state_senate_district: sldu,
    state_house_district: sldl,
    sources: {
      races: 'Wikipedia 2026 U.S. Senate, House and gubernatorial election pages, Nov. 3, 2026 (CC BY-SA 4.0)',
      districts: 'U.S. Census Bureau TIGERweb — 120th Congressional Districts and 2026 state legislative districts',
    },
  };
}
