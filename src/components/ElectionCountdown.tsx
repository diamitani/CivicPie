'use client';

// Client-only election status text. Server HTML renders a neutral placeholder,
// then the real value fills in after mount — so a page built days ago can never
// show a stale countdown (the old homepage HTML said "13 days" on Election Day).

import { useEffect, useState } from 'react';
import { electionPhase, type ElectionPhase } from '@/lib/electionDate';

function useElectionPhase() {
  const [state, setState] = useState<{ phase: ElectionPhase; days: number } | null>(null);
  useEffect(() => {
    const tick = () => setState(electionPhase());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  return state;
}

/** Big number for stat tiles: days left, "Today", or "Nov 3" once past. */
export function ElectionStatValue() {
  const s = useElectionPhase();
  if (!s) return <>Nov 3</>;
  if (s.phase === 'before') return <>{s.days}</>;
  if (s.phase === 'today') return <>Today</>;
  return <>Nov 3</>;
}

/** Label under the stat tile. */
export function ElectionStatLabel() {
  const s = useElectionPhase();
  if (!s) return <>General Election · Nov 3</>;
  if (s.phase === 'before') return <>{s.days === 1 ? 'Day' : 'Days'} to General Election · Nov 3</>;
  if (s.phase === 'today') return <>Election Day · Polls open now</>;
  return <>General Election · Results being counted</>;
}

/** Sentence fragment: "is 5 days away" / "is today" / "was Nov 3". */
export function ElectionSentence({ prefix = 'The ballot' }: { prefix?: string }) {
  const s = useElectionPhase();
  if (!s) return <>{prefix} is on Nov 3.</>;
  if (s.phase === 'before') return <>{prefix} is {s.days} {s.days === 1 ? 'day' : 'days'} away.</>;
  if (s.phase === 'today') return <>Election Day is today.</>;
  return <>Election Day was Nov 3.</>;
}

export function useElectionStatus() {
  return useElectionPhase();
}
