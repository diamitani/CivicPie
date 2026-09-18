'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';

interface CityEntry {
  id: string;
  name: string;
  stateAbbreviation?: string;
  population?: number;
}

const TERRITORIES = [
  { name: 'Puerto Rico', zip: '00901' },
  { name: 'Guam', zip: '96910' },
  { name: 'U.S. Virgin Islands', zip: '00802' },
  { name: 'American Samoa', zip: '96799' },
  { name: 'Northern Mariana Islands', zip: '96950' },
];

async function routeAddressSearch(rawQuery: string): Promise<void> {
  const q = rawQuery.trim();
  if (!q) return;
  try {
    const res = await fetch(`/api/lookup?address=${encodeURIComponent(q)}`);
    const body = await res.json().catch(() => ({}));
    const m = (body.district_id || '').match(/^il-chicago-ward-(\d+)$/);
    if (body.coverage === 'local' && m && m[1] === '48') {
      window.location.href = '/ward/chicago-48';
      return;
    }
    if (body.coverage === 'local' && body.district_href) {
      window.location.href = body.district_href;
      return;
    }
  } catch {
    // fall through to /coverage on any lookup failure
  }
  window.location.href = `/coverage?q=${encodeURIComponent(q)}`;
}

export default function ExplorePage() {
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [cities, setCities] = useState<CityEntry[]>([]);

  useEffect(() => {
    fetch('/data/cities.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setCities(Array.isArray(d) ? d : []))
      .catch(() => setCities([]));
  }, []);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (searching) return;
    setSearching(true);
    try {
      await routeAddressSearch(q);
    } finally {
      setSearching(false);
    }
  }

  // Spotlight the cities with full district pages first.
  const spotlight = cities.filter((c) => ['chicago', 'north-liberty'].includes(c.id));
  const rest = cities.filter((c) => !['chicago', 'north-liberty'].includes(c.id));

  return (
    <ContentShell
      eyebrow="Browse"
      title="Explore"
      intro="Browse the places CivicPie covers in depth — or search any U.S. address or ZIP code to see who represents it."
    >
      <ContentSection heading="Search any address">
        <form onSubmit={handleSearch} className="flex gap-3 mb-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Address or ZIP — e.g. 60660, 52317, 00901"
            className="flex-1 rounded-lg bg-white/[0.06] border border-white/[0.12] px-4 py-3 font-body text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8A030]"
          />
          <button
            type="submit"
            disabled={searching}
            className="font-display text-[14px] font-bold bg-[#C41230] text-white px-6 py-3 rounded-lg hover:bg-[#E8243E] transition-colors disabled:opacity-50"
          >
            {searching ? 'Looking up…' : 'Search'}
          </button>
        </form>
        <P>
          Outside our hyperlocal cities, you'll get federal and state or territorial officials
          for the location — including all five U.S. territories.
        </P>
      </ContentSection>

      {spotlight.length > 0 && (
        <ContentSection heading="Covered in depth">
          <div className="grid gap-4 sm:grid-cols-2">
            {spotlight.map((c) => (
              <Link
                key={c.id}
                href={`/city/${c.id}`}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-[#E8A030]/50 hover:bg-white/[0.05] transition-all"
              >
                <div className="font-display text-lg font-bold text-white">{c.name}</div>
                <div className="font-body text-[13px] text-white/45 mt-1">
                  {c.stateAbbreviation}
                  {typeof c.population === 'number' ? ` · pop. ${c.population.toLocaleString()}` : ''}
                </div>
                <div className="font-body text-[13px] text-[#E8A030] mt-3">Open district page →</div>
              </Link>
            ))}
            <Link
              href="/ward/chicago-48"
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-[#E8A030]/50 hover:bg-white/[0.05] transition-all"
            >
              <div className="font-display text-lg font-bold text-white">Chicago's 48th Ward</div>
              <div className="font-body text-[13px] text-white/45 mt-1">IL · hyperlocal ward page</div>
              <div className="font-body text-[13px] text-[#E8A030] mt-3">Open ward page →</div>
            </Link>
          </div>
        </ContentSection>
      )}

      <ContentSection heading="U.S. territories">
        <P>
          CivicPie covers all five U.S. territories. Search a territory ZIP to see its
          non-voting delegate to Congress and its governor:
        </P>
        <div className="flex flex-wrap gap-2">
          {TERRITORIES.map((t) => (
            <Link
              key={t.zip}
              href={`/coverage?q=${t.zip}`}
              className="rounded-full border border-white/[0.12] bg-white/[0.03] px-4 py-2 font-body text-[13px] text-white/70 hover:text-white hover:border-[#E8A030]/60 transition-all"
            >
              {t.name} · {t.zip}
            </Link>
          ))}
        </div>
      </ContentSection>

      {rest.length > 0 && (
        <ContentSection heading="More cities">
          <P>
            These cities have basic district pages. Hyperlocal official coverage is expanding —
            Chicago and North Liberty are the first fully covered cities.
          </P>
          <div className="grid gap-2 sm:grid-cols-2 max-h-[420px] overflow-y-auto pr-1">
            {rest.map((c) => (
              <Link
                key={c.id}
                href={`/city/${c.id}`}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 font-body text-[14px] text-white/70 hover:text-white hover:border-white/[0.16] transition-all"
              >
                {c.name}
                {c.stateAbbreviation ? <span className="text-white/35"> · {c.stateAbbreviation}</span> : null}
              </Link>
            ))}
          </div>
        </ContentSection>
      )}

      <ContentSection heading="Start from where you are">
        <P>
          The <PageLink href="/">homepage search</PageLink> is the fastest route: one query,
          your district, your officials.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
