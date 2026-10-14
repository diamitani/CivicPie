import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Cache loaded data to avoid repeated filesystem reads
let _wardData: any = null;
let _directoryData: any = null;
let _statesData: any = null;
let _citiesData: any = null;

function loadData(filename: string) {
  const dataDir = join(process.cwd(), 'public', 'data');
  const filepath = join(dataDir, filename);
  if (!existsSync(filepath)) return null;
  return JSON.parse(readFileSync(filepath, 'utf-8'));
}

function getWardData() {
  if (!_wardData) _wardData = loadData('ward_data.json');
  return _wardData;
}

function getDirectoryData() {
  if (!_directoryData) _directoryData = loadData('ward_directory.json');
  return _directoryData;
}

function getStates() {
  if (!_statesData) _statesData = loadData('states.json');
  return _statesData;
}

function getCities() {
  if (!_citiesData) _citiesData = loadData('cities.json');
  return _citiesData;
}

/**
 * GET /api/ward/[id]
 * Returns complete ward data for a given ward number.
 *
 * Currently serves 48th Ward pilot data as the primary dataset.
 * Future: load per-ward data from individual ward files.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wardId = id.toLowerCase();

  const wardData = getWardData();
  if (!wardData) {
    return NextResponse.json({ error: 'Ward data not available' }, { status: 500 });
  }

  // For v1, 48th Ward is the pilot with full data
  // Other wards get basic info scaffolded from the 48th data structure
  if (wardId === '48' || wardId === '48th' || wardId === '48thward') {
    return NextResponse.json({
      ward: wardData,
      directory: getDirectoryData(),
      _meta: {
        pilot: true,
        note: '48th Ward is the pilot dataset with full community data.',
      },
    });
  }

  // For other wards, return a scaffold with state/city context
  const states = getStates();
  const cities = getCities();
  const il = states?.find((s: any) => s.abbreviation === 'IL');
  const chicago = cities?.find((c: any) => c.id === 'chicago');

  return NextResponse.json({
    ward: {
      districtMeta: {
        id: `${wardId}ward`,
        name: `${wardId}${getOrdinalSuffix(parseInt(wardId))} Ward`,
        city: 'Chicago',
        state: 'Illinois',
        description: `The ${wardId}${getOrdinalSuffix(parseInt(wardId))} Ward of Chicago. Full community data coming soon.`,
        population: '55,000+ (estimated)',
        neighborhoods: [],
        totalEntities: 0,
      },
      officials: il ? [
        { id: 'mayor', name: il.governor?.name || 'Brandon Johnson', title: 'Mayor of Chicago', level: 'City' },
        ...(il.senators?.map((s: any) => ({ id: s.name.toLowerCase().replace(/\s+/g, '-'), name: s.name, title: 'US Senator', level: 'Federal', party: s.party })) || []),
      ] : [],
      events: [],
      agencies: [],
      civicGroups: [],
    },
    directory: {},
    _meta: {
      pilot: false,
      note: 'Full community data not yet available for this ward. Check back soon or explore the 48th Ward pilot.',
      pilot_ward: 48,
    },
  });
}

function getOrdinalSuffix(n: number): string {
  if (n > 3 && n < 21) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}
