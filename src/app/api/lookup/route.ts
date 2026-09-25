import { NextRequest, NextResponse } from 'next/server';
import { lookupAddress, meta } from '@/lib/civic/db';

export const dynamic = 'force-dynamic';

// GET /api/lookup?address=… → geocode → ward district → officials for that district.
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim();
  if (!address) {
    return NextResponse.json({ error: '?address= parameter required' }, { status: 400 });
  }
  try {
    const result = await lookupAddress(address);
    return NextResponse.json({ ok: true, meta: await meta(), ...result });
  } catch (e: any) {
    if (e.status === 404) {
      return NextResponse.json({ error: e.message, meta: await meta() }, { status: 404 });
    }
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
