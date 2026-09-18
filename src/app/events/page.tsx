import type { Metadata } from 'next';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';

export const metadata: Metadata = {
  title: 'Events — CivicPie',
  description:
    'Civic events: town halls, public meetings, and community gatherings. What counts as a civic event and where to find official calendars. From CivicPie.',
};

export default function EventsPage() {
  return (
    <ContentShell
      eyebrow="Civic life"
      title="Civic events"
      intro="Town halls, public hearings, community meetings, candidate forums, voter-registration drives — the gatherings where local democracy happens in person."
    >
      <ContentSection heading="No invented listings">
        <P>
          CivicPie does not publish event listings yet, and we won't fill this page with
          invented or scraped events to look busy. When this page carries listings, each one
          will come from a verified public source with a date, a place, and a link back to the
          organizer.
        </P>
        <P>
          Until then, the most reliable event calendars are the official ones:
        </P>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-3">
          <p className="font-body text-[14px] text-white/70">
            <span className="font-semibold text-white">North Liberty, Iowa</span> — meeting and
            event calendars on{' '}
            <a href="https://northlibertyiowa.org" target="_blank" rel="noopener noreferrer" className="text-[#E8A030] hover:text-[#F5BE6A] transition-colors">
              northlibertyiowa.org ↗
            </a>
          </p>
          <p className="font-body text-[14px] text-white/70">
            <span className="font-semibold text-white">Chicago</span> — city-hosted events and
            meeting schedules on the City of Chicago's official website
          </p>
          <p className="font-body text-[14px] text-white/70">
            <span className="font-semibold text-white">Everywhere</span> — your ward,
            council district, or county site usually keeps a calendar; your officials'
            offices can tell you about town halls. Find them via{' '}
            <PageLink href="/">location search</PageLink>.
          </p>
        </div>
      </ContentSection>

      <ContentSection heading="What counts as a civic event">
        <P>
          Public-comment sessions at council meetings, zoning and planning hearings, police
          district or beat meetings, school board sessions, budget town halls, and
          nonpartisan candidate forums. If a government body is making a decision that
          affects you, there's usually a meeting about it first — and it's usually open.
        </P>
        <P>
          See <PageLink href="/meetings">meetings</PageLink> for when covered councils meet,
          and <PageLink href="/elections">elections</PageLink> for dates that decide who
          sits in those seats.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
