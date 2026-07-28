import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── CivicPie Auth Middleware ────────────────────────────────────────────────
// NOTE: Middleware only runs in server mode (not with `output: 'export'`).
// When statically exported, auth gating is handled client-side in the
// (app) layout. This file is ready for when you switch to SSR/Supabase.

const PUBLIC_PATHS = ['/signin', '/signup', '/'];
const PUBLIC_PREFIXES = ['/api/', '/_next/', '/favicon'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const session = request.cookies.get('civicpie_session');

  if (!session?.value) {
    const signInUrl = new URL('/signin', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.ico).*)',
  ],
};
