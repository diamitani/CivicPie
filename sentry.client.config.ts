// Sentry client config — no-ops gracefully when no DSN is configured.
// To enable: set NEXT_PUBLIC_SENTRY_DSN (or SENTRY_DSN) in Vercel env vars.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // CivicPie handles address searches; never attach them to error reports.
    beforeSend(event) {
      if (event.request?.query_string) delete event.request.query_string;
      return event;
    },
  });
}
