'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { PieLogo } from '@/components/Logo';
import { getCurrentUser, refreshUser, signOut, User } from '@/lib/auth';
import { Stat } from '@/components/ui';

interface DistrictInfo {
  label: string | null;
  href: string | null;
  coverage: string | null;
  officials: { name: string; office_title: string }[];
}

interface MeetingItem {
  day: string;
  mon: string;
  title: string;
  sub: string;
}

const ELECTION_DAY = new Date('2026-11-03T00:00:00');

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [district, setDistrict] = useState<DistrictInfo | null>(null);
  const [meetings, setMeetings] = useState<MeetingItem[] | null>(null);
  const [meetingsTotal, setMeetingsTotal] = useState<number | null>(null);

  useEffect(() => {
    async function init() {
      // Try real Cognito session first
      const realUser = await refreshUser();
      if (realUser) {
        setUser(realUser);
        return;
      }
      // Fallback: check localStorage
      const localUser = getCurrentUser();
      if (localUser) {
        setUser(localUser);
        return;
      }
      // No user — create demo
      const demoUser: User = { id: 'demo', name: 'Demo User', email: 'demo@civicpie.com', zipCode: '60660', ward: '48' };
      localStorage.setItem('civicpie_auth', JSON.stringify({ user: demoUser, token: 'demo-token' }));
      document.cookie = 'civicpie_session=demo-token; path=/; max-age=86400; SameSite=Lax';
      setUser(demoUser);
    }
    init();
  }, []);

  // Load the signed-in user's real district + meetings. The dashboard used
  // to be Chicago-shaped for everyone: users without a Chicago ward saw
  // "Chicago, IL" labels and static demo content. Everything here comes
  // from the same lookup/meetings APIs the public site uses.
  useEffect(() => {
    if (!user?.zipCode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lookup?address=${encodeURIComponent(user.zipCode)}`);
        if (res.ok) {
          const d = await res.json();
          if (!cancelled) {
            const officials = (d.officials?.length ? d.officials : d.federal_officials) || [];
            setDistrict({
              label: d.district_label || null,
              href: d.district_href || null,
              coverage: d.coverage || null,
              officials: officials.slice(0, 4).map((o: any) => ({
                name: o.name,
                office_title: o.office_title,
              })),
            });
          }
        }
      } catch { /* district card simply won't render */ }
      try {
        const res = await fetch('/api/meetings?upcoming=1&limit=2');
        if (res.ok) {
          const d = await res.json();
          if (!cancelled) {
            setMeetingsTotal(d.total ?? null);
            setMeetings(
              (d.data || []).map((mt: any) => {
                const dt = new Date(`${mt.date}T12:00:00`);
                return {
                  day: String(dt.getDate()).padStart(2, '0'),
                  mon: dt.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
                  title: mt.title,
                  sub: `${mt.time || ''} · ${mt.body || ''}`.trim(),
                };
              })
            );
          }
        }
      } catch { /* events fall back to the election card */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  if (!user) return null;

  const daysToElection = Math.max(
    0,
    Math.ceil((ELECTION_DAY.getTime() - Date.now()) / 86400000)
  );
  // The user's place, from their resolved district — never a hardcoded city.
  const districtLabel =
    district?.label || user.districtLabel || null;
  const districtHref = district?.href || user.districtHref || null;
  const placeLine = user.ward
    ? `Ward ${user.ward}, Chicago, IL`
    : districtLabel || (user.zipCode ? `ZIP ${user.zipCode}` : 'Your district');

  const metrics = [
    { label: 'Days to Election Day', value: String(daysToElection), color: 'var(--cp-red)' },
    { label: 'Upcoming Meetings', value: meetingsTotal != null ? String(meetingsTotal) : '—', color: 'var(--cp-navy)' },
    { label: 'Your Officials', value: district ? String(district.officials.length ? district.officials.length + '+' : '0') : '—', color: 'var(--cp-gold-dim)' },
    { label: 'Election Day', value: 'Nov 3', color: 'var(--cp-navy)' },
  ];

  const events: { d: string; m: string; t: string; s: string }[] =
    meetings && meetings.length
      ? meetings.map((mt) => ({ d: mt.day, m: mt.mon, t: mt.title, s: mt.sub }))
      : [{ d: '03', m: 'NOV', t: 'General Election Day', s: 'Tuesday, November 3, 2026 · Polls open morning to evening' }];

  const quickActions = [
    { icon: '🗳️', t: 'Check Voter Registration', d: 'Verify your status in 30 seconds', href: 'https://www.vote.gov' },
    { icon: '📍', t: 'Find Your Polling Place', d: 'See where to vote on election day', href: user.ward ? '/state/illinois' : 'https://www.vote.gov' },
    { icon: '💰', t: 'Browse Available Grants', d: 'Grant programs and services near you', href: '/services' },
    { icon: '🤝', t: 'Visit Your District', d: districtLabel || 'Your local district page', href: districtHref || '/explore' },
  ];

  // Every sidebar item goes to a real page — no dead tabs.
  const navItems = [
    { href: '/dashboard', icon: '🏠', label: 'Overview' },
    { href: '/elections', icon: '🗳️', label: 'Elections', badge: `${daysToElection}d` },
    { href: '/meetings', icon: '📅', label: 'Meetings' },
    { href: '/officials', icon: '👤', label: 'Officials' },
    { href: '/services', icon: '🏛️', label: 'Services' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-[260px] bg-navy flex flex-col border-r border-white/[0.06] flex-shrink-0">
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <PieLogo size={22} />
            <div>
              <div className="font-display text-lg font-black text-white tracking-[-0.5px] leading-none">
                Civic<span className="text-red">Pie</span>
              </div>
              <div className="font-body text-[8px] text-white/45 tracking-[1px] uppercase mt-0.5">
                {user.ward ? `Ward ${user.ward} · Chicago` : districtLabel || 'Your District'}
              </div>
            </div>
          </div>
        </div>
        <nav className="p-6 flex-1 space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-lg font-display text-[13px] font-semibold transition-all ${
                  isActive
                    ? 'bg-[rgba(196,18,48,0.15)] text-white'
                    : 'text-white/50 hover:bg-white/[0.05] hover:text-white/85'
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span> {item.label}
                {item.badge && <span className="ml-auto bg-red text-white text-[10px] font-bold px-[7px] py-0.5 rounded-full">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-6 border-t border-white/[0.06]">
          <button onClick={handleSignOut}
            className="flex items-center gap-2.5 w-full py-2.5 px-3 rounded-lg font-display text-[13px] font-semibold text-white/55 hover:text-white hover:bg-white/[0.05] transition-all">
            <span className="text-base">🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between flex-wrap gap-3 py-4 px-8 max-sm:px-4 bg-white border-b border-gray-200 shadow-sm">
          <div>
            <div className="font-display text-lg font-black text-navy">{user.ward ? 'Your Ward Overview' : 'Your District Overview'}</div>
            <div className="font-body text-[13px] text-stone mt-px">{placeLine}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(196,18,48,0.1)] text-red font-body text-[11px] font-semibold">🗳 General Election: {daysToElection} days</span>
            <a href="https://www.vote.gov" target="_blank" rel="noreferrer"
              className="bg-red text-white font-display text-[13px] font-bold px-5 py-2.5 rounded-lg hover:bg-red-hover transition-colors shadow-[0_2px_8px_rgba(196,18,48,0.35)]">
              Check Registration
            </a>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3 mb-6 max-lg:grid-cols-2 max-sm:grid-cols-1">
            {metrics.map((m, i) => (
              <Stat key={i} card labelFirst value={m.value} label={m.label} color={m.color} size={28} />
            ))}
          </div>

          {/* Your district */}
          {district && (district.label || district.officials.length > 0) && (
            <div className="p-5 rounded-xl border border-gray-200 bg-white mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-display text-[14px] font-bold text-navy">
                    {district.label ? `Your District — ${district.label}` : 'Your Representatives'}
                  </div>
                  <div className="font-body text-[12px] text-stone mt-0.5">
                    {district.coverage === 'local'
                      ? 'Your local officials, from your ZIP code.'
                      : 'Hyperlocal coverage is still expanding to your area — here are your federal representatives.'}
                  </div>
                </div>
                {district.href && (
                  <Link href={district.href}
                    className="bg-navy text-white font-display text-[12px] font-bold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity no-underline">
                    Open District Page →
                  </Link>
                )}
              </div>
              {district.officials.length > 0 && (
                <div className="grid grid-cols-2 gap-2.5 mt-4 max-sm:grid-cols-1">
                  {district.officials.map((o, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50">
                      <span className="text-base">👤</span>
                      <div className="min-w-0">
                        <div className="font-display text-[12.5px] font-bold text-navy truncate">{o.name}</div>
                        <div className="font-body text-[11px] text-stone">{o.office_title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content row */}
          <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
            {/* Events */}
            <div>
              <div className="font-display text-[14px] font-bold text-navy mb-4">Upcoming Events</div>
              {events.map((e, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl border border-gray-200 bg-white mb-2.5 hover:border-navy hover:shadow-sm transition-all cursor-pointer">
                  <div className="w-11 h-11 rounded-lg bg-navy flex flex-col items-center justify-center flex-shrink-0">
                    <div className="font-display text-[7px] font-bold text-white/55 tracking-[1.5px] uppercase">{e.m}</div>
                    <div className="font-display text-lg font-black text-white leading-none">{e.d}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[13px] font-bold text-navy">{e.t}</div>
                    <div className="font-body text-[11px] text-stone mt-0.5">{e.s}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div>
              <div className="font-display text-[14px] font-bold text-navy mb-4">Quick Actions</div>
              {quickActions.map((a, i) => (
                <a key={i} href={a.href} target={a.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white mb-2.5 cursor-pointer hover:border-navy hover:shadow-sm transition-all no-underline">
                  <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center text-lg flex-shrink-0">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[13px] font-bold text-navy">{a.t}</div>
                    <div className="font-body text-[11px] text-stone mt-0.5">{a.d}</div>
                  </div>
                  <span className="text-stone-light text-sm">→</span>
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
