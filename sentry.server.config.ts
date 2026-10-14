// Sentry server config — no-ops gracefully when no DSN is configured.
// To enable: set SENTRY_DSN in Vercel env vars.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.query_string) delete event.request.query_string;
      return event;
    },
  });
}
