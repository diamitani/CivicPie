'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ContentShell, { ContentSection, P } from '@/components/ContentShell';
import {
  SearchRow,
  Select,
  FieldLabel,
  Badge,
  Card,
  EmptyState,
  Skeleton,
  ErrorNotice,
  Stat,
} from '@/components/ui';

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  AS: 'American Samoa', GU: 'Guam', MP: 'Northern Mariana Islands',
  PR: 'Puerto Rico', VI: 'U.S. Virgin Islands',
};

const PAGE_SIZE = 20;

interface ServiceHit {
  id: string;
  name: string;
  agency: string;
  category: string;
  scope: { level: string; state: string; city?: string; county?: string };
  description: string;
  cost: string;
  applyUrl: string | null;
}

function scopeLabel(scope: ServiceHit['scope']): string {
  const stateName = STATE_NAMES[scope.state] || scope.state;
  const level = scope.level === 'federal' ? 'Federal' : scope.level === 'state' ? 'State' : scope.level === 'county' ? 'County' : 'City';
  const place = scope.city || scope.county;
  return place ? `${level} · ${place}, ${stateName}` : `${level} · ${stateName}`;
}

export default function ServicesDirectory() {
  const [q, setQ] = useState('');
  const [state, setState] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<ServiceHit[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ total: number; states: { code: string; count: number }[]; categories: { name: string; count: number }[] } | null>(null);

  useEffect(() => {
    fetch('/api/services/meta')
      .then((r) => r.json())
      .then((b) => {
        if (b.ok) setMeta(b);
      })
      .catch(() => {});
  }, []);

  const fetchPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (state) params.set('state', state);
      if (category) params.set('category', category);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(nextOffset));
      const res = await fetch(`/api/services?${params.toString()}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return (await res.json()) as { total: number; data: ServiceHit[] };
    },
    [q, state, category]
  );

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const body = await fetchPage(0, false);
      setResults(body.data);
      setTotal(body.total);
      setOffset(0);
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Try again.');
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    const next = offset + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const body = await fetchPage(next, true);
      setResults((prev) => [...prev, ...body.data]);
      setOffset(next);
    } catch {
      /* keep existing results on paging failure */
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, offset]);

  // Initial load: show the first page so the directory is useful immediately.
  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ContentShell
      eyebrow="Directory"
      title="Services"
      intro="Search thousands of verified government services — DMV, benefits, licensing, records, 311 and more. Every listing links out to the official government page where the request actually gets filed."
    >
      <ContentSection heading="Find a service">
        <div className="mb-6">
          <SearchRow
            value={q}
            onChange={setQ}
            onSubmit={runSearch}
            placeholder="Try driver's license, SNAP, business license…"
            buttonLabel="Search"
            loading={loading}
            loadingLabel="Searching…"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <FieldLabel>State / territory</FieldLabel>
            <Select value={state} onChange={(e) => setState(e.target.value)} aria-label="Filter by state">
              <option value="">All states & territories</option>
              {meta?.states.map((s) => (
                <option key={s.code} value={s.code}>
                  {STATE_NAMES[s.code] || s.code} ({s.count})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
              <option value="">All categories</option>
              {meta?.categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </Select>
          </div>
        </div>

        {error && <ErrorNotice>{error}</ErrorNotice>}

        {loading ? (
          <div className="space-y-3" aria-label="Loading services">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={88} className="rounded-xl" />
            ))}
          </div>
        ) : searched && results.length === 0 ? (
          <EmptyState
            title="No services found"
            body="Try a broader keyword, or clear the state and category filters to browse everything."
            action={
              <button
                className="btn-primary"
                style={{ padding: '12px 24px' }}
                onClick={() => {
                  setQ('');
                  setState('');
                  setCategory('');
                  setSearched(false);
                  setResults([]);
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            {searched && (
              <div className="mb-4">
                <Stat value={total.toLocaleString()} label={total === 1 ? 'service found' : 'services found'} />
              </div>
            )}
            <div className="space-y-3">
              {results.map((s) => (
                <Link key={s.id} href={`/services/${encodeURIComponent(s.id)}`} className="block no-underline">
                  <Card hover className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-[16px] font-bold text-white">{s.name}</div>
                        <div className="font-body text-[13px] text-gold mt-0.5">{s.agency}</div>
                        <p className="font-body text-[13px] leading-relaxed text-white/60 mt-2">{s.description}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-3">
                          <Badge variant="navy">{s.category}</Badge>
                          <span className="font-body text-[12px] text-white/40">{scopeLabel(s.scope)}</span>
                          {s.cost && <span className="font-body text-[12px] text-white/40">· {s.cost}</span>}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            {results.length < total && (
              <div className="mt-6 text-center">
                <button
                  className="btn-primary disabled:opacity-50"
                  style={{ padding: '12px 32px' }}
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading…' : `Show more (${(total - results.length).toLocaleString()} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </ContentSection>

      <ContentSection heading="About this directory">
        <P>
          Listings come from the GovServ registry (Diamitani Industries), researched and verified
          against official .gov sources. CivicPie doesn&apos;t file requests or track cases —
          we&apos;re the map, not the errand-runner: each listing links you to the official
          page where the request actually gets filed.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
