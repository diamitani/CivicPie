'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PieLogo } from '@/components/Logo';

interface LookupBody {
  coverage?: 'local' | 'none';
  address?: string;
  district_id?: string | null;
  district_label?: string | null;
  district_href?: string | null;
  officials?: any[];
  state_abbr?: string | null;
  state_name?: string | null;
  message?: string;
  federal_officials?: any[];
  state_officials?: any[];
  state_officials_total?: number;
  error?: string;
}

function wardLabel(district_id: string | null | undefined): string {
  const m = (district_id || '').match(/^il-chicago-ward-(\d+)$/);
  if (m) return `Ward ${parseInt(m[1], 10)} · Chicago`;
  return district_id || 'your district';
}

function wardHref(district_id: string | null | undefined): string | null {
  const m = (district_id || '').match(/^il-chicago-ward-(\d+)$/);
  return m ? `/ward/chicago-${parseInt(m[1], 10)}` : null;
}

function OfficialRow({ o }: { o: any }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-white/[0.04] border border-white/[0.07]">
      <div className="w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center text-base flex-shrink-0">
        👤
      </div>
      <div className="min-w-0">
        <div className="font-display text-[14px] font-bold text-white truncate">{o.name}</div>
        <div className="font-body text-[12px] text-white/45 truncate">
          {[o.office_title, o.party].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  );
}

function CoverageInner() {
  const params = useSearchParams();
  const q = (params.get('q') || '').trim();
  const [body, setBody] = useState<LookupBody | null>(null);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    if (!q) return;
    setBody(null);
    setStatus(null);
    fetch(`/api/lookup?address=${encodeURIComponent(q)}`)
      .then(async (r) => {
        setStatus(r.status);
        setBody(await r.json().catch(() => ({})));
      })
      .catch(() => setBody({ error: 'network' }));
  }, [q]);

  return (
    <div className="min-h-screen bg-[#001B3D] flex flex-col">
      <header className="px-10 py-5 flex items-center gap-3 max-w-[1200px] mx-auto w-full">
        <Link href="/" className="flex items-center gap-3">
          <PieLogo size={26} />
          <div className="font-display text-2xl font-black tracking-[-0.5px] text-white leading-none">
            Civic<span className="text-[#C41230]">Pie</span>
          </div>
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          {!q && (
            <EmptyCard
              title="No search entered"
              body="Head back home and enter a ZIP code or address to look up."
            />
          )}

          {q && !body && (
            <div className="flex flex-col items-center gap-4 py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8A030] border-t-transparent" />
              <p className="font-body text-sm text-white/50">Looking up “{q}”…</p>
            </div>
          )}

          {q && body && (status === 404 || body.error) && (
            <EmptyCard
              title="We couldn't find that address"
              body={`“${q}” didn't match any US address we could resolve. Double-check the spelling or try a ZIP code.`}
            />
          )}

          {q && body && body.coverage === 'local' && (
            <div className="bg-white/[0.04] border border-white/[0.10] rounded-[20px] p-8 backdrop-blur-[16px]">
              <div className="font-display text-[10px] font-bold tracking-[2.5px] uppercase text-[#E8A030] mb-3">
                ✅ You&apos;re covered
              </div>
              <h1 className="font-display text-3xl font-black text-white tracking-[-1px] mb-2">
                {body.district_label || wardLabel(body.district_id)}
              </h1>
              <p className="font-body text-sm text-white/50 mb-6">{body.address}</p>
              <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-white/40 mb-3">
                Your representatives
              </div>
              <div className="flex flex-col gap-2 mb-6">
                {(body.officials || []).map((o: any, i: number) => (
                  <OfficialRow key={o.id || i} o={o} />
                ))}
              </div>
              <div className="flex gap-3 flex-wrap">
                {wardHref(body.district_id) && (
                  <Link
                    href={wardHref(body.district_id)!}
                    className="bg-[#C41230] text-white font-display text-sm font-bold py-3 px-6 rounded-[10px] hover:bg-[#E8243E] transition-colors"
                  >
                    View full ward page →
                  </Link>
                )}
                <Link
                  href="/"
                  className="px-6 py-3 rounded-[10px] bg-white/[0.06] border border-white/[0.12] font-display text-sm font-semibold text-white/70 hover:bg-white/[0.1] hover:text-white transition-all"
                >
                  New search
                </Link>
              </div>
            </div>
          )}

          {q && body && body.coverage === 'none' && (
            <div className="bg-white/[0.04] border border-white/[0.10] rounded-[20px] p-8 backdrop-blur-[16px]">
              <div className="font-display text-[10px] font-bold tracking-[2.5px] uppercase text-[#E8A030] mb-3">
                🗺️ Coming soon to your area
              </div>
              <h1 className="font-display text-3xl font-black text-white tracking-[-1px] mb-3">
                Hyperlocal coverage for {body.address || 'this area'} is coming soon
              </h1>
              <p className="font-body text-[15px] text-white/55 leading-relaxed mb-8">{body.message}</p>

              {(body.federal_officials || []).length > 0 && (
                <>
                  <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-white/40 mb-3">
                    Your federal representatives
                  </div>
                  <div className="flex flex-col gap-2 mb-8">
                    {body.federal_officials!.map((o: any, i: number) => (
                      <OfficialRow key={o.id || i} o={o} />
                    ))}
                  </div>
                </>
              )}

              {(body.state_officials || []).length > 0 && (
                <>
                  <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-white/40 mb-3">
                    {body.state_name} state legislators
                    {typeof body.state_officials_total === 'number' &&
                      body.state_officials_total > body.state_officials!.length &&
                      ` (${body.state_officials!.length} of ${body.state_officials_total} shown)`}
                  </div>
                  <div className="flex flex-col gap-2 mb-8">
                    {body.state_officials!.map((o: any, i: number) => (
                      <OfficialRow key={o.id || i} o={o} />
                    ))}
                  </div>
                </>
              )}

              <div className="rounded-2xl bg-[#C41230]/10 border border-[#C41230]/25 p-6 mb-6">
                <div className="font-display text-base font-bold text-white mb-1.5">
                  Want CivicPie in {body.state_name || 'your area'}?
                </div>
                <p className="font-body text-sm text-white/50 mb-4">
                  Sign up free and we&apos;ll notify you the moment hyperlocal coverage launches near you.
                </p>
                <Link
                  href="/signup"
                  className="inline-block bg-[#C41230] text-white font-display text-sm font-bold py-3 px-6 rounded-[10px] hover:bg-[#E8243E] transition-colors"
                >
                  Notify me →
                </Link>
              </div>

              <Link
                href="/"
                className="font-body text-sm text-white/45 hover:text-white transition-colors"
              >
                ← Back home
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="px-10 py-6 text-center">
        <p className="font-body text-xs text-white/25">
          CivicPie · Nonpartisan · All data sourced from public government records
        </p>
      </footer>
    </div>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.10] rounded-[20px] p-10 text-center backdrop-blur-[16px]">
      <div className="text-4xl mb-4">🔍</div>
      <h1 className="font-display text-2xl font-black text-white tracking-[-0.5px] mb-3">{title}</h1>
      <p className="font-body text-[15px] text-white/50 leading-relaxed mb-8">{body}</p>
      <Link
        href="/"
        className="inline-block bg-[#C41230] text-white font-display text-sm font-bold py-3 px-6 rounded-[10px] hover:bg-[#E8243E] transition-colors"
      >
        Back home →
      </Link>
    </div>
  );
}

export default function CoveragePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#001B3D] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8A030] border-t-transparent" />
        </div>
      }
    >
      <CoverageInner />
    </Suspense>
  );
}
