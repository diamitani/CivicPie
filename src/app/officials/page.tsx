'use client';

import { useState } from 'react';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';
import { SearchRow, Badge, partyBadgeVariant } from '@/components/ui';

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
        <div className="mb-6">
          <SearchRow
            value={q}
            onChange={setQ}
            onSubmit={() => runSearch()}
            placeholder="Try a name — e.g. Plaskett, Moylan, Hoffman"
            buttonLabel="Search"
            loading={loading}
            loadingLabel="Searching…"
          />
        </div>

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
                  <div className="font-body text-[13px] text-gold mt-0.5">
                    {o.office_title || 'Official'}
                  </div>
                  <div className="font-body text-[12px] text-white/40 mt-1 flex items-center gap-2 flex-wrap">
                    <span>
                      {levelLabel(o.district_id)}
                      {o.district_id ? ` · ${o.district_id}` : ''}
                    </span>
                    {o.party && <Badge variant={partyBadgeVariant(o.party)}>{o.party}</Badge>}
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
