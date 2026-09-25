import type { Metadata } from 'next';
import Link from 'next/link';
import { PieLogo } from '@/components/Logo';

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
    <div className="min-h-screen bg-[#001B3D] text-white">
      <header className="border-b border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-10 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <PieLogo size={28} />
            <div className="font-display text-[22px] font-black tracking-[-0.5px] leading-none">
              Civic<span className="text-[#C41230]">Pie</span>
            </div>
          </Link>
          <Link href="/" className="font-body text-sm text-white/50 hover:text-white transition-colors">
            ← Back to CivicPie
          </Link>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-10 py-16">
        <div className="font-display text-[11px] font-bold tracking-[3px] uppercase text-[#E8A030] mb-4">
          Legal
        </div>
        <h1 className="font-display text-5xl font-black tracking-tight mb-3">Terms of Service</h1>
        <p className="font-body text-sm text-white/40 mb-12">Effective September 16, 2026</p>

        <p className="font-body text-[17px] leading-relaxed text-white/70 mb-12">
          Plain-language terms for using CivicPie — a free, nonpartisan civic-information platform
          built on public government data.
        </p>

        {sections.map((s) => (
          <section key={s.heading} className="mb-10">
            <h2 className="font-display text-xl font-bold text-white mb-4">{s.heading}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="font-body text-[15px] leading-relaxed text-white/60 mb-3">
                {p}
              </p>
            ))}
          </section>
        ))}

        <div className="mt-14 pt-8 border-t border-white/[0.08]">
          <p className="font-body text-sm text-white/40">
            How we handle your information is described in our{' '}
            <Link href="/privacy" className="text-[#E8A030] hover:text-[#F5BE6A] transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </main>

      <footer className="border-t border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-10 py-8 flex items-center justify-between">
          <p className="font-body text-xs text-white/25">
            © 2026 CivicPie · Nonpartisan · All data sourced from public government records
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="font-body text-xs text-white/40 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="font-body text-xs text-white/40 hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
