import { NextRequest, NextResponse } from 'next/server';
import { serverError } from '@/lib/civic/http';
import { searchMeetings, meta } from '@/lib/civic/db';

export const dynamic = 'force-dynamic';

// GET /api/meetings?upcoming=1&limit=
// Default: most recent first. upcoming=1: today onward, soonest first.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  try {
    const { data, total } = await searchMeetings({
      upcoming: sp.get('upcoming') === '1',
      limit: sp.get('limit') ? parseInt(sp.get('limit')!) : undefined,
    });
    return NextResponse.json({ ok: true, meta: await meta(), total, data });
  } catch (e: any) {
    return serverError(e, 'meetings');
  }
}
