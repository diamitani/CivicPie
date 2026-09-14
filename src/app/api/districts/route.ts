import { NextRequest, NextResponse } from 'next/server';
import { searchDistricts, meta } from '@/lib/civic/db';

export const dynamic = 'force-dynamic';

// GET /api/districts?type=ward&city=Chicago&state=IL
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  try {
    const data = await searchDistricts({
      type: sp.get('type') || undefined,
      city: sp.get('city') || undefined,
      state: sp.get('state') || undefined,
    });
    return NextResponse.json({ ok: true, meta: meta(), total: data.length, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
