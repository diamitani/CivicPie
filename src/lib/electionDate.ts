// The one place the site's election date lives. Safe for client and server.
//
// Compared on the viewer's *local calendar date*, so a voter in Hawaii sees
// "Election Day is today" all of Nov. 3 local time — not a UTC-shifted count.

export const ELECTION_DATE_ISO = '2026-11-03';
export const ELECTION_DATE_LABEL = 'Tuesday, November 3, 2026';

export type ElectionPhase = 'before' | 'today' | 'after';

export function electionPhase(now: Date = new Date()): { phase: ElectionPhase; days: number } {
  const [y, m, d] = ELECTION_DATE_ISO.split('-').map(Number);
  const election = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((election - today) / 86400000);
  if (days > 0) return { phase: 'before', days };
  if (days === 0) return { phase: 'today', days: 0 };
  return { phase: 'after', days: -days };
}

/** Short status for badges and stat tiles, e.g. "12 days", "Today", "Nov 3". */
export function electionBadgeText(now: Date = new Date()): string {
  const { phase, days } = electionPhase(now);
  if (phase === 'before') return days === 1 ? '1 day' : `${days} days`;
  if (phase === 'today') return 'Today';
  return 'Nov 3';
}
