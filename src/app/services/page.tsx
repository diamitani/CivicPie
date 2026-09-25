import type { Metadata } from 'next';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';

export const metadata: Metadata = {
  title: 'Services — CivicPie',
  description:
    'Constituent services: how to contact your officials, what 311-style city services cover, and where requests actually get filed. From CivicPie.',
};

export default function ServicesPage() {
  return (
    <ContentShell
      eyebrow="Civic life"
      title="Services"
      intro="CivicPie shows you who to contact — the request itself goes through official channels. Here's how constituent services work and where to file."
    >
      <ContentSection heading="Contacting your officials">
        <P>
          Every elected official keeps a constituent-services operation: help navigating a
          city department, a question about a bill or ordinance, or a problem no agency has
          resolved. Find your officials with a <PageLink href="/">location search</PageLink>{' '}
          or in the <PageLink href="/officials">directory</PageLink> — district pages list
          public contact information where records provide it.
        </P>
        <P>
          Be specific: your address, what happened, what you've already tried, and what
          outcome you're asking for. Staff track cases — vague complaints don't.
        </P>
      </ContentSection>

      <ContentSection heading="City services and 311">
        <P>
          Potholes, missed trash pickup, broken streetlights, and similar day-to-day issues
          go to your city's service-request system, not your council member's inbox. Many
          large cities run a 311 non-emergency line for exactly this — Chicago does — and
          most cities of any size publish an online request portal on their official
          website.
        </P>
        <P>
          If a service request stalls, that's when your ward or council office earns its
          keep: they can escalate inside the departments they oversee.
        </P>
      </ContentSection>

      <ContentSection heading="Grants and programs">
        <P>
          Looking for public funding rather than a fix? Federal block grants, small-business
          improvement programs, and local assistance funds are covered on our{' '}
          <PageLink href="/resources">resources</PageLink> page.
        </P>
      </ContentSection>

      <ContentSection heading="What CivicPie doesn't do">
        <P>
          CivicPie doesn't file requests, track cases, or intermediate with government on
          your behalf. We're the map, not the errand-runner: we get you to the right office
          with the right context, and the official channel takes it from there.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
