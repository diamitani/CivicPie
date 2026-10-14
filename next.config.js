/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server mode (was `output: 'export'`). Required for /api/* route handlers
  // and middleware; Vercel serves this as a dynamic Next.js app.
  images: { unoptimized: true },
};

// Sentry wrapper: passes config through untouched when the package's build
// hooks have nothing to do (no DSN / no auth token configured).
let exported = nextConfig;
try {
  const { withSentryConfig } = require('@sentry/nextjs');
  exported = withSentryConfig(nextConfig, {
    silent: true,
    // Don't fail the build if Sentry can't reach its servers.
    disableLogger: true,
  });
} catch {
  // @sentry/nextjs not installed — ship without error monitoring.
}

module.exports = exported;
