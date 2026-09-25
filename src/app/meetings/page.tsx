import type { Metadata } from 'next';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';

export const metadata: Metadata = {
  title: 'Meetings — CivicPie',
  description:
    'How local government meetings work, when covered city councils meet, and where to find official agendas. Free, nonpartisan civic information from CivicPie.',
};

function MeetingCard({
  city,
  body,
  schedule,
  location,
  source,
  sourceHref,
}: {
  city: string;
  body: string;
  schedule: string;
  location: string;
  source: string;
  sourceHref: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-[#E8A030] mb-2">
        {city}
      </div>
      <h3 className="font-display text-lg font-bold text-white mb-3">{body}</h3>
      <dl className="space-y-2">
        <div className="flex gap-3">
          <dt className="font-body text-[13px] text-white/40 w-20 flex-shrink-0">Schedule</dt>
          <dd className="font-body text-[14px] text-white/75">{schedule}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="font-body text-[13px] text-white/40 w-20 flex-shrink-0">Location</dt>
          <dd className="font-body text-[14px] text-white/75">{location}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="font-body text-[13px] text-white/40 w-20 flex-shrink-0">Agendas</dt>
          <dd className="font-body text-[14px]">
            <a href={sourceHref} target="_blank" rel="noopener noreferrer" className="text-[#E8A030] hover:text-[#F5BE6A] transition-colors">
              {source} ↗
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function MeetingsPage() {
  return (
    <ContentShell
      eyebrow="Civic life"
      title="Public meetings"
      intro="City councils, county boards, and state legislatures do their work in public meetings — and most of them are open to anyone. Here's how meetings work in the cities CivicPie covers, and where to find official agendas."
    >
      <ContentSection heading="Covered cities">
        <div className="space-y-4">
          <MeetingCard
            city="Chicago, Illinois"
            body="Chicago City Council"
            schedule="Regular meetings monthly at City Hall. Committee meetings are scheduled separately by each committee."
            location="City Hall, 121 N LaSalle St, Chicago"
            source="City of Chicago official site"
            sourceHref="https://www.chicago.gov"
          />
          <MeetingCard
            city="North Liberty, Iowa"
            body="North Liberty City Council"
            schedule="Second and fourth Tuesday of each month at 6:00 PM, per published council minutes."
            location="City Council Chambers, 360 N Main St, North Liberty"
            source="City of North Liberty official site"
            sourceHref="https://northlibertyiowa.org"
          />
        </div>
      </ContentSection>

      <ContentSection heading="What happens at a council meeting">
        <P>
          A typical meeting opens with roll call and approval of the previous minutes, then
          moves through ordinances and resolutions — the actual laws and spending decisions —
          often with a public-comment period where residents can speak. Votes taken here set
          budgets, approve developments, and direct city services.
        </P>
        <P>
          Agendas are published in advance by the city clerk. If an item affects your block, the
          agenda is where you'll see it first — and the meeting is where you can be heard on it.
        </P>
      </ContentSection>

      <ContentSection heading="A note on live feeds">
        <P>
          CivicPie does not yet publish a live, city-by-city feed of meeting agendas — when
          this page says a council meets on a given schedule, that schedule comes from the
          city's own published records, and the official city website is always the
          authoritative source for agendas, cancellations, and special sessions.
        </P>
        <P>
          Looking for your ward or city? Start with a <PageLink href="/">location search</PageLink>{' '}
          to find your district page.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
