import type { Metadata } from 'next';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';

export const metadata: Metadata = {
  title: 'Elections — CivicPie',
  description:
    'Nonpartisan election information: upcoming election dates, how to check your registration, and where to find your polling place. Free from CivicPie.',
};

export default function ElectionsPage() {
  return (
    <ContentShell
      eyebrow="Civic life"
      title="Elections"
      intro="CivicPie is strictly nonpartisan: we show you when elections happen and how to participate — never who to vote for, and never partisan framing. Dates below are the next scheduled general elections."
    >
      <ContentSection heading="Upcoming elections">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
          <div>
            <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-[#E8A030] mb-1">
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
          <a href="https://vote.gov" target="_blank" rel="noopener noreferrer" className="text-[#E8A030] hover:text-[#F5BE6A] transition-colors">
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
          CivicPie is building out candidate coverage from public filings (including Federal
          Election Commission records). Until that data is connected with verified election
          dates, we won't list candidate fields here — an incomplete list would be worse than
          none. Check your state election authority for the official candidate list for your
          district.
        </P>
        <P>
          Find your district first with a <PageLink href="/">location search</PageLink>, then
          match it against the official candidate filings for that office.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
