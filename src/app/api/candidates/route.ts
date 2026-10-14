import { NextRequest, NextResponse } from 'next/server';
import { searchCandidates, meta } from '@/lib/civic/db';

export const dynamic = 'force-dynamic';

// GET /api/candidates?district_id=&office=&limit=
// Paged (max 200 rows/page); `total` always reports the full match count.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  try {
    const { data, total } = await searchCandidates({
      district_id: sp.get('district_id') || undefined,
      office: sp.get('office') || undefined,
      limit: sp.get('limit') ? parseInt(sp.get('limit')!) : undefined,
    });
    return NextResponse.json({ ok: true, meta: await meta(), total, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
