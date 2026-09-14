import { NextRequest, NextResponse } from 'next/server';
import { searchOfficials, meta } from '@/lib/civic/db';

export const dynamic = 'force-dynamic';

// GET /api/officials?district_id=&office=&level=&q=&limit=
// Paged (max 200 rows/page); `total` always reports the full match count.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const level = sp.get('level');
  try {
    const { data, total } = await searchOfficials({
      district_id: sp.get('district_id') || undefined,
      office: sp.get('office') || undefined,
      level: level === 'federal' || level === 'state' || level === 'local' ? level : undefined,
      q: sp.get('q') || undefined,
      limit: sp.get('limit') ? parseInt(sp.get('limit')!) : undefined,
    });
    return NextResponse.json({ ok: true, meta: meta(), total, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
