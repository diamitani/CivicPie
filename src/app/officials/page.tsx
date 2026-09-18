'use client';

import { useState } from 'react';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';

interface OfficialHit {
  id: string;
  name: string;
  office_title?: string;
  district_id?: string | null;
  party?: string | null;
  email?: string | null;
}

function levelLabel(districtId: string | null | undefined): string {
  const d = (districtId || '').toLowerCase();
  if (d.startsWith('us-senate') || d.startsWith('us-house') || d === 'us-federal') return 'Federal';
  if (d.startsWith('us-state')) return 'State / Territory';
  if (d.includes('ward') || d.includes('chicago') || d.includes('north-liberty')) return 'Local';
  return 'Other';
}

export default function OfficialsPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<OfficialHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/officials?q=${encodeURIComponent(query)}&limit=25`);
      const body = await res.json().catch(() => ({}));
      setResults(Array.isArray(body.data) ? body.data : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  return (
    <ContentShell
      eyebrow="Directory"
      title="Officials"
      intro="Search the public officials in CivicPie's dataset — members of Congress, governors and territorial executives, state legislators, and local officials in covered cities. Names, offices, and districts come from public government records."
    >
      <ContentSection heading="Search officials">
        <form onSubmit={runSearch} className="flex gap-3 mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try a name — e.g. Plaskett, Moylan, Hoffman"
            className="flex-1 rounded-lg bg-white/[0.06] border border-white/[0.12] px-4 py-3 font-body text-[15px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8A030]"
          />
          <button
            type="submit"
            disabled={loading}
            className="font-display text-[14px] font-bold bg-[#C41230] text-white px-6 py-3 rounded-lg hover:bg-[#E8243E] transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searched && !loading && results.length === 0 && (
          <P>No officials matched that search. Try a last name, or start from a{' '}
          <PageLink href="/">location search</PageLink> to see everyone who represents an address.</P>
        )}

        <div className="space-y-3">
          {results.map((o) => (
            <div key={o.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-display text-[16px] font-bold text-white">{o.name}</div>
                  <div className="font-body text-[13px] text-[#E8A030] mt-0.5">
                    {o.office_title || 'Official'}
                  </div>
                  <div className="font-body text-[12px] text-white/40 mt-1">
                    {levelLabel(o.district_id)}
                    {o.district_id ? ` · ${o.district_id}` : ''}
                    {o.party ? ` · ${o.party}` : ''}
                  </div>
                </div>
                {o.email && (
                  <a
                    href={`mailto:${o.email}`}
                    className="font-body text-[13px] text-white/60 hover:text-white transition-colors"
                  >
                    {o.email}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </ContentSection>

      <ContentSection heading="Browse by place">
        <P>
          The fastest way to see your full set of representatives is a{' '}
          <PageLink href="/">location search</PageLink> — one address returns your ward or
          city officials, state legislators, governor, and members of Congress together.
        </P>
        <P>
          Covered in depth: <PageLink href="/ward/chicago-48">Chicago's 48th Ward</PageLink> and{' '}
          <PageLink href="/city/north-liberty">North Liberty, Iowa</PageLink>.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
