'use client';

import { useState, useEffect } from 'react';

// State-specific voter registration info
const STATE_REGISTRATION: Record<string, { url: string; deadline: string; portal: string }> = {
  IL: { url: 'https://ova.elections.il.gov/', deadline: 'Oct 20, 2026', portal: 'Illinois Online Voter Application' },
  NY: { url: 'https://dmv.ny.gov/more-info/electronic-voter-registration-application', deadline: 'Oct 24, 2026', portal: 'NY DMV Voter Registration' },
  CA: { url: 'https://registertovote.ca.gov/', deadline: 'Oct 19, 2026', portal: 'California Online Voter Registration' },
  TX: { url: 'https://www.votetexas.gov/register-to-vote/', deadline: 'Oct 5, 2026', portal: 'VoteTexas.gov' },
  FL: { url: 'https://registertovoteflorida.gov/', deadline: 'Oct 5, 2026', portal: 'Florida Online Voter Registration' },
};

// ─── Election Countdown ──────────────────────────────────────────────────────

export function ElectionCountdown() {
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const target = new Date('2026-11-03T07:00:00-06:00'); // 2026 General Election
    const calc = () => {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      setDaysLeft(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    };
    calc();
    const iv = setInterval(calc, 3600000);
    return () => clearInterval(iv);
  }, []);

  if (daysLeft === 0) return null;

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C41230]/10 text-[#C41230] font-body text-xs font-semibold border border-[#C41230]/20">
      <span className="w-1.5 h-1.5 rounded-full bg-[#C41230] animate-pulse" />
      {daysLeft} days until Election Day
    </span>
  );
}

// ─── Voter Registration Card ─────────────────────────────────────────────────

export function VoterRegistrationCard({ stateAbbr, stateName }: { stateAbbr?: string; stateName?: string }) {
  const reg = stateAbbr ? STATE_REGISTRATION[stateAbbr.toUpperCase()] : null;
  const url = reg?.url || 'https://www.vote.gov';
  const deadline = reg?.deadline || 'Check your state';
  const portal = reg?.portal || 'Vote.gov';

  return (
    <div className="card p-6 bg-[#F5EDD8] border-[#EDE0C4]">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#C41230]/10 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-[#C41230]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M12 12v3" /><path d="M9 15l3-3 3 3" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-[#001B3D] mb-1.5">Register to Vote</h3>
          <p className="text-sm text-[#6B7280] mb-2">
            {stateName ? `${stateName} voter registration deadline: ` : 'Voter registration deadline: '}
            <strong className="text-[#C41230]">{deadline}</strong>
          </p>
          <a href={url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#C41230] text-white font-display text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-[#E8243E] transition-all shadow-[0_4px_14px_rgba(196,18,48,0.35)]">
            Register Now → <span className="text-[10px] opacity-75 ml-1">{portal}</span>
          </a>
          <p className="text-[11px] text-[#9BA3AF] mt-3">
            It takes 2 minutes. You&apos;ll need your state ID or driver&apos;s license.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Election Alert Signup ───────────────────────────────────────────────────

export function ElectionAlertSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    // Store in localStorage for now — swap for API call
    const alerts = JSON.parse(localStorage.getItem('civicpie_alerts') || '[]');
    alerts.push({ email, date: new Date().toISOString(), type: 'election_alerts' });
    localStorage.setItem('civicpie_alerts', JSON.stringify(alerts));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="card p-5 bg-[#F5EDD8] border-[#EDE0C4] text-center">
        <div className="text-2xl mb-2">✅</div>
        <p className="font-display font-bold text-sm text-[#001B3D]">You&apos;re on the list!</p>
        <p className="text-xs text-[#6B7280] mt-1">We&apos;ll send you election reminders.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 bg-[#001B3D] text-white">
      <h3 className="font-display font-bold text-sm mb-1">Stay Informed</h3>
      <p className="text-xs text-white/50 mb-3">Get election reminders, registration deadlines, and voting info.</p>
      <div className="flex gap-2">
        <input
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 bg-white/[0.08] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#E8A030]/50 placeholder:text-white/25 font-body"
        />
        <button type="submit"
          className="bg-[#E8A030] text-[#001B3D] font-display text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#F5BE6A] transition-colors whitespace-nowrap">
          Sign Up
        </button>
      </div>
    </form>
  );
}

// ─── Urgency Banner ──────────────────────────────────────────────────────────

export function ElectionUrgencyBanner() {
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    const target = new Date('2026-11-03T07:00:00-06:00');
    const diff = target.getTime() - Date.now();
    setDaysLeft(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
  }, []);

  if (daysLeft === 0 || daysLeft > 120) return null;

  return (
    <div className="bg-[#C41230] text-white py-3 px-4 text-center sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap">
        <span className="font-display font-bold text-sm">
          🗳️ Election Day is {daysLeft} days away. Are you registered?
        </span>
        <a href="https://www.vote.gov" target="_blank" rel="noreferrer"
          className="bg-white text-[#C41230] font-display text-xs font-bold px-4 py-1.5 rounded-full hover:bg-[#F5EDD8] transition-colors">
          Check Now →
        </a>
      </div>
    </div>
  );
}
