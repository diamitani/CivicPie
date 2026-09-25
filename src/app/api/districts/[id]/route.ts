import { NextRequest, NextResponse } from 'next/server';
import { getDistrict, meta } from '@/lib/civic/db';

export const dynamic = 'force-dynamic';

// GET /api/districts/[id] — one district with its officials + counts.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const district = await getDistrict(id);
    if (!district) {
      return NextResponse.json({ error: 'District not found', meta: await meta() }, { status: 404 });
    }
    return NextResponse.json({ ok: true, meta: await meta(), data: district });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
