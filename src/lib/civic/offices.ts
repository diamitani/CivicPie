// Office-id → human title + level mapping.
// Kept in code (not read from the `offices` table) because the current
// ingest.py does not populate that table; the mapping is identical for
// seed and Supabase modes.

const TITLES: Record<string, { title: string; level: 'federal' | 'state' | 'local' }> = {
  'us-president': { title: 'President of the United States', level: 'federal' },
  'us-vp': { title: 'Vice President of the United States', level: 'federal' },
  'us-vice-president': { title: 'Vice President of the United States', level: 'federal' },
  'us-cabinet': { title: 'Cabinet Secretary', level: 'federal' },
  'us-senate': { title: 'U.S. Senator', level: 'federal' },
  'us-house': { title: 'U.S. Representative', level: 'federal' },
  'gen-state-rep': { title: 'State Representative', level: 'state' },
  'gen-state-sen': { title: 'State Senator', level: 'state' },
  'gen-state-exec': { title: 'State Executive Officer', level: 'state' },
  'il-state-rep': { title: 'Illinois State Representative', level: 'state' },
  'il-state-sen': { title: 'Illinois State Senator', level: 'state' },
  'chi-alderman': { title: 'Alderperson', level: 'local' },
};

export function officeTitle(officeId: string): string {
  return TITLES[officeId]?.title ?? officeId;
}

export function levelOf(officeId: string): 'federal' | 'state' | 'local' {
  const known = TITLES[officeId]?.level;
  if (known) return known;
  if (officeId.startsWith('us-')) return 'federal';
  if (officeId.startsWith('chi-')) return 'local';
  return 'state';
}
