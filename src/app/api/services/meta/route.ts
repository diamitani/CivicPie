import { NextResponse } from 'next/server';
import { servicesMeta } from '@/lib/services';

export const dynamic = 'force-dynamic';

// GET /api/services/meta → { total, states[], categories[], levels[] } for filter selects
export async function GET() {
  try {
    return NextResponse.json({ ok: true, ...servicesMeta() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
