import { NextRequest, NextResponse } from 'next/server';
import { searchAgencies, meta } from '@/lib/civic/db';

export const dynamic = 'force-dynamic';

// GET /api/agencies?level=federal
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  try {
    const data = await searchAgencies({ level: sp.get('level') || undefined });
    return NextResponse.json({ ok: true, meta: await meta(), total: data.length, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
