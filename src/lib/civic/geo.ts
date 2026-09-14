// Geocoding (US Census, no key) + point-in-polygon for ward assignment.

export interface GeocodeResult {
  lat: number;
  lng: number;
  matchedAddress: string;
}

const CENSUS_URL = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const url =
    `${CENSUS_URL}?address=${encodeURIComponent(address)}` +
    `&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'civicpie/2.0' } });
  if (!res.ok) throw new Error(`Census geocoder returned HTTP ${res.status}`);
  const data = await res.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  return {
    lat: match.coordinates.y,
    lng: match.coordinates.x,
    matchedAddress: match.matchedAddress,
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
