// District data loading utilities for CivicPie
// All data lives in public/data/ as static JSON files

export type DistrictType = 'ward' | 'city' | 'county' | 'state' | 'federal';

export const DISTRICT_TYPE_LABELS: Record<DistrictType, string> = {
  ward: 'Ward', city: 'City', county: 'County', state: 'State', federal: 'National',
};

export interface DistrictPageData {
  displayName: string;
  districtType: DistrictType;
  description: string;
  city?: string;
  state: string;
  stateAbbr?: string;
  neighborhoods?: string[];
  stats: Array<{ label: string; value: string }>;
  officials: any[];
  events: any[];
  elections: any[];
  agencies: any[];
  grants: any[];
  civicGroups: any[];
}

let _cache: Record<string, any> = {};

async function loadJson(filename: string): Promise<any> {
  if (_cache[filename]) return _cache[filename];
  const res = await fetch(`/data/${filename}`);
  if (!res.ok) return null;
  _cache[filename] = await res.json();
  return _cache[filename];
}

export async function loadDistrictPageData(
  type: DistrictType, id: string
): Promise<DistrictPageData | null> {
  try {
    if (type === 'ward') {
      const wd = await loadJson('ward_data.json');
      const dir = await loadJson('ward_directory.json');
      if (!wd) return null;
      const meta = wd.districtMeta;
      return {
        displayName: id.includes('48') ? (meta?.name || '48th Ward') : `Ward ${id.replace(/\D/g, '')}`,
        districtType: 'ward',
        description: meta?.description || `The ${id} Ward of Chicago.`,
        city: meta?.city || 'Chicago',
        state: meta?.state || 'Illinois',
        stateAbbr: 'IL',
        neighborhoods: meta?.neighborhoods || [],
        stats: (wd.quickStats || []).slice(0, 5).map((s: any) => ({ label: s.label, value: s.value })),
        officials: wd.officials || [],
        events: wd.events || [],
        elections: [
          { name: '2026 General Election', election_type: 'General', schedule: 'Nov 3, 2026', next_date: 'Nov 3, 2026', level: 'all' },
        ],
        agencies: wd.agencies || [],
        grants: [
          { program: 'Community Development Block Grant', agency: 'City of Chicago', type: 'Housing', amount_range: 'Up to $50K', deadline_note: 'Rolling' },
          { program: 'Small Business Improvement Fund', agency: 'City of Chicago', type: 'Business', amount_range: 'Up to $150K', deadline_note: 'Quarterly' },
        ],
        civicGroups: wd.civicGroups || [],
      };
    }

    if (type === 'state') {
      const states = await loadJson('states.json');
      const state = states?.find((s: any) =>
        s.id === id || s.abbreviation?.toLowerCase() === id.toLowerCase()
      );
      if (!state) return null;
      return {
        displayName: state.name,
        districtType: 'state',
        description: `${state.name} — population ${(state.population / 1000000).toFixed(1)} million. Capital: ${state.capital}.`,
        state: state.name,
        stateAbbr: state.abbreviation,
        stats: [
          { label: 'Population', value: state.population?.toLocaleString() || 'N/A' },
          { label: 'Capital', value: state.capital || 'N/A' },
          { label: 'Legislature', value: state.legislature?.name || 'N/A' },
        ],
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
        events: [],
        elections: [],
        agencies: [],
        grants: [],
        civicGroups: [],
      };
    }

    if (type === 'city') {
      const cities = await loadJson('cities.json');
      const city = cities?.find((c: any) => c.id === id);
      if (!city) return null;
      return {
        displayName: city.name,
        districtType: 'city',
        description: `${city.name} — population ${(city.population / 1000000).toFixed(1)} million. ${city.governmentType || ''}`,
        state: city.stateAbbreviation || '',
        stateAbbr: city.stateAbbreviation,
        stats: [
          { label: 'Population', value: city.population?.toLocaleString() || 'N/A' },
          { label: 'Government', value: city.governmentType || 'N/A' },
        ],
        officials: [],
        events: [],
        elections: [],
        agencies: [],
        grants: [],
        civicGroups: [],
      };
    }

    if (type === 'county') {
      return {
        displayName: 'Cook County',
        districtType: 'county',
        description: 'Cook County, Illinois — population 5.2 million. The second-most populous county in the United States.',
        state: 'Illinois',
        stateAbbr: 'IL',
        stats: [
          { label: 'Population', value: '5,194,675' },
          { label: 'County Seat', value: 'Chicago' },
        ],
        officials: [
          { id: 'preckwinkle', name: 'Toni Preckwinkle', title: 'Cook County Board President', level: 'County', party: 'Democratic', contact: { website: 'https://www.cookcountyil.gov/agency/board-president' } },
        ],
        events: [],
        elections: [],
        agencies: [],
        grants: [],
        civicGroups: [],
      };
    }

    if (type === 'federal') {
      return {
        displayName: 'United States',
        districtType: 'federal',
        description: 'Federal government of the United States of America. Find your Congressional representatives, federal agencies, and national elections.',
        state: 'USA',
        stats: [
          { label: 'Population', value: '334 million' },
          { label: 'Congress', value: '535 members' },
        ],
        officials: [],
        events: [],
        elections: [
          { name: '2026 Midterm Elections', election_type: 'Midterm', schedule: 'Nov 3, 2026', next_date: 'Nov 3, 2026', level: 'federal' },
          { name: '2028 Presidential Election', election_type: 'Presidential', schedule: 'Nov 7, 2028', next_date: 'Nov 7, 2028', level: 'federal' },
        ],
        agencies: [],
        grants: [],
        civicGroups: [],
      };
    }

    return null;
  } catch (e) {
    console.error('loadDistrictPageData error:', e);
    return null;
  }
}

// Old API preserved for backward compatibility
export async function getDistrict(type: string, id: string) {
  return loadDistrictPageData(type as DistrictType, id);
}

export async function loadStates() { return loadJson('states.json'); }
export async function loadCities() { return loadJson('cities.json'); }
