/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server mode (was `output: 'export'`). Required for /api/* route handlers
  // and middleware; Vercel serves this as a dynamic Next.js app.
  images: { unoptimized: true },
};

module.exports = nextConfig;
