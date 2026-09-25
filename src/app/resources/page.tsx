import type { Metadata } from 'next';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';

export const metadata: Metadata = {
  title: 'Resources — CivicPie',
  description:
    'Grants, programs, and ways to get involved in your community: federal block grants, small-business programs, and volunteering. Free, nonpartisan, from CivicPie.',
};

function ResourceCard({
  name,
  level,
  body,
}: {
  name: string;
  level: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6">
      <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-[#E8A030] mb-2">
        {level}
      </div>
      <h3 className="font-display text-lg font-bold text-white mb-2">{name}</h3>
      <p className="font-body text-[14px] leading-relaxed text-white/60">{body}</p>
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <ContentShell
      eyebrow="Civic life"
      title="Resources"
      intro="Grants, public programs, and ways to plug into your community. These are real programs run by governments — CivicPie explains what they are; applications go through the official channels."
    >
      <ContentSection heading="Grants and programs">
        <div className="space-y-4">
          <ResourceCard
            level="Federal"
            name="Community Development Block Grant (CDBG)"
            body="Federal funding that flows to cities for housing, infrastructure, and services in low- and moderate-income neighborhoods. Cities publish annual action plans showing exactly where the money goes — worth reading before a budget hearing."
          />
          <ResourceCard
            level="Chicago"
            name="Small Business Improvement Fund (SBIF)"
            body="Chicago's program offering grants for building improvements to commercial and industrial properties in designated districts. Eligibility is tied to specific Tax Increment Financing (TIF) districts — check the city's official program page for current boundaries and application windows."
          />
          <ResourceCard
            level="Everywhere"
            name="Your city's programs"
            body="Most cities publish their own grant and assistance programs — facade improvement, home repair, arts funding, youth jobs. The fastest route is your city government's official website or your council member's office."
          />
        </div>
      </ContentSection>

      <ContentSection heading="Volunteer and get involved">
        <P>
          The lowest-friction civic act is showing up: public-comment periods at council
          meetings, neighborhood association gatherings, and park or library advisory boards
          are all open to residents. See <PageLink href="/meetings">meetings</PageLink> for
          when covered councils convene.
        </P>
        <P>
          Your elected officials' offices can also point you to boards, commissions, and
          volunteer programs that need residents. Find yours through the{' '}
          <PageLink href="/officials">officials directory</PageLink> or a{' '}
          <PageLink href="/">location search</PageLink>.
        </P>
      </ContentSection>

      <ContentSection heading="Register to vote">
        <P>
          Civic participation starts with registration. Check your status or register through{' '}
          <a href="https://vote.gov" target="_blank" rel="noopener noreferrer" className="text-[#E8A030] hover:text-[#F5BE6A] transition-colors">
            vote.gov ↗
          </a>
          , and see <PageLink href="/elections">elections</PageLink> for upcoming dates.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
