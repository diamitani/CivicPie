import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/geocode
 * Converts an address to ward/district information using US Census geocoding
 * and Chicago Data Portal for ward boundaries.
 */
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();
    if (!address || typeof address !== 'string' || address.trim().length < 3) {
      return NextResponse.json({ error: 'Address is required (min 3 characters)' }, { status: 400 });
    }

    // Step 1: Geocode via US Census Bureau
    const geocodeUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address + ', Chicago, IL')}&benchmark=Public_AR_Current&format=json`;

    const geoRes = await fetch(geocodeUrl);
    if (!geoRes.ok) {
      return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 });
    }

    const geoData = await geoRes.json();
    const match = geoData.result?.addressMatches?.[0];

    if (!match) {
      return NextResponse.json({
        error: 'Address not found in Chicago. Try a more specific address or ZIP code.',
        suggestion: 'Example: "6012 N Broadway, Chicago" or "60660"',
      }, { status: 404 });
    }

    const { x: lng, y: lat } = match.coordinates;
    const matchedAddress = match.matchedAddress;

    // Step 2: Find ward via Chicago Data Portal spatial query
    const wardUrl = `https://data.cityofchicago.org/resource/k9yb-bpqx.json?$where=intersects(the_geom, 'POINT(${lng} ${lat})')`;

    const wardRes = await fetch(wardUrl);
    if (!wardRes.ok) {
      return NextResponse.json({
        coordinates: { lat, lng },
        address: matchedAddress,
        ward: null,
        note: 'Could not determine ward. Coordinates found but ward lookup failed.',
      });
    }

    const wardData = await wardRes.json();

    if (!wardData || wardData.length === 0) {
      return NextResponse.json({
        coordinates: { lat, lng },
        address: matchedAddress,
        ward: null,
        note: 'Address is outside Chicago ward boundaries.',
      });
    }

    const wardNumber = wardData[0].ward;

    // Step 3: Get alderperson info
    let alderperson = null;
    try {
      const aldUrl = `https://data.cityofchicago.org/resource/htai-wnw4.json?ward=${wardNumber}`;
      const aldRes = await fetch(aldUrl);
      if (aldRes.ok) {
        const aldData = await aldRes.json();
        if (aldData && aldData.length > 0) {
          const raw = aldData[0];
          let name = raw.alderman || '';
          if (name.includes(',')) {
            const parts = name.split(',').map((p: string) => p.trim());
            name = `${parts[1]} ${parts[0]}`;
          }
          alderperson = {
            name,
            title: 'Alderperson',
            ward: raw.ward,
            phone: raw.ward_phone || raw.city_hall_phone || null,
            email: raw.email || null,
            website: raw.website?.url || null,
          };
        }
      }
    } catch {
      // Alderperson lookup is best-effort
    }

    return NextResponse.json({
      coordinates: { lat, lng },
      address: matchedAddress,
      ward: wardNumber,
      alderperson,
    });
  } catch (error) {
    console.error('Geocode error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/geocode?address=...
 * Simplified GET endpoint
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: '?address= parameter required' }, { status: 400 });
  }

  // Reuse POST logic
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({ address }),
  });

  return POST(mockRequest);
}
