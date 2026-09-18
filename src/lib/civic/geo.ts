// Geocoding (US Census, no key) + ZIP fallback (zippopotam.us, no key)
// + point-in-polygon for ward assignment.

export interface GeocodeResult {
  lat: number;
  lng: number;
  matchedAddress: string;
  city?: string;
  state_abbr?: string;
  state_name?: string;
}

// USPS abbreviation → full name (50 states + DC + US territories), for coverage messaging.
export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands',
  AS: 'American Samoa', MP: 'Northern Mariana Islands',
};

// Territory ZIP ranges. zippopotam.us (our free ZIP lookup) returns 404 for
// most territory ZIPs, and the Census onelineaddress endpoint is unreliable for
// bare territory ZIPs — so resolve territory ZIPs from this curated range table
// instead. Ranges are 5-digit ZIP intervals (inclusive) with a representative
// capital-city coordinate, used only for district assignment.
const TERRITORY_ZIP_RANGES: {
  lo: string; hi: string; abbr: string; city: string; lat: number; lng: number;
}[] = [
  { lo: '00600', hi: '00799', abbr: 'PR', city: 'San Juan', lat: 18.4655, lng: -66.1057 },
  { lo: '00800', hi: '00899', abbr: 'VI', city: 'Charlotte Amalie', lat: 18.3419, lng: -64.9307 },
  { lo: '00900', hi: '00999', abbr: 'PR', city: 'San Juan', lat: 18.4655, lng: -66.1057 },
  { lo: '96799', hi: '96799', abbr: 'AS', city: 'Pago Pago', lat: -14.2710, lng: -170.1322 },
  { lo: '96910', hi: '96932', abbr: 'GU', city: 'Hagåtña', lat: 13.4443, lng: 144.7937 },
  { lo: '96950', hi: '96952', abbr: 'MP', city: 'Saipan', lat: 15.1778, lng: 145.7505 },
];

function territoryForZip(zip5: string) {
  return TERRITORY_ZIP_RANGES.find((r) => zip5 >= r.lo && zip5 <= r.hi) || null;
}

const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
const ZIPPO_URL = 'https://api.zippopotam.us/us';

const ZIP_RE = /^\d{5}(-\d{4})?$/;

// Bare ZIP codes don't resolve via the Census onelineaddress endpoint, so
// resolve them through zippopotam.us (free, no key) instead.
async function geocodeZip(zip: string): Promise<GeocodeResult | null> {
  const zip5 = zip.slice(0, 5);
  // Territory ZIPs resolve from our curated table first (free lookup APIs
  // don't cover them reliably).
  const terr = territoryForZip(zip5);
  if (terr) {
    return {
      lat: terr.lat,
      lng: terr.lng,
      matchedAddress: `${terr.city}, ${terr.abbr} ${zip5}`,
      city: terr.city,
      state_abbr: terr.abbr,
      state_name: US_STATES[terr.abbr],
    };
  }
  try {
    const res = await fetch(`${ZIPPO_URL}/${zip}`, { headers: { 'User-Agent': 'civicpie/2.0' } });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place?.latitude || !place?.longitude) return null;
    const abbr = String(place['state abbreviation'] || '').toUpperCase();
    const city = place['place name'] || '';
    return {
      lat: Number(place.latitude),
      lng: Number(place.longitude),
      matchedAddress: [city, abbr, zip].filter(Boolean).join(', '),
      city: city || undefined,
      state_abbr: abbr || undefined,
      state_name: US_STATES[abbr] || place.state || undefined,
    };
  } catch {
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const trimmed = address.trim();
  if (ZIP_RE.test(trimmed)) {
    const z = await geocodeZip(trimmed.slice(0, 5));
    if (z) return z;
    // fall through to Census on zippopotam failure
  }
  const url =
    `${CENSUS_URL}?address=${encodeURIComponent(trimmed)}` +
    `&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'civicpie/2.0' } });
  if (!res.ok) throw new Error(`Census geocoder returned HTTP ${res.status}`);
  const data = await res.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  const abbr = String(match.addressComponents?.state || '').toUpperCase();
  const city = String(match.addressComponents?.city || '').trim();
  return {
    lat: match.coordinates.y,
    lng: match.coordinates.x,
    matchedAddress: match.matchedAddress,
    city: city || undefined,
    state_abbr: abbr || undefined,
    state_name: US_STATES[abbr] || undefined,
  };
}

// Ray-casting on a single linear ring. Ring coords are [lng, lat].
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInMultiPolygon(
  lng: number,
  lat: number,
  multi: number[][][][]
): boolean {
  for (const poly of multi) {
    if (!poly.length) continue;
    if (pointInRing(lng, lat, poly[0])) {
      let inHole = false;
      for (let h = 1; h < poly.length; h++) {
        if (pointInRing(lng, lat, poly[h])) {
          inHole = true;
          break;
        }
      }
      if (!inHole) return true;
    }
  }
  return false;
}

export function wardForPoint(
  wards: { district_id: string; polygons: number[][][][] }[],
  lat: number,
  lng: number
): string | null {
  for (const w of wards) {
    if (pointInMultiPolygon(lng, lat, w.polygons)) return w.district_id;
  }
  return null;
}
