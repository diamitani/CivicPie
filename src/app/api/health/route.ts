import { NextResponse } from 'next/server';
import { serverError } from '@/lib/civic/http';
import { getHealth } from '@/lib/civic/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getHealth());
  } catch (e: any) {
    return serverError(e, 'health');
  }
}
