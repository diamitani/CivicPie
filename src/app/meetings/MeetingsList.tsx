'use client';

import { useEffect, useState } from 'react';

interface MeetingHit {
  id: string | null;
  title: string;
  body: string | null;
  date: string;
  time: string | null;
  location: string | null;
  is_virtual: boolean;
  source_url: string | null;
  agenda_url: string | null;
  detail_url: string | null;
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MeetingsList() {
  const [meetings, setMeetings] = useState<MeetingHit[]>([]);
  const [mode, setMode] = useState<'upcoming' | 'recent'>('upcoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const up = await (await fetch('/api/meetings?upcoming=1&limit=10')).json().catch(() => ({}));
        if (Array.isArray(up.data) && up.data.length > 0) {
          setMeetings(up.data);
          setMode('upcoming');
        } else {
          const rec = await (await fetch('/api/meetings?limit=10')).json().catch(() => ({}));
          setMeetings(Array.isArray(rec.data) ? rec.data : []);
          setMode('recent');
        }
      } catch {
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="font-body text-[14px] text-white/40">Loading meetings…</p>;
  }
  if (meetings.length === 0) {
    return (
      <p className="font-body text-[14px] text-white/55">
        No scraped meetings are in the dataset right now — the weekly scrape refreshes this list.
      </p>
    );
  }

  return (
    <div>
      <p className="font-body text-[13px] text-white/40 mb-4">
        {mode === 'upcoming' ? 'Upcoming meetings' : 'Most recent meetings'} from official calendars,
        refreshed weekly by the CivicPie scraper.
      </p>
      <div className="space-y-3">
        {meetings.map((m, i) => (
          <div key={m.id || i} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-gold mb-1">
              {m.body || 'Public body'}
            </div>
            <div className="font-display text-[16px] font-bold text-white">{m.title}</div>
            <div className="font-body text-[13px] text-white/55 mt-1">
              {fmtDate(m.date)}
              {m.time ? ` · ${m.time}` : ''}
              {m.is_virtual ? ' · Virtual' : ''}
            </div>
            {m.location && (
              <div className="font-body text-[13px] text-white/40 mt-0.5">{m.location}</div>
            )}
            {(m.agenda_url || m.detail_url || m.source_url) && (
              <div className="mt-2">
                <a
                  href={m.agenda_url || m.detail_url || m.source_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-[13px] text-gold hover:text-gold-light transition-colors"
                >
                  Official source ↗
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
