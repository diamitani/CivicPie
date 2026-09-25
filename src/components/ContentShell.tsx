import Link from 'next/link';
import { PieLogo } from '@/components/Logo';

// Shared shell for CivicPie's editorial content pages (About, Meetings,
// Resources, Events, Elections, Officials, Services, Explore). Matches the
// Privacy/Terms page treatment: navy ground, gold eyebrow, white headlines.
export default function ContentShell({
  eyebrow,
  title,
  dateline,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  dateline?: string;
  intro: string;
  children: React.ReactNode;
}) {
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
          {eyebrow}
        </div>
        <h1 className="font-display text-5xl font-black tracking-tight mb-3">{title}</h1>
        {dateline && <p className="font-body text-sm text-white/40 mb-12">{dateline}</p>}
        {!dateline && <div className="mb-12" />}

        <p className="font-body text-[17px] leading-relaxed text-white/70 mb-12">{intro}</p>

        {children}
      </main>

      <footer className="border-t border-white/[0.08]">
        <div className="max-w-[1200px] mx-auto px-10 py-8 flex items-center justify-between flex-wrap gap-4">
          <p className="font-body text-xs text-white/25">
            © 2026 CivicPie · Nonpartisan · All data sourced from public government records
          </p>
          <div className="flex gap-4">
            <Link href="/about" className="font-body text-xs text-white/40 hover:text-white transition-colors">
              About
            </Link>
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

// A titled content section inside a ContentShell page.
export function ContentSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-xl font-bold text-white mb-4">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="font-body text-[15px] leading-relaxed text-white/60">{children}</p>;
}

export function PageLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[#E8A030] hover:text-[#F5BE6A] transition-colors">
      {children}
    </Link>
  );
}
