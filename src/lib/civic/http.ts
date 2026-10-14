import { NextResponse } from 'next/server';

// Server-side failures: log the real error for us, return a generic message to the caller
// (raw e.message can carry connection strings, hostnames or SQL).
export function serverError(e: unknown, where: string, status = 500, publicMessage = 'Internal server error') {
  console.error(`[civicpie] ${where} failed:`, e);
  return NextResponse.json({ error: publicMessage }, { status });
}
