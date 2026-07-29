'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PieLogo } from '@/components/Logo';
import { getCurrentUser, refreshUser, signOut, User } from '@/lib/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

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

  const handleSignOut = () => {
    signOut();
    router.push('/');
  };

  if (!user) return null;

  const metrics = [
    { label: 'Days to Primary', value: '30', color: '#C41230' },
    { label: 'Upcoming Meetings', value: '3', color: '#001B3D' },
    { label: 'Open Grants', value: '$2.4M', color: '#B87818' },
    { label: 'Volunteer Spots', value: '18', color: '#001B3D' },
  ];

  const events = [
    { d: '14', m: 'MAY', t: 'Ward 3 City Council Meeting', s: '7:00 PM · City Hall' },
    { d: '18', m: 'MAY', t: 'Poll Worker Training', s: '10:00 AM · Lincoln Library · 12 spots' },
  ];

  const quickActions = [
    { icon: '🗳️', t: 'Check Voter Registration', d: 'Verify your status in 30 seconds', href: 'https://www.vote.gov' },
    { icon: '📍', t: 'Find Your Polling Place', d: 'See where to vote on election day', href: '/state/illinois' },
    { icon: '💰', t: 'Browse Available Grants', d: '$2.4M in open grant programs', href: '/state/illinois' },
    { icon: '🤝', t: 'Sign Up to Volunteer', d: '18 open positions near you', href: '/ward/chicago-48' },
  ];

  const navItems = [
    { id: 'overview', icon: '🏠', label: 'Overview' },
    { id: 'elections', icon: '🗳️', label: 'Elections', badge: '30d' },
    { id: 'events', icon: '📅', label: 'Events' },
    { id: 'officials', icon: '👤', label: 'Officials' },
    { id: 'volunteer', icon: '🤝', label: 'Volunteer' },
  ];

  return (
    <div className="flex h-screen bg-[#FAFAF8]">
      {/* Sidebar */}
      <aside className="w-[260px] bg-[#001B3D] flex flex-col border-r border-white/[0.06] flex-shrink-0">
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <PieLogo size={22} />
            <div>
              <div className="font-display text-lg font-black text-white tracking-[-0.5px] leading-none">
                Civic<span className="text-[#C41230]">Pie</span>
              </div>
              <div className="font-body text-[8px] text-white/45 tracking-[1px] uppercase mt-0.5">
                Ward {user.ward || '3'} · Chicago
              </div>
            </div>
          </div>
        </div>
        <nav className="p-6 flex-1 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-lg font-display text-[13px] font-semibold transition-all ${
                activeTab === item.id
                  ? 'bg-[rgba(196,18,48,0.15)] text-white'
                  : 'text-white/50 hover:bg-white/[0.05] hover:text-white/85'
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span> {item.label}
              {item.badge && <span className="ml-auto bg-[#C41230] text-white text-[10px] font-bold px-[7px] py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}
          <div className="pt-5 pb-3"><div className="font-display text-[9px] font-bold tracking-[2.5px] uppercase text-white/45 px-3">Resources</div></div>
          {[{ id: 'grants', icon: '💰', label: 'Grants' }, { id: 'services', icon: '🏛️', label: 'Services' }].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-lg font-display text-[13px] font-semibold transition-all ${
                activeTab === item.id
                  ? 'bg-[rgba(196,18,48,0.15)] text-white'
                  : 'text-white/50 hover:bg-white/[0.05] hover:text-white/85'
              }`}>
              <span className="text-base w-5 text-center">{item.icon}</span> {item.label}
            </button>
          ))}
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
        <header className="flex items-center justify-between py-4 px-8 bg-white border-b border-[#E8E8E6] shadow-sm">
          <div>
            <div className="font-display text-lg font-black text-[#001B3D]">Your Ward Overview</div>
            <div className="font-body text-[13px] text-[#6B7280] mt-px">Ward {user.ward || '3'}, Chicago, IL · Updated 2 min ago</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(196,18,48,0.1)] text-[#C41230] font-body text-[11px] font-semibold">🗳 Primary: 30 days</span>
            <a href="https://www.vote.gov" target="_blank" rel="noreferrer"
              className="bg-[#C41230] text-white font-display text-[13px] font-bold px-5 py-2.5 rounded-lg hover:bg-[#E8243E] transition-colors shadow-[0_2px_8px_rgba(196,18,48,0.35)]">
              Check Registration
            </a>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3 mb-6 max-lg:grid-cols-2">
            {metrics.map((m, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E8E8E6] p-5 shadow-sm">
                <div className="font-body text-[11px] font-semibold text-[#6B7280] tracking-[0.5px] uppercase mb-1">{m.label}</div>
                <div className="font-display text-[28px] font-black tracking-[-1px] leading-none" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Content row */}
          <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
            {/* Events */}
            <div>
              <div className="font-display text-[14px] font-bold text-[#001B3D] mb-4">Upcoming Events</div>
              {events.map((e, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl border border-[#E8E8E6] bg-white mb-2.5 hover:border-[#001B3D] hover:shadow-sm transition-all cursor-pointer">
                  <div className="w-11 h-11 rounded-lg bg-[#001B3D] flex flex-col items-center justify-center flex-shrink-0">
                    <div className="font-display text-[7px] font-bold text-white/55 tracking-[1.5px] uppercase">{e.m}</div>
                    <div className="font-display text-lg font-black text-white leading-none">{e.d}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[13px] font-bold text-[#001B3D]">{e.t}</div>
                    <div className="font-body text-[11px] text-[#6B7280] mt-0.5">{e.s}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div>
              <div className="font-display text-[14px] font-bold text-[#001B3D] mb-4">Quick Actions</div>
              {quickActions.map((a, i) => (
                <a key={i} href={a.href} target={a.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                  className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E8E6] bg-white mb-2.5 cursor-pointer hover:border-[#001B3D] hover:shadow-sm transition-all no-underline">
                  <div className="w-10 h-10 rounded-lg bg-[#F5EDD8] flex items-center justify-center text-lg flex-shrink-0">{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[13px] font-bold text-[#001B3D]">{a.t}</div>
                    <div className="font-body text-[11px] text-[#6B7280] mt-0.5">{a.d}</div>
                  </div>
                  <span className="text-[#9BA3AF] text-sm">→</span>
                </a>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
