// District data loading utilities for CivicPie
// Loads from public/data/ JSON files (static export compatible)

export type DistrictType = 'ward' | 'city' | 'county' | 'state' | 'federal';

export const DISTRICT_TYPE_LABELS: Record<DistrictType, string> = {
  ward: 'Ward', city: 'City', county: 'County', state: 'State', federal: 'Federal',
};

export const DISTRICT_TYPES: { id: DistrictType; label: string; singular: string }[] = [
  { id: 'ward', label: 'Wards', singular: 'Ward' },
  { id: 'city', label: 'Cities', singular: 'City' },
  { id: 'county', label: 'Counties', singular: 'County' },
  { id: 'state', label: 'States', singular: 'State' },
  { id: 'federal', label: 'Federal', singular: 'Federal' },
];

interface StateData {
  id: string; name: string; abbreviation: string; capital: string;
  population: number; legislature?: { name: string };
  governor?: { name: string; party: string; since: number; website: string };
  senators?: Array<{ name: string; party: string; since: number; website: string }>;
}

interface CityData {
  id: string; name: string; stateAbbreviation: string;
  population: number; governmentType: string;
}

/* ─── District page data ─── */
export interface DistrictPageData {
  districtType: DistrictType;
  districtId: string;
  displayName: string;
  city?: string;
  state?: string;
  stateAbbr?: string;
  description?: string;
  population?: string;
  neighborhoods?: string[];
  officials: any[];
  events: any[];
  agencies: any[];
  civicGroups?: any[];
  stats: { label: string; value: string }[];
  grants: any[];
  elections: any[];
}

/* ─── Caches ─── */
let _statesCache: StateData[] | null = null;
let _citiesCache: CityData[] | null = null;
let _wardDataCache: any = null;
let _federalAgenciesCache: any[] | null = null;
let _stateAgenciesCache: any[] | null = null;
let _grantsCache: any[] | null = null;
let _calendarCache: any[] | null = null;
let _electionsCache: any[] | null = null;

async function loadJson(filename: string) {
  const res = await fetch(`/data/${filename}`);
  if (!res.ok) return null;
  return res.json();
}

export async function loadStates(): Promise<StateData[]> {
  if (!_statesCache) _statesCache = await loadJson('states.json');
  return _statesCache || [];
}

export async function loadCities(): Promise<CityData[]> {
  if (!_citiesCache) _citiesCache = await loadJson('cities.json');
  return _citiesCache || [];
}

async function loadWardData() {
  if (!_wardDataCache) _wardDataCache = await loadJson('ward_data.json');
  return _wardDataCache;
}

async function loadFederalAgencies(): Promise<any[]> {
  if (!_federalAgenciesCache) _federalAgenciesCache = await loadJson('federal_agencies.json');
  return _federalAgenciesCache || [];
}

async function loadStateAgencies(): Promise<any[]> {
  if (!_stateAgenciesCache) _stateAgenciesCache = await loadJson('state_agencies.json');
  return _stateAgenciesCache || [];
}

async function loadGrants(): Promise<any[]> {
  if (!_grantsCache) _grantsCache = await loadJson('grant_programs.json');
  return _grantsCache || [];
}

async function loadCalendar(): Promise<any[]> {
  if (!_calendarCache) _calendarCache = await loadJson('civic_calendar.json');
  return _calendarCache || [];
}

async function loadElections(): Promise<any[]> {
  if (!_electionsCache) _electionsCache = await loadJson('elections_openstates_data.json');
  return _electionsCache || [];
}

/* ─── Legacy getDistrict (used by sibling agents) ─── */
export async function getDistrict(type: string, id: string) {
  if (type === 'state') {
    const states = await loadStates();
    const state = states.find((s: StateData) =>
      s.id === id || s.abbreviation?.toLowerCase() === id.toLowerCase()
    );
    if (!state) return null;
    return {
      districtMeta: {
        id: state.id, name: state.name, type: 'state' as const,
        state: state.name, stateAbbr: state.abbreviation,
        description: `${state.name} — population ${(state.population / 1000000).toFixed(1)}M. Capital: ${state.capital}.`,
        population: state.population?.toLocaleString(),
      },
      officials: [
        state.governor ? {
          id: `gov-${state.id}`, name: state.governor.name, title: 'Governor',
          level: 'State', party: state.governor.party,
          contact: { website: state.governor.website },
        } : null,
        ...(state.senators || []).map((s: any, i: number) => ({
          id: `sen-${state.id}-${i}`, name: s.name, title: 'US Senator',
          level: 'Federal', party: s.party,
          contact: { website: s.website },
        })),
      ].filter(Boolean),
    };
  }

  if (type === 'city') {
    const cities = await loadCities();
    const city = cities.find((c: CityData) => c.id === id);
    if (!city) return null;
    return {
      districtMeta: {
        id: city.id, name: city.name, type: 'city' as const,
        state: city.stateAbbreviation, stateAbbr: city.stateAbbreviation,
        description: `${city.name} — population ${(city.population / 1000000).toFixed(1)}M.`,
        population: city.population?.toLocaleString(),
      },
      officials: [],
    };
  }

  if (type === 'ward') {
    const wd = await loadWardData();
    const dir = await loadJson('ward_directory.json');
    if (!wd) return null;
    const meta = { ...wd.districtMeta, type: 'ward' as const };
    return {
      districtMeta: meta,
      officials: wd.officials || [],
      events: wd.events || [],
      agencies: wd.agencies || [],
      civicGroups: wd.civicGroups || [],
      quickStats: wd.quickStats || [],
      directory: dir || {},
    };
  }

  return {
    districtMeta: { id, name: `${type} ${id}`, type: type as any, state: '', stateAbbr: '', description: '' },
    officials: [], events: [], agencies: [],
  };
}

/* ─── loadDistrictPageData — returns DistrictPageData for the template ─── */

export async function loadDistrictPageData(
  type: DistrictType,
  id: string,
): Promise<DistrictPageData | null> {
  switch (type) {
    case 'ward': return loadWardDistrict(id);
    case 'city': return loadCityDistrict(id);
    case 'county': return loadCountyDistrict(id);
    case 'state': return loadStateDistrict(id);
    case 'federal': return loadFederalDistrict();
    default: return null;
  }
}

async function loadWardDistrict(id: string): Promise<DistrictPageData | null> {
  const [wd, calendar] = await Promise.all([loadWardData(), loadCalendar()]);
  if (!wd) return null;
  const meta = wd.districtMeta;
  return {
    districtType: 'ward', districtId: id,
    displayName: meta.name || `Ward ${id}`,
    city: meta.city, state: meta.state, stateAbbr: meta.stateAbbr,
    description: meta.description, population: meta.population,
    neighborhoods: meta.neighborhoods,
    officials: wd.officials || [],
    events: wd.events || [],
    agencies: wd.agencies || [],
    civicGroups: wd.civicGroups || [],
    stats: (wd.quickStats || []).map((s: any) => ({ label: s.label, value: s.value })),
    grants: [],
    elections: calendar.filter((e: any) => e.event_type === 'election'),
  };
}

async function loadCityDistrict(id: string): Promise<DistrictPageData | null> {
  const cities = await loadCities();
  const city = cities.find((c) => c.id === id);
  if (!city) return null;

  const [states, agencies] = await Promise.all([loadStates(), loadStateAgencies()]);
  const state = states.find((s) => s.abbreviation === city.stateAbbreviation);

  const localAgencies = agencies.filter((a: any) =>
    a.state?.toLowerCase() === city.stateAbbreviation?.toLowerCase()
  );

  return {
    districtType: 'city', districtId: id,
    displayName: `${city.name}, ${city.stateAbbreviation}`,
    city: city.name, state: state?.name, stateAbbr: city.stateAbbreviation,
    description: `${city.name} is a ${city.governmentType} city with a population of ${city.population?.toLocaleString()}.`,
    population: city.population?.toLocaleString(),
    officials: state?.senators?.map((s: any, i: number) => ({
      id: `sen-city-${i}`, name: s.name, title: 'U.S. Senator', level: 'Federal',
      party: s.party, contact: { website: s.website },
    })) || [],
    events: [],
    agencies: localAgencies.slice(0, 10).map((a: any) => ({
      id: a.id || a.abbr, name: a.name, type: a.type || 'Agency', level: a.level || 'City',
      description: a.description || '', website: a.website, services: a.services || [],
    })),
    stats: [
      { label: 'Population', value: city.population?.toLocaleString() || 'N/A' },
      { label: 'Government', value: city.governmentType || 'N/A' },
      { label: 'State', value: city.stateAbbreviation || 'N/A' },
    ],
    grants: [], elections: [],
  };
}

async function loadCountyDistrict(id: string): Promise<DistrictPageData | null> {
  const displayName = id === 'cook' ? 'Cook County' : `${id.charAt(0).toUpperCase() + id.slice(1)} County`;
  const [agencies, grants] = await Promise.all([loadStateAgencies(), loadGrants()]);

  const countyAgencies = agencies.filter((a: any) => a.level?.toLowerCase() === 'county');
  const countyGrants = grants.filter((g: any) =>
    (g.eligible || []).some((e: string) => e.toLowerCase().includes('county')) ||
    (g.level || '').toLowerCase().includes('county')
  );

  return {
    districtType: 'county', districtId: id,
    displayName,
    state: id === 'cook' ? 'Illinois' : undefined,
    stateAbbr: id === 'cook' ? 'IL' : undefined,
    description: id === 'cook'
      ? 'Cook County is the most populous county in Illinois and the second-most populous county in the United States.'
      : `${displayName} serves its residents through local government services.`,
    population: id === 'cook' ? '5,275,541' : undefined,
    officials: [], events: [],
    agencies: countyAgencies.slice(0, 10).map((a: any) => ({
      id: a.id || a.abbr, name: a.name, type: a.type || 'Agency', level: a.level || 'County',
      description: a.description || '', website: a.website, services: a.services || [],
    })),
    stats: [
      { label: 'Population', value: id === 'cook' ? '5,275,541' : 'N/A' },
      { label: 'Seat', value: id === 'cook' ? 'Chicago' : '' },
      { label: 'State', value: id === 'cook' ? 'IL' : '' },
    ].filter(s => s.value),
    grants: countyGrants.slice(0, 6), elections: [],
  };
}

async function loadStateDistrict(id: string): Promise<DistrictPageData | null> {
  const [states, agencies, grants, elections] = await Promise.all([
    loadStates(), loadStateAgencies(), loadGrants(), loadElections(),
  ]);
  const s = states.find((st) =>
    st.id === id || st.abbreviation?.toLowerCase() === id.toLowerCase() || st.name?.toLowerCase() === id.toLowerCase()
  );
  if (!s) return null;

  const stateAgencies = agencies.filter((a: any) =>
    a.state?.toLowerCase() === s.abbreviation.toLowerCase()
  );

  const stateGrants = grants.filter((g: any) =>
    (g.eligible || []).some((e: string) => e.toLowerCase().includes('state')) ||
    (g.level || '').toLowerCase().includes('state')
  );

  const officials: any[] = [];
  if (s.senators) s.senators.forEach((sen: any, i: number) => {
    officials.push({
      id: `sen-${i}`, name: sen.name, title: 'U.S. Senator', level: 'Federal',
      party: sen.party, contact: { website: sen.website },
    });
  });
  if (s.governor) officials.push({
    id: 'governor', name: s.governor.name, title: 'Governor', level: 'State',
    party: s.governor.party, contact: { website: s.governor.website },
  });

  return {
    districtType: 'state', districtId: id,
    displayName: s.name,
    state: s.name, stateAbbr: s.abbreviation,
    description: `${s.name}. Population: ${s.population?.toLocaleString()}. Capital: ${s.capital}. Legislature: ${s.legislature?.name || 'bicameral'}.`,
    population: s.population?.toLocaleString(),
    officials,
    events: [],
    agencies: stateAgencies.slice(0, 12).map((a: any) => ({
      id: a.id || a.abbr, name: a.name, type: a.type || 'Agency', level: a.level || 'State',
      description: a.description || '', website: a.website, phone: a.phone, email: a.email,
      services: a.services || [],
    })),
    stats: [
      { label: 'Population', value: s.population?.toLocaleString() || 'N/A' },
      { label: 'Capital', value: s.capital || 'N/A' },
      { label: 'Legislature', value: s.legislature?.name || 'N/A' },
      { label: 'U.S. Senators', value: String(s.senators?.length || 0) },
    ],
    grants: stateGrants.slice(0, 6),
    elections: elections.slice(0, 5),
  };
}

async function loadFederalDistrict(): Promise<DistrictPageData | null> {
  const [agencies, grants, calendar] = await Promise.all([
    loadFederalAgencies(), loadGrants(), loadCalendar(),
  ]);

  const fedGrants = grants.filter((g: any) => (g.level || '').toLowerCase() === 'federal');
  const fedElections = calendar.filter((e: any) => e.level === 'federal' && e.event_type === 'election');

  return {
    districtType: 'federal', districtId: 'us',
    displayName: 'United States Federal Government',
    state: 'USA',
    description: 'The federal government of the United States, composed of 50 states, a federal district, five major territories, and several island possessions.',
    population: '334,914,895',
    officials: [
      { id: 'potus', name: 'Joe Biden', title: 'President of the United States', level: 'Federal', party: 'Democratic', contact: { website: 'https://www.whitehouse.gov' } },
      { id: 'vpotus', name: 'Kamala Harris', title: 'Vice President', level: 'Federal', party: 'Democratic', contact: { website: 'https://www.whitehouse.gov' } },
    ],
    events: [],
    agencies: agencies.map((a: any) => ({
      id: a.id || a.abbr, name: a.name, type: 'Federal Agency', level: 'Federal',
      description: a.description || '', website: a.website, services: a.services || [],
    })),
    stats: [
      { label: 'Population', value: '334,914,895' },
      { label: 'States', value: '50' },
      { label: 'Federal Agencies', value: String(agencies.length) },
      { label: 'Branches', value: '3 (Executive, Legislative, Judicial)' },
    ],
    grants: fedGrants.slice(0, 6),
    elections: fedElections,
  };
}

/* ─── Geocoding helpers ─── */
export interface GeocodeResult {
  ward?: string; city?: string; county?: string; state?: string; federal?: 'us';
}

export function lookupDistrictByZip(zip: string): GeocodeResult | null {
  const chicagoZips: Record<string, string> = {
    '60660': '48', '60640': '48', '60659': '48', '60626': '48',
    '60622': '1', '60647': '1', '60642': '2',
    '60615': '5', '60637': '5',
    '60614': '43', '60657': '44', '60601': '42', '60602': '42',
  };
  const ward = chicagoZips[zip] || null;
  if (ward) return { ward, city: 'chicago', county: 'cook', state: 'illinois', federal: 'us' };
  return { federal: 'us' };
}

export function lookupDistrictByAddress(address: string): GeocodeResult | null {
  const lower = address.toLowerCase();
  if (lower.includes('edgewater') || lower.includes('andersonville') || lower.includes('60660') || lower.includes('60640'))
    return { ward: '48', city: 'chicago', county: 'cook', state: 'illinois', federal: 'us' };
  if (lower.includes('wicker park') || lower.includes('60622'))
    return { ward: '1', city: 'chicago', county: 'cook', state: 'illinois', federal: 'us' };
  if (lower.includes('ukrainian village') || lower.includes('60642'))
    return { ward: '2', city: 'chicago', county: 'cook', state: 'illinois', federal: 'us' };
  if (lower.includes('hyde park') || lower.includes('60615') || lower.includes('60637'))
    return { ward: '5', city: 'chicago', county: 'cook', state: 'illinois', federal: 'us' };
  if (lower.includes('lincoln park') || lower.includes('60614'))
    return { ward: '43', city: 'chicago', county: 'cook', state: 'illinois', federal: 'us' };
  if (lower.includes('lakeview') || lower.includes('60657'))
    return { ward: '44', city: 'chicago', county: 'cook', state: 'illinois', federal: 'us' };
  if (lower.includes('loop') || lower.includes('60601') || lower.includes('60602'))
    return { ward: '42', city: 'chicago', county: 'cook', state: 'illinois', federal: 'us' };
  if (lower.includes('chicago'))
    return { ward: '48', city: 'chicago', county: 'cook', state: 'illinois', federal: 'us' };
  const wardMatch = lower.match(/ward\s*(\d+)/i);
  if (wardMatch) return { ward: wardMatch[1], city: 'chicago', county: 'cook', state: 'illinois', federal: 'us' };
  return { federal: 'us' };
}
