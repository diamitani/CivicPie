import type { Metadata } from 'next';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';

export const metadata: Metadata = {
  title: 'About — CivicPie',
  description:
    'CivicPie is a free, nonpartisan civic-information platform. Type an address, see your district, your officials, and what your local government is doing.',
};

export default function AboutPage() {
  return (
    <ContentShell
      eyebrow="About"
      title="About CivicPie"
      intro="CivicPie is a free, nonpartisan civic-information platform. Type in an address or ZIP code and see who represents you — your city council member or alderperson, your mayor, your state legislators, your members of Congress — plus the meetings, elections, and services connected to where you live."
    >
      <ContentSection heading="Why CivicPie exists">
        <P>
          Most people can name the president but not their alderperson — yet the pothole, the
          property tax bill, and the zoning decision down the block are all decided locally.
          CivicPie closes that gap: it starts from your location and works outward, from your
          block to your city to your state to Washington.
        </P>
        <P>
          Everything on CivicPie is drawn from public government records. There are no
          endorsements, no campaign content, and no partisan framing — just who holds the
          office, what the office does, and how to reach them.
        </P>
      </ContentSection>

      <ContentSection heading="How it works">
        <P>
          Search an address or ZIP on the <PageLink href="/">homepage</PageLink> and CivicPie
          resolves it to a civic district: a Chicago ward, a city like North Liberty, Iowa, or
          — outside our hyperlocal coverage — your state and congressional district. Each
          district page lists the officials who represent that place, with contact information
          where public records provide it.
        </P>
        <P>
          Chicago is our first city, with all 50 wards mapped. North Liberty, Iowa is our
          second hyperlocal city. Everywhere else in the United States — including Puerto Rico,
          Guam, the U.S. Virgin Islands, American Samoa, and the Northern Mariana Islands —
          returns federal and territorial officials for the location searched.
        </P>
      </ContentSection>

      <ContentSection heading="What CivicPie is not">
        <P>
          CivicPie does not tell you how to vote, does not collect voter registration status or
          party affiliation, and does not provide voter lists, turnout targeting, canvassing
          tools, or campaign data of any kind. It is an information service, not an organizing
          platform.
        </P>
        <P>
          Related projects by the same builder — including the 48th Ward organizing site and
          your48.com — are separate efforts and are not part of CivicPie.
        </P>
      </ContentSection>

      <ContentSection heading="Data and accuracy">
        <P>
          Official names, offices, and district boundaries come from public records: the U.S.
          Census geocoder, congressional and state legislative sources, and city-published
          documents such as council minutes. Officeholders change — if you spot something out
          of date, check the linked official source, which is always authoritative over us.
        </P>
      </ContentSection>

      <ContentSection heading="Get in touch">
        <P>
          CivicPie is an independent project. For corrections, coverage requests, or press
          inquiries, start with the city or official source linked on the relevant page — and
          check back here as the project grows.
        </P>
        <P>
          Read our <PageLink href="/privacy">Privacy Policy</PageLink> and{' '}
          <PageLink href="/terms">Terms of Service</PageLink>.
        </P>
      </ContentSection>
    </ContentShell>
  );
}
