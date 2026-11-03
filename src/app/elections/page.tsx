'use client';

import { useEffect, useState } from 'react';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';
import { SearchRow, Badge, partyBadgeVariant } from '@/components/ui';
import BallotCard, { RaceBlock, houseLabel, type Ballot, type BallotRace, type BallotState } from '@/components/BallotCard';
import { useElectionStatus } from '@/components/ElectionCountdown';

interface CandidateHit {
  id: string;
  name: string;
  office_title?: string;
  district_id?: string | null;
  state_abbr?: string | null;
  party?: string | null;
  incumbent?: boolean;
}

interface StateSummary extends BallotState {
  race_counts: { senate: number; governor: number; house: number };
}

// FEC filings store names as "Last, First" — flip them for display.
function displayName(raw: string): string {
  const i = raw.indexOf(', ');
  if (i < 0) return raw;
  const last = raw.slice(0, i).trim();
  const rest = raw.slice(i + 2).trim();
  return rest ? `${rest} ${last}` : raw;
}

const selectCls =
  'rounded-lg border border-white/[0.12] bg-navy-800 px-3 py-2.5 font-body text-[14px] text-white w-full sm:w-auto';

// ─── Election Day status ────────────────────────────────────────────────────
function StatusBanner() {
  const s = useElectionStatus();
  if (!s) return null;
  const text =
    s.phase === 'today'
      ? 'Election Day is today. Polls are open — hours vary by state. If you are in line when polls close, stay in line: you can still vote.'
      : s.phase === 'before'
        ? `Election Day is ${s.days} ${s.days === 1 ? 'day' : 'days'} away — Tuesday, November 3, 2026.`
        : 'Polls have closed for the November 3, 2026 general election. Official results are certified by each state over the coming weeks.';
  return (
    <div className="rounded-xl border border-red/40 bg-red/[0.12] px-5 py-4 mb-10 font-display text-[15px] font-bold text-white">
      🗳️ {text}
    </div>
  );
}

// ─── Address → my ballot ───────────────────────────────────────────────────
function MyBallot() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [ballot, setBallot] = useState<Ballot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    const v = q.trim();
    if (!v) return;
    setLoading(true);
    setErr(null);
    setBallot(null);
    try {
      const res = await fetch(`/api/lookup?address=${encodeURIComponent(v)}`);
      const body = await res.json().catch(() => ({}));
      if (res.status === 404 || body.error) {
        setErr(`We couldn't find “${v}”. Try your full street address with city and state, or a 5-digit ZIP.`);
      } else if (!body.ballot_2026) {
        setErr('We found that location, but it is outside the 50 states and D.C. — check your local election office.');
      } else {
        setBallot(body.ballot_2026);
      }
    } catch {
      setErr('Lookup is temporarily unavailable. Use the state guide below.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <SearchRow
        value={q}
        onChange={setQ}
        onSubmit={run}
        placeholder="Street address, city, state — or a ZIP code"
        buttonLabel="Show my ballot"
        loading={loading}
        loadingLabel="Looking up…"
      />
      <p className="font-body text-[12px] text-white/40">
        A full street address gives your exact 2026 U.S. House and state legislative districts. A ZIP code gives a close
        match. We don&apos;t store your address.
      </p>
      {err && <p className="font-body text-[14px] text-white/70">{err}</p>}
      {ballot && <BallotCard ballot={ballot} dark />}
    </div>
  );
}

// ─── State-by-state guide ──────────────────────────────────────────────────
function StateGuide() {
  const [states, setStates] = useState<StateSummary[]>([]);
  const [st, setSt] = useState('');
  const [data, setData] = useState<{ state: BallotState; races: { senate: BallotRace[]; governor: BallotRace[]; house: BallotRace[] } } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/elections')
      .then((r) => r.json())
      .then((b) => setStates(Array.isArray(b.states) ? b.states : []))
      .catch(() => setStates([]));
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('state');
      if (fromUrl) setSt(fromUrl.toUpperCase());
    } catch {
      /* no-op */
    }
  }, []);

  useEffect(() => {
    if (!st) {
      setData(null);
      return;
    }
    setLoading(true);
    fetch(`/api/elections?state=${encodeURIComponent(st)}`)
      .then((r) => r.json())
      .then((b) => setData(b.state ? b : null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('state', st);
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* no-op */
    }
  }, [st]);

  const guideBallot: Ballot | null = data
    ? {
        state: data.state,
        senate: data.races.senate,
        governor: data.races.governor,
        house: null,
        house_district: null,
        house_precision: 'unknown',
        house_note: null,
        state_senate_district: null,
        state_house_district: null,
        sources: {
          races: 'Wikipedia 2026 U.S. Senate, House and gubernatorial election pages, Nov. 3, 2026 (CC BY-SA 4.0)',
          districts: 'U.S. Census Bureau TIGERweb',
        },
      }
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <label htmlFor="guide-state" className="font-body text-[14px] text-white/60">
          Choose a state
        </label>
        <select id="guide-state" value={st} onChange={(e) => setSt(e.target.value)} className={selectCls}>
          <option value="">— Select —</option>
          {states.map((s) => (
            <option key={s.abbr} value={s.abbr}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="font-body text-[14px] text-white/50">Loading…</p>}

      {guideBallot && data && (
        <>
          <BallotCard
            ballot={guideBallot}
            dark
            heading={`${data.state.name} · Election Day guide`}
            racesLabel={data.races.senate.length || data.races.governor.length ? 'Statewide races' : 'Statewide races — none for U.S. Senate or Governor this year'}
          />
          {data.races.house.length > 0 && (
            <div>
              <h3 className="font-display text-lg font-bold text-white mb-1">
                U.S. House — all {data.races.house.length} {data.races.house.length === 1 ? 'race' : 'races'} in {data.state.name}
              </h3>
              <p className="font-body text-[13px] text-white/50 mb-4">
                {data.state.redistricted_2026
                  ? `${data.state.name} redrew its congressional map for 2026, so your district may have changed. Use “Show my ballot” above with your address to find yours.`
                  : 'Use “Show my ballot” above with your address to find your district.'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.races.house.map((r) => (
                  <RaceBlock key={r.district} race={r} title={houseLabel(data.state.abbr, r.district)} dark />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!st && states.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
          <table className="w-full text-left font-body text-[13px]">
            <thead className="bg-white/[0.04] text-white/50">
              <tr>
                <th className="px-3 py-2 font-semibold">State</th>
                <th className="px-3 py-2 font-semibold">Poll hours (local)</th>
                <th className="px-3 py-2 font-semibold">Register on Election Day</th>
                <th className="px-3 py-2 font-semibold">Polling place</th>
              </tr>
            </thead>
            <tbody>
              {states.map((s) => (
                <tr key={s.abbr} className="border-t border-white/[0.06] text-white/70">
                  <td className="px-3 py-2">
                    <button onClick={() => setSt(s.abbr)} className="text-white font-semibold hover:text-gold transition-colors text-left">
                      {s.name}
                    </button>
                  </td>
                  <td className="px-3 py-2">{s.poll_hours}</td>
                  <td className="px-3 py-2">
                    {s.election_day_registration === 'yes'
                      ? 'Yes'
                      : s.election_day_registration === 'no'
                        ? 'No'
                        : s.election_day_registration === 'no_registration'
                          ? 'No registration needed'
                          : 'See state guide'}
                  </td>
                  <td className="px-3 py-2">
                    <a href={s.polling_place_url} target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light">
                      Official lookup ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── FEC filings search (unchanged behavior) ───────────────────────────────
function FecSearch() {
  const [q, setQ] = useState('');
  const [state, setState] = useState('');
  const [results, setResults] = useState<CandidateHit[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const STATES = [
    'AK','AL','AR','AZ','CA','CO','CT','DC','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA',
    'MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR',
    'PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY',
  ];

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
    <>
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
          <select id="cand-state" value={state} onChange={(e) => setState(e.target.value)} className={selectCls}>
            <option value="">All states</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {searched && !loading && (
            <span className="font-body text-[13px] text-white/40">
              {total.toLocaleString()} filing{total === 1 ? '' : 's'} found
            </span>
          )}
        </div>
      </form>

      {searched && !loading && results.length === 0 && (
        <P>No filings matched that search. Try a last name only, or a different state.</P>
      )}

      <div className="space-y-3">
        {results.map((c) => (
          <div key={c.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
            <div className="font-display text-[16px] font-bold text-white">{displayName(c.name)}</div>
            <div className="font-body text-[13px] text-gold mt-0.5">FEC filer · {c.office_title || 'Office'}</div>
            <div className="font-body text-[12px] text-white/40 mt-1 flex items-center gap-2 flex-wrap">
              <span>
                {c.state_abbr || ''}
                {c.district_id ? ` · ${c.district_id}` : ''}
              </span>
              {c.party && <Badge variant={partyBadgeVariant(c.party)}>{c.party}</Badge>}
              {c.incumbent && <Badge variant="gold">Incumbent</Badge>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function ElectionsPage() {
  return (
    <ContentShell
      eyebrow="General Election · Tuesday, November 3, 2026"
      title="Elections"
      intro="CivicPie is strictly nonpartisan: we show you when, where and how to vote and who is on the ballot — never who to vote for. Every fact on this page links to its public source, and your state or county election office is always the final word."
    >
      <StatusBanner />

      <ContentSection heading="See your ballot">
        <P>
          Enter your address to see your polling hours, your state&apos;s official polling-place lookup, your mail-ballot
          deadline, and the U.S. Senate, Governor and U.S. House candidates on your ballot.
        </P>
        <MyBallot />
      </ContentSection>

      <ContentSection heading="Election Day guide — all 50 states + D.C.">
        <P>
          Poll hours, Election Day registration, mail-ballot return rules, the official polling-place lookup, and every
          statewide and U.S. House race on the 2026 ballot.
        </P>
        <StateGuide />
      </ContentSection>

      <ContentSection heading="What's on the ballot nationwide">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { n: '435', l: 'U.S. House seats' },
            { n: '35', l: 'U.S. Senate races (incl. 2 special)' },
            { n: '36', l: 'Governor races' },
            { n: '1,416', l: 'General-election candidates listed' },
          ].map((x) => (
            <div key={x.l} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div className="font-display text-2xl font-black text-gold">{x.n}</div>
              <div className="font-body text-[12px] text-white/55 mt-1">{x.l}</div>
            </div>
          ))}
        </div>
        <P>
          Candidate lists come from Wikipedia&apos;s 2026 election pages as of Nov. 3, 2026 (
          <a href="https://en.wikipedia.org/wiki/2026_United_States_Senate_elections" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light">Senate</a>,{' '}
          <a href="https://en.wikipedia.org/wiki/2026_United_States_House_of_Representatives_elections" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light">House</a>,{' '}
          <a href="https://en.wikipedia.org/wiki/2026_United_States_gubernatorial_elections" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light">Governor</a>
          ; CC BY-SA 4.0). Districts come from the U.S. Census Bureau&apos;s 2026 (120th Congress) district maps. Poll hours
          and mail-ballot deadlines come from state election offices as compiled by Ballotpedia and NCSL. Write-in
          candidates and down-ballot contests are on your official sample ballot.
        </P>
      </ContentSection>

      <ContentSection heading="Check your registration">
        <P>
          The fastest way to check your status is your state&apos;s official lookup above, or the federal portal at{' '}
          <a href="https://vote.gov" target="_blank" rel="noopener noreferrer" className="text-gold hover:text-gold-light transition-colors">
            vote.gov ↗
          </a>
          . If you are told you are not on the voter list, you have the right to ask for a provisional ballot.
        </P>
      </ContentSection>

      <ContentSection heading="Federal campaign filings (FEC)">
        <P>
          Separately from the ballot above, you can search the 3,362 people who filed with the Federal Election
          Commission for the 2026 cycle. A filing is not a spot on the ballot — many filers lost primaries or withdrew.
        </P>
        <FecSearch />
        <P>
          Looking for who represents you today? Try a <PageLink href="/">location search</PageLink>.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
