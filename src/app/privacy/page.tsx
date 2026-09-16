import type { Metadata } from 'next';
import Link from 'next/link';
import { PieLogo } from '@/components/Logo';

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
        <h1 className="font-display text-5xl font-black tracking-tight mb-3">Privacy Policy</h1>
        <p className="font-body text-sm text-white/40 mb-12">Effective September 16, 2026</p>

        <p className="font-body text-[17px] leading-relaxed text-white/70 mb-12">
          CivicPie is a free, nonpartisan civic-information platform. This policy explains in plain
          language what information we handle when you use civicpie.com — and what we never do with it.
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
            Questions about this policy? See our{' '}
            <Link href="/terms" className="text-[#E8A030] hover:text-[#F5BE6A] transition-colors">
              Terms of Service
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
