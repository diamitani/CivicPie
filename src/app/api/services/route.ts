import { NextRequest, NextResponse } from 'next/server';
import { searchServices, servicesMeta } from '@/lib/services';

export const dynamic = 'force-dynamic';

// GET /api/services?q=&state=&category=&level=&limit=&offset=
// Paged (max 100 rows/page); `total` always reports the full match count.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  try {
    const { total, data } = searchServices({
      q: sp.get('q') || undefined,
      state: sp.get('state') || undefined,
      category: sp.get('category') || undefined,
      level: sp.get('level') || undefined,
      limit: sp.get('limit') ? parseInt(sp.get('limit')!) : undefined,
      offset: sp.get('offset') ? parseInt(sp.get('offset')!) : undefined,
    });
    return NextResponse.json({ ok: true, total, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
