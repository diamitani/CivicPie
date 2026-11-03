'use client';

// "Your Nov. 3 ballot" — how to vote today + the federal/statewide races for a
// looked-up location. Strictly nonpartisan: candidates are alphabetical by last
// name, party is plain text (no party colors), and every fact links its source.

import { useElectionStatus } from '@/components/ElectionCountdown';

export interface BallotCandidate {
  name: string;
  party: string | null;
  wiki: string | null;
  incumbent: boolean;
}
export interface BallotRace {
  state: string;
  office: string;
  district?: number;
  special?: boolean;
  status?: string;
  candidates: BallotCandidate[];
}
export interface BallotState {
  abbr: string;
  name: string;
  poll_hours: string;
  poll_notes: string;
  polling_place_url: string;
  mail_voting: 'automatic' | 'on_request';
  mail_return: { type: 'Received' | 'Postmarked'; deadline: string; in_person_deadline: string | null; official_info_url: string };
  election_day_registration: string;
  election_day_registration_note: string;
  redistricted_2026: boolean;
}
export interface Ballot {
  state: BallotState;
  senate: BallotRace[];
  governor: BallotRace[];
  house: BallotRace | null;
  house_district: number | null;
  house_precision: 'exact' | 'zip_center' | 'at_large' | 'unknown';
  house_note: string | null;
  state_senate_district: string | null;
  state_house_district: string | null;
  sources: { races: string; districts: string };
}

const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;
function lastName(name: string): string {
  const parts = name.replace(/,/g, '').split(/\s+/).filter(Boolean);
  while (parts.length > 1 && SUFFIX.test(parts[parts.length - 1])) parts.pop();
  return (parts[parts.length - 1] || name).toLowerCase();
}
export function alphabetical(c: BallotCandidate[]): BallotCandidate[] {
  return [...c].sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)) || a.name.localeCompare(b.name));
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

export function houseLabel(state: string, district: number | null | undefined): string {
  if (district === 0) return `U.S. House · ${state} At-Large`;
  if (district == null) return 'U.S. House';
  return `U.S. House · ${state}-${district}`;
}

function edrText(s: BallotState): string {
  switch (s.election_day_registration) {
    case 'yes':
      return 'Yes — you can register and vote on Election Day.';
    case 'no':
      return 'No — the registration deadline has passed. If you think you are registered but are not on the list, ask for a provisional ballot.';
    case 'no_registration':
      return 'No registration needed.';
    case 'limited':
      return 'Limited — see note.';
    default:
      return 'Check with your county election office.';
  }
}

export function RaceBlock({ race, title, dark }: { race: BallotRace; title: string; dark: boolean }) {
  const t = dark
    ? { box: 'border-white/[0.10] bg-white/[0.03]', title: 'text-gold', name: 'text-white', meta: 'text-white/50', tag: 'bg-white/[0.08] text-white/70', link: 'hover:text-gold' }
    : { box: 'border-[#E8E8E6] bg-white', title: 'text-[#B87818]', name: 'text-[#001B3D]', meta: 'text-[#6B7280]', tag: 'bg-[#001B3D]/[0.06] text-[#001B3D]/70', link: 'hover:text-[#C41230]' };
  return (
    <div className={`rounded-xl border p-4 ${t.box}`}>
      <div className={`font-display text-[11px] font-bold tracking-[1.5px] uppercase mb-2 ${t.title}`}>
        {title}
        {race.special ? ' · Special election' : ''}
      </div>
      <ul className="space-y-1.5">
        {alphabetical(race.candidates).map((c) => (
          <li key={c.name + (c.party || '')} className="flex items-baseline gap-2 flex-wrap">
            {c.wiki ? (
              <a href={c.wiki} target="_blank" rel="noopener noreferrer" className={`font-body text-[14px] font-semibold ${t.name} ${t.link} transition-colors`}>
                {c.name}
              </a>
            ) : (
              <span className={`font-body text-[14px] font-semibold ${t.name}`}>{c.name}</span>
            )}
            {c.party && <span className={`font-body text-[12px] ${t.meta}`}>{c.party}</span>}
            {c.incumbent && (
              <span className={`font-display text-[9px] font-bold tracking-[1px] uppercase px-1.5 py-0.5 rounded ${t.tag}`}>Incumbent</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BallotCard({
  ballot,
  dark = true,
  heading: headingOverride,
  racesLabel = 'On your ballot',
}: {
  ballot: Ballot;
  dark?: boolean;
  heading?: string;
  racesLabel?: string;
}) {
  const status = useElectionStatus();
  const s = ballot.state;
  const t = dark
    ? { wrap: 'bg-white/[0.04] border-white/[0.10]', h: 'text-white', sub: 'text-white/55', label: 'text-white/40', body: 'text-white/70', strong: 'text-white', note: 'text-white/45', btn: 'bg-gold text-navy hover:bg-gold-light' }
    : { wrap: 'bg-white border-[#E8E8E6]', h: 'text-[#001B3D]', sub: 'text-[#6B7280]', label: 'text-[#9BA3AF]', body: 'text-[#374151]', strong: 'text-[#001B3D]', note: 'text-[#9BA3AF]', btn: 'bg-[#C41230] text-white hover:bg-[#E8243E]' };

  const heading = headingOverride ||
    (status?.phase === 'today' ? `Election Day is today in ${s.name}` :
    status?.phase === 'after' ? `Your Nov. 3, 2026 ballot · ${s.name}` :
    `Your Nov. 3, 2026 ballot · ${s.name}`);

  const mailLine =
    s.mail_return.type === 'Received'
      ? `Mail ballots must be received by your election office by ${fmtDate(s.mail_return.deadline)}.`
      : `Mail ballots must be postmarked by ${fmtDate(s.mail_return.deadline)}.`;

  const races: { race: BallotRace; title: string }[] = [
    ...ballot.senate.map((r) => ({ race: r, title: 'U.S. Senate' })),
    ...ballot.governor.map((r) => ({ race: r, title: 'Governor' })),
    ...(ballot.house ? [{ race: ballot.house, title: houseLabel(s.abbr, ballot.house_district) }] : []),
  ];

  return (
    <section className={`rounded-[20px] border p-6 sm:p-8 ${t.wrap}`} aria-label="Your 2026 general election ballot">
      <div className="font-display text-[10px] font-bold tracking-[2.5px] uppercase text-red mb-2">🗳️ General Election · Tue, Nov 3, 2026</div>
      <h2 className={`font-display text-2xl font-black tracking-[-0.5px] mb-1 ${t.h}`}>{heading}</h2>
      <p className={`font-body text-[13px] mb-6 ${t.sub}`}>Nonpartisan. Candidates are listed alphabetically by last name.</p>

      <div className={`font-display text-[11px] font-bold tracking-[2px] uppercase mb-3 ${t.label}`}>How to vote</div>
      <ul className={`space-y-2 font-body text-[14px] mb-4 ${t.body}`}>
        <li>
          <strong className={t.strong}>Polls:</strong> {s.poll_hours} (local time). Anyone in line when polls close can still vote.
          {s.poll_notes && <span className={`block text-[12px] mt-0.5 ${t.note}`}>{s.poll_notes}</span>}
        </li>
        <li>
          <strong className={t.strong}>Mail ballot:</strong> {mailLine}{' '}
          {!s.mail_return.in_person_deadline
            ? `${s.name} does not list an in-person return option for mail ballots — check the state's rules below.`
            : s.mail_return.in_person_deadline !== s.mail_return.deadline
              ? `Hand-delivered ballots are due ${fmtDate(s.mail_return.in_person_deadline)}.`
              : 'Hand-delivered ballots (official drop box or election office) are due by the close of polls.'}
        </li>
        <li>
          <strong className={t.strong}>Register on Election Day?</strong> {edrText(s)}
          {s.election_day_registration_note && (
            <span className={`block text-[12px] mt-0.5 ${t.note}`}>{s.election_day_registration_note}</span>
          )}
        </li>
      </ul>
      <a
        href={s.polling_place_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-block font-display text-sm font-bold py-3 px-5 rounded-[10px] transition-colors mb-8 ${t.btn}`}
      >
        Find my polling place — official {s.name} lookup ↗
      </a>

      <div className={`font-display text-[11px] font-bold tracking-[2px] uppercase mb-3 ${t.label}`}>{racesLabel}</div>
      <div className="grid gap-3 sm:grid-cols-2 mb-3">
        {races.map(({ race, title }) => (
          <RaceBlock key={title} race={race} title={title} dark={dark} />
        ))}
      </div>
      {ballot.house_note && <p className={`font-body text-[12px] mb-3 ${t.note}`}>{ballot.house_note}</p>}
      {(ballot.state_senate_district || ballot.state_house_district) && (
        <p className={`font-body text-[13px] mb-3 ${t.body}`}>
          <strong className={t.strong}>Your 2026 state legislative districts:</strong>{' '}
          {[
            ballot.state_senate_district && `State Senate ${ballot.state_senate_district}`,
            ballot.state_house_district && `State House/Assembly ${ballot.state_house_district}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
      <p className={`font-body text-[12px] leading-relaxed ${t.note}`}>
        Your ballot also includes state legislative, county, judicial, local and ballot-measure contests where they apply.
        Your official sample ballot from your county or state election office is the final word.
        Sources: {ballot.sources.races}; districts — {ballot.sources.districts}; voting rules — state election offices via Ballotpedia and NCSL.{' '}
        <a href={s.mail_return.official_info_url} target="_blank" rel="noopener noreferrer" className="underline">
          {s.name} election info ↗
        </a>
      </p>
    </section>
  );
}
