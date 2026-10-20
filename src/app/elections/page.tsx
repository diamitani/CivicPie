'use client';

import { useState } from 'react';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';
import { SearchRow, Badge, partyBadgeVariant } from '@/components/ui';

interface CandidateHit {
  id: string;
  name: string;
  office_title?: string;
  district_id?: string | null;
  state_abbr?: string | null;
  party?: string | null;
  incumbent?: boolean;
}

const STATES = [
  'AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA',
  'MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR',
  'PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY',
];

// FEC filings store names as "Last, First" — flip them for display.
function displayName(raw: string): string {
  const i = raw.indexOf(', ');
  if (i < 0) return raw;
  const last = raw.slice(0, i).trim();
  const rest = raw.slice(i + 2).trim();
  return rest ? `${rest} ${last}` : raw;
}

export default function ElectionsPage() {
  const [q, setQ] = useState('');
  const [state, setState] = useState('');
  const [results, setResults] = useState<CandidateHit[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '25' });
      if (q.trim()) params.set('q', q.trim());
      if (state) params.set('state', state);
      const res = await fetch(`/api/candidates?${params.toString()}`);
      const body = await res.json().catch(() => ({}));
      setResults(Array.isArray(body.data) ? body.data : []);
      setTotal(typeof body.total === 'number' ? body.total : 0);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  return (
    <ContentShell
      eyebrow="Civic life"
      title="Elections"
      intro="CivicPie is strictly nonpartisan: we show you when elections happen and how to participate — never who to vote for, and never partisan framing. Dates below are the next scheduled general elections."
    >
      <ContentSection heading="Upcoming elections">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
          <div>
            <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-gold mb-1">
              Federal general election
            </div>
            <div className="font-display text-2xl font-black text-white">Tuesday, November 3, 2026</div>
            <p className="font-body text-[14px] text-white/55 mt-2">
              U.S. House of Representatives, one-third of the U.S. Senate, plus state and local
              offices depending on where you live. Illinois and Iowa both hold their general
              elections on this date.
            </p>
          </div>
        </div>
        <P>
          Municipal election calendars vary by city. Chicago's next municipal election cycle and
          North Liberty's city elections follow their own schedules — check your state or local
          election authority for the exact dates and what's on your ballot.
        </P>
      </ContentSection>

      <ContentSection heading="Check your registration">
        <P>
          Registration deadlines and rules differ by state. The fastest way to check your status
          or register is through the federal portal at{' '}
          <a href="https://vote.gov" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors">
            vote.gov ↗
          </a>
          , which routes you to your state's official registration site.
        </P>
        <P>
          Your polling place, early-voting locations, and sample ballot are published by your
          state or county election authority ahead of each election — not by CivicPie.
        </P>
      </ContentSection>

      <ContentSection heading="Candidates">
        <P>
          Search the candidates in CivicPie's dataset — 7,077 filings from Federal Election
          Commission records. Search by last name, narrow by state, or leave both blank and pick
          a state to browse. Filing data is shown exactly as reported; your state election
          authority publishes the official ballot list for your district.
        </P>
        <form onSubmit={runSearch} className="mb-6 space-y-3">
          <SearchRow
            value={q}
            onChange={setQ}
            onSubmit={() => runSearch()}
            placeholder="Try a last name — e.g. Smith, Garcia, Johnson"
            buttonLabel="Search"
            loading={loading}
            loadingLabel="Searching…"
          />
          <div className="flex items-center gap-3">
            <label htmlFor="cand-state" className="font-body text-[13px] text-white/50">
              State
            </label>
            <select
              id="cand-state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-2 font-body text-[14px] text-white"
            >
              <option value="">All states</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {searched && !loading && (
              <span className="font-body text-[13px] text-white/40">
                {total.toLocaleString()} candidate{total === 1 ? '' : 's'} found
              </span>
            )}
          </div>
        </form>

        {searched && !loading && results.length === 0 && (
          <P>
            No candidates matched that search. Try a last name only, or a different state.
          </P>
        )}

        <div className="space-y-3">
          {results.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-display text-[16px] font-bold text-white">{displayName(c.name)}</div>
                  <div className="font-body text-[13px] text-gold mt-0.5">
                    Candidate · {c.office_title || 'Office'}
                  </div>
                  <div className="font-body text-[12px] text-white/40 mt-1 flex items-center gap-2 flex-wrap">
                    <span>
                      {c.state_abbr || ''}
                      {c.district_id ? ` · ${c.district_id}` : ''}
                    </span>
                    {c.party && <Badge variant={partyBadgeVariant(c.party)}>{c.party}</Badge>}
                    {c.incumbent && <Badge variant="gold">Incumbent</Badge>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <P>
          Find your district first with a <PageLink href="/">location search</PageLink>, then
          match it against the official candidate filings for that office.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
