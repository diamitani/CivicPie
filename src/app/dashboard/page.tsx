'use client';

import { Landmark } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen bg-[#FAFAF8]">
      {/* Sidebar */}
      <aside className="w-[260px] bg-navy flex flex-col border-r border-white/[0.06] flex-shrink-0">
        <div className="p-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-5.5 h-5.5 rounded-md bg-gradient-to-br from-[#E8A030] to-[#F5BE6A] flex items-center justify-center">
            <Landmark className="w-3.5 h-3.5 text-[#001B3D]" />
          </div>
            <div>
              <div className="font-display text-lg font-black text-white tracking-[-0.5px] leading-none">
                Civic<span className="text-[#C41230]">Pie</span>
              </div>
              <div className="font-body text-[8px] text-white/30 tracking-[1px] uppercase">Ward 3 · Chicago</div>
            </div>
          </div>
        </div>
        <nav className="p-6 flex-1 space-y-1">
          {[
            { id: 'overview', icon: '🏠', label: 'Overview', active: true },
            { id: 'elections', icon: '🗳️', label: 'Elections', badge: '30d' },
            { id: 'events', icon: '📅', label: 'Events' },
            { id: 'officials', icon: '👤', label: 'Officials' },
            { id: 'volunteer', icon: '🤝', label: 'Volunteer' },
          ].map(item => (
            <button key={item.id}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-lg font-display text-[13px] font-semibold transition-all ${
                item.active ? 'bg-[rgba(196,18,48,0.15)] text-white' : 'text-white/50 hover:bg-white/[0.05] hover:text-white/85'
              }`}>
              <span className="text-base w-5 text-center">{item.icon}</span> {item.label}
              {item.badge && <span className="ml-auto bg-[#C41230] text-white text-[10px] font-bold px-[7px] py-0.5 rounded-full">{item.badge}</span>}
            </button>
          ))}
          <div className="pt-5 pb-3"><div className="font-display text-[9px] font-bold tracking-[2.5px] uppercase text-white/25 px-3">Resources</div></div>
          {[{ id: 'grants', icon: '💰', label: 'Grants' }, { id: 'services', icon: '🏛️', label: 'Services' }].map(item => (
            <button key={item.id} className="flex items-center gap-3 w-full py-2.5 px-3 rounded-lg font-display text-[13px] font-semibold text-white/50 hover:bg-white/[0.05] hover:text-white/85 transition-all">
              <span className="text-base w-5 text-center">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-white/[0.06]">
          <button onClick={() => router.push('/')} className="flex items-center gap-2.5 w-full py-2.5 px-3 rounded-lg font-display text-[13px] font-semibold text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all">
            <span className="text-base">🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between py-4 px-8 bg-white border-b border-[#E8E8E6] shadow-sm">
          <div>
            <div className="font-display text-lg font-black text-navy">Your Ward Overview</div>
            <div className="font-body text-[13px] text-stone mt-px">Ward 3, Chicago, IL · Updated 2 min ago</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(196,18,48,0.1)] text-[#C41230] font-body text-[11px] font-semibold">🗳 Primary: 30 days</span>
            <button className="bg-[#C41230] text-white font-display text-[13px] font-bold px-5 py-2.5 rounded-lg hover:bg-[#E8243E] transition-colors shadow-[0_2px_8px_rgba(196,18,48,0.35)]">Check Registration</button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3 mb-5 max-lg:grid-cols-2">
            {[
              { label: 'Days to Primary', value: '30', color: '#C41230' },
              { label: 'Upcoming Meetings', value: '3' },
              { label: 'Open Grants', value: '$2.4M', color: '#B87818' },
              { label: 'Volunteer Spots', value: '18' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-xl border border-[#E8E8E6] p-4 shadow-sm">
                <div className="font-body text-[11px] font-semibold text-stone tracking-[0.5px] uppercase mb-1">{m.label}</div>
                <div className="font-display text-[26px] font-black tracking-[-1px] leading-none" style={{ color: m.color || '#001B3D' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
            <div>
              <div className="font-display text-[13px] font-bold text-navy mb-3">Upcoming Events</div>
              {[
                { d: '14', m: 'MAY', t: 'Ward 3 City Council Meeting', s: '7:00 PM · City Hall' },
                { d: '18', m: 'MAY', t: 'Poll Worker Training', s: '10:00 AM · Lincoln Library · 12 spots' },
              ].map((e, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl border border-[#E8E8E6] bg-white mb-2 hover:border-navy hover:shadow-sm transition-all cursor-pointer">
                  <div className="w-11 h-11 rounded-lg bg-navy flex flex-col items-center justify-center flex-shrink-0">
                    <div className="font-display text-[7px] font-bold text-white/50 tracking-[1.5px] uppercase">{e.m}</div>
                    <div className="font-display text-lg font-black text-white leading-none">{e.d}</div>
                  </div>
                  <div className="flex-1"><div className="font-display text-[13px] font-bold text-navy">{e.t}</div><div className="font-body text-[11px] text-stone">{e.s}</div></div>
                </div>
              ))}
            </div>
            <div>
              <div className="font-display text-[13px] font-bold text-navy mb-3">Quick Actions</div>
              {[
                { icon: '🗳️', t: 'Check Voter Registration', d: 'Verify your status in 30 seconds' },
                { icon: '📍', t: 'Find Your Polling Place', d: 'See where to vote on election day' },
                { icon: '💰', t: 'Browse Available Grants', d: '$2.4M in open grant programs' },
                { icon: '🤝', t: 'Sign Up to Volunteer', d: '18 open positions near you' },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-[#E8E8E6] bg-white mb-2 cursor-pointer hover:border-navy hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-lg bg-cream flex items-center justify-center text-lg flex-shrink-0">{a.icon}</div>
                  <div className="flex-1"><div className="font-display text-[13px] font-bold text-navy">{a.t}</div><div className="font-body text-[11px] text-stone">{a.d}</div></div>
                  <span className="text-[#E8E8E6] text-sm">→</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
