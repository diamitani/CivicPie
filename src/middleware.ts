import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── CivicPie Auth Middleware ────────────────────────────────────────────────
// NOTE: Middleware only runs in server mode (not with `output: 'export'`).
// When statically exported, auth gating is handled client-side in the
// (app) layout. This file is ready for when you switch to SSR/Supabase.
//
// PRODUCT RULE (2026-09-14): CivicPie is a FREE civic-information platform.
// The core lookup flow — homepage, /coverage, and district detail pages —
// is PUBLIC and never gated. Only personalized pages (/dashboard) require
// a session.

const PRIVATE_PREFIXES = ['/dashboard'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Only personalized pages require auth; everything else is public.
  const isPrivate = PRIVATE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (!isPrivate) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get('civicpie_session');

  if (!session?.value) {
    const signInUrl = new URL('/signin', request.url);
    signInUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.ico).*)',
  ],
};
