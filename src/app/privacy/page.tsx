import type { Metadata } from 'next';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';

export const metadata: Metadata = {
  title: 'Privacy Policy — CivicPie',
  description:
    'CivicPie privacy policy: what we collect when you search an address or ZIP, how we use it, and your choices. Free, nonpartisan, no account required.',
};

const sections: { heading: string; body: string[] }[] = [
  {
    heading: 'What we collect',
    body: [
      'Addresses, ZIP codes, and place names you type into CivicPie search. These inputs are used only to look up the districts, officials, meetings, and resources relevant to that location.',
      'Basic, anonymized usage analytics (pages visited, approximate region derived from standard web logs). We use privacy-friendly analytics with no cross-site tracking.',
      'If you create an account (optional), we store your email address and account preferences so you can sign in and save settings.',
    ],
  },
  {
    heading: 'What we do not collect',
    body: [
      'We do not sell, rent, or share your personal information with advertisers, data brokers, or political campaigns — ever.',
      'We do not collect voter registration status, party affiliation, or how you plan to vote. CivicPie is strictly nonpartisan: we show you who represents you, not how to vote.',
      'No account is required to explore CivicPie. You can search any address and see public civic information without signing in.',
    ],
  },
  {
    heading: 'Cookies and analytics',
    body: [
      'CivicPie uses a minimal set of cookies: those required for sign-in sessions (if you create an account) and privacy-friendly, cookie-light analytics that measure aggregate usage. We do not use advertising or cross-site tracking cookies.',
    ],
  },
  {
    heading: 'How we use information',
    body: [
      'To return the correct civic information for the location you searched.',
      'To operate, maintain, and improve CivicPie (for example, understanding which pages are slow or broken).',
      'To comply with legal obligations if required by law.',
    ],
  },
  {
    heading: 'Data retention and security',
    body: [
      'Search inputs are processed to serve your request and are not retained in a way that identifies you. Account data is kept only while your account is active and can be deleted on request.',
      'We use reasonable administrative and technical safeguards to protect information, including encrypted connections (HTTPS) in transit.',
    ],
  },
  {
    heading: 'Children',
    body: [
      'CivicPie is a general-audience civic information service and is not directed at children under 13. We do not knowingly collect personal information from children under 13.',
    ],
  },
  {
    heading: 'Your choices',
    body: [
      'Use CivicPie without an account. Opt out of analytics by enabling Do Not Track in your browser — we honor it. Request deletion of your account data at any time by contacting us.',
    ],
  },
  {
    heading: 'Changes to this policy',
    body: [
      'We may update this policy as CivicPie grows. Material changes will be noted here with a revised effective date.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <ContentShell
      eyebrow="Legal"
      title="Privacy Policy"
      dateline="Effective September 16, 2026"
      intro="CivicPie is a free, nonpartisan civic-information platform. This policy explains in plain language what information we handle when you use civicpie.com — and what we never do with it."
    >
      {sections.map((s) => (
        <ContentSection key={s.heading} heading={s.heading}>
          {s.body.map((p, i) => (
            <P key={i}>{p}</P>
          ))}
        </ContentSection>
      ))}

      <div className="mt-14 pt-8 border-t border-white/[0.08]">
        <p className="font-body text-sm text-white/40">
          Questions about this policy? See our <PageLink href="/terms">Terms of Service</PageLink>.
        </p>
      </div>
    </ContentShell>
  );
}
