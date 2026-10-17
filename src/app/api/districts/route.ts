import { NextRequest, NextResponse } from 'next/server';
import { serverError } from '@/lib/civic/http';
import { searchDistrictsPaged, meta } from '@/lib/civic/db';

export const dynamic = 'force-dynamic';

// GET /api/districts?type=ward&city=Chicago&state=IL&limit=100&offset=0  (page max 500; `total` = all matches)
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  try {
    const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
    const { data, total } = await searchDistrictsPaged({
      type: sp.get('type') || undefined,
      city: sp.get('city') || undefined,
      state: sp.get('state') || undefined,
      limit: Number.isFinite(num('limit')) ? num('limit') : undefined,
      offset: Number.isFinite(num('offset')) ? num('offset') : undefined,
    });
    return NextResponse.json({ ok: true, meta: await meta(), total, count: data.length, data });
  } catch (e: any) {
    return serverError(e, 'districts');
  }
}
