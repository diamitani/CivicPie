import { NextResponse } from 'next/server';
import { serverError } from '@/lib/civic/http';
import { getService } from '@/lib/services';

export const dynamic = 'force-dynamic';

// GET /api/services/[id] → full service record
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const service = getService(id);
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: service });
  } catch (e: any) {
    return serverError(e, 'services/[id]');
  }
}
