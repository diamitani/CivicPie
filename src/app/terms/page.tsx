import type { Metadata } from 'next';
import ContentShell, { ContentSection, P, PageLink } from '@/components/ContentShell';

export const metadata: Metadata = {
  title: 'Terms of Service — CivicPie',
  description:
    'CivicPie terms of service: a free, nonpartisan civic-information service. Informational use, acceptable use, and limitations.',
};

const sections: { heading: string; body: string[] }[] = [
  {
    heading: 'The service',
    body: [
      'CivicPie ("we", "us") provides free civic information — districts, elected officials, meetings, elections, grants, and community resources — assembled from public government records. Use of civicpie.com is subject to these terms.',
    ],
  },
  {
    heading: 'Informational use only',
    body: [
      'CivicPie is an informational service, not legal, financial, or professional advice. While we work to keep information accurate and current, public records change; always confirm critical details (election dates, filing deadlines, meeting times) with the official government source.',
      'CivicPie is strictly nonpartisan. We present public civic information without endorsement of any candidate, party, or viewpoint.',
    ],
  },
  {
    heading: 'Acceptable use',
    body: [
      'You agree not to misuse the service: no scraping at abusive volumes, no attempts to disrupt or gain unauthorized access, no unlawful use, and no misrepresenting CivicPie content as official government communication.',
      'You may share and link to CivicPie pages freely. When republishing our content, credit CivicPie and do not alter data in ways that mislead.',
    ],
  },
  {
    heading: 'Accounts',
    body: [
      'No account is required to explore CivicPie. If you create one, you are responsible for keeping your credentials secure and for activity under your account.',
    ],
  },
  {
    heading: 'Intellectual property',
    body: [
      'The CivicPie name, logo, and site design are our property. Underlying government data remains in the public domain as provided by its official sources.',
    ],
  },
  {
    heading: 'Disclaimers and limitation of liability',
    body: [
      'The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, CivicPie is not liable for indirect or consequential damages arising from use of the service.',
    ],
  },
  {
    heading: 'Changes',
    body: [
      'We may update these terms as CivicPie evolves. Continued use of the service after changes take effect constitutes acceptance of the revised terms.',
    ],
  },
];

export default function TermsPage() {
  return (
    <ContentShell
      eyebrow="Legal"
      title="Terms of Service"
      dateline="Effective September 16, 2026"
      intro="Plain-language terms for using CivicPie — a free, nonpartisan civic-information platform built on public government data."
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
          How we handle your information is described in our{' '}
          <PageLink href="/privacy">Privacy Policy</PageLink>.
        </p>
      </div>
    </ContentShell>
  );
}
