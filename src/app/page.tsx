'use client';

import { useState, useEffect, useRef } from 'react';
import { PieLogo } from '@/components/Logo';
import FindYourReps from '@/components/FindYourReps';
import { Stat, SearchPill } from '@/components/ui';

export default function LandingPage() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle('scrolled', window.scrollY > 40);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Scroll reveal
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar navRef={navRef} />
      <Hero />
      <StatsRibbon />
      <TrustBar />
      <FindYourRepsSection />
      <HowItWorks />
      <Manifesto />
      <Features />
      <Listings />
      <ElectionCTA />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// NAVBAR
// ════════════════════════════════════════════════════════════════
function Navbar({ navRef }: { navRef: React.RefObject<HTMLElement | null> }) {
  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-[1000] px-10 transition-all duration-300"
      style={{ padding: '0 40px' }}
    >
      <style jsx>{`
        nav.scrolled {
          background: rgba(0, 27, 61, 0.97);
          backdrop-filter: blur(20px);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06);
        }
      `}</style>
      <div className="flex items-center gap-8 h-[72px] max-w-[1200px] mx-auto">
        <a href="/" className="flex items-center gap-3 flex-shrink-0">
          <PieLogo size={26} />
          <div>
            <div className="font-display text-2xl font-black tracking-[-0.5px] text-white leading-none">
              Civic<span className="text-red">Pie</span>
            </div>
            <div className="font-display text-[7px] font-bold tracking-[2px] uppercase text-white/55 mt-0.5">
              Hyperlocal Civic Engagement
            </div>
          </div>
        </a>
        <div className="flex items-center gap-8 flex-1 justify-center">
          {[
            { label: 'Explore', href: '/explore' },
            { label: 'Events', href: '/events' },
            { label: 'Officials', href: '/officials' },
            { label: 'Elections', href: '/elections' },
            { label: 'Services', href: '/services' },
          ].map(link => (
            <a key={link.label} href={link.href} className="font-display text-[13px] font-semibold text-white/55 hover:text-white transition-colors tracking-[0.3px]">
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a href="/signin" className="font-display text-[13px] font-semibold text-white/55 hover:text-white transition-colors">
            Sign In
          </a>
          <a href="/signup" className="font-display text-[13px] font-bold bg-red text-white px-5 py-2.5 rounded-lg tracking-[0.3px] hover:bg-red-hover transition-all shadow-[0_2px_8px_rgba(196,18,48,0.35)]">
            Sign Up Free
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Shared address search routing ─────────────────────────────────────────
// Every address/ZIP search on the homepage goes through /api/lookup first,
// so routing is driven by real data — not hardcoded ZIP lists.
// Ward 48 (the only ward with a full district page) routes directly there;
// everything else goes to /coverage, which renders local results, federal +
// state officials for out-of-coverage areas, or a graceful not-found.
// Days until the Nov 3, 2026 general election — computed, never hardcoded.
// (This page previously carried a baked-in "31 days" that went stale, while
// the dashboard computed 13 — three different countdowns sitewide.)
function daysToElection(): number {
  return Math.max(
    0,
    Math.ceil((new Date('2026-11-03T00:00:00').getTime() - Date.now()) / 86400000)
  );
}

async function routeAddressSearch(rawQuery: string): Promise<void> {
  const q = rawQuery.trim();
  if (!q) return;
  try {
    const res = await fetch(`/api/lookup?address=${encodeURIComponent(q)}`);
    const body = await res.json().catch(() => ({}));
    const m = (body.district_id || '').match(/^il-chicago-ward-(\d+)$/);
    if (body.coverage === 'local' && m && m[1] === '48') {
      window.location.href = '/ward/chicago-48';
      return;
    }
  } catch {
    // fall through to /coverage on any lookup failure
  }
  window.location.href = `/coverage?q=${encodeURIComponent(q)}`;
}

// ════════════════════════════════════════════════════════════════
// HERO
// ════════════════════════════════════════════════════════════════
function Hero() {
  const [zip, setZip] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searching) return;
    setSearching(true);
    try {
      await routeAddressSearch(zip);
    } finally {
      // Navigation normally unmounts us; reset only if we're still here.
      setSearching(false);
    }
  };
  return (
    <section className="min-h-screen bg-navy relative overflow-hidden flex flex-col justify-center">
      {/* Grid texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      {/* Glows */}
      <div className="absolute top-[-10%] right-[-5%] w-[55%] h-[80%] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(196,18,48,0.18) 0%, transparent 65%)' }} />
      <div className="absolute bottom-[-20%] left-[5%] w-[45%] h-[70%] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(232,160,48,0.10) 0%, transparent 65%)' }} />
      {/* Accent bar */}
      <div className="absolute right-0 top-0 bottom-0 w-[6px]" style={{ background: 'linear-gradient(180deg, var(--cp-gold) 0%, var(--cp-red) 50%, transparent 100%)' }} />

      <div className="relative z-[2] py-[160px] pad-x max-w-[1200px] mx-auto w-full">
        <div className="grid grid-cols-[1fr_420px] gap-20 items-center max-lg:grid-cols-1">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-[18px] py-2 backdrop-blur-[8px] mb-7 animate-fade-up text-white/65 text-xs font-medium">
              <span className="w-[7px] h-[7px] rounded-full bg-gold flex-shrink-0 animate-pulse" />
              Nonpartisan · Free · Powered by public data
            </div>
            <h1 className="font-display text-[clamp(52px,6vw,80px)] font-black tracking-[-2.5px] leading-[0.95] text-white mb-7">
              Your city.<br />Your gov.<br />
              <span className="text-gold">In one place.</span>
            </h1>
            <p className="font-serif text-xl text-white/55 leading-relaxed mb-10 max-w-[520px]">
              CivicPie connects you with the local services, elected officials, meetings, elections, and opportunities that directly affect your life — sourced entirely from public government data.
            </p>
            {/* Search */}
            <div className="max-w-[500px] mb-6">
              <SearchPill
                value={zip}
                onChange={setZip}
                onSubmit={() => handleSearch()}
                placeholder="Enter your zip code or city…"
                buttonLabel="Find My Gov →"
                loading={searching}
                loadingLabel="Looking up…"
              />
            </div>
            <div className="flex items-center gap-6 text-xs text-white/50">
              <span>🔒 Free to use</span><span className="w-1 h-1 rounded-full bg-white/20" />
              <span>📋 Public data only</span><span className="w-1 h-1 rounded-full bg-white/20" />
              <span>🏛️ No political affiliation</span>
            </div>
          </div>

          {/* Right — Ward Card */}
          <div className="relative max-lg:hidden">
            <div className="absolute top-[-16px] right-[-16px] bg-red text-white rounded-full py-2 px-4 font-display text-[11px] font-bold tracking-[0.5px] shadow-[0_8px_24px_rgba(196,18,48,0.4)] z-10 flex items-center gap-1.5 animate-float">
              🗳️ General Election · Nov 3
            </div>
            <div className="bg-white/[0.04] border border-white/[0.10] rounded-[20px] p-7 backdrop-blur-[16px]">
              <div className="font-display text-[9px] font-bold tracking-[2.5px] uppercase text-gold mb-4">★ Ward 3 · Chicago, IL</div>
              <div className="font-display text-[22px] font-black text-white tracking-[-0.5px] mb-1">Your Ward Overview</div>
              <div className="font-body text-[13px] text-white/45 mb-6">Sample ward overview</div>
              {[
                { icon: '🗳️', bg: 'rgba(196,18,48,0.15)', title: 'Voter Registration', meta: 'Grace period through Nov 3 · Register & vote in person' },
                { icon: '🏛️', bg: 'rgba(0,27,61,0.15)', title: 'City Council Meeting', meta: 'Oct 21 · 10:00 AM · City Hall' },
                { icon: '🤝', bg: 'rgba(16,185,129,0.12)', title: 'Poll Worker Volunteer', meta: 'Nov 3 · Election Day signup' },
                { icon: '💰', bg: 'rgba(232,160,48,0.15)', title: 'Small Business Grant', meta: 'Rolling deadlines · Check eligibility' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-3.5 rounded-xl bg-white/[0.04] mb-2.5 cursor-pointer hover:bg-white/[0.08] transition-colors">
                  <div className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center text-base" style={{ background: item.bg }}>{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[13px] font-bold text-white truncate">{item.title}</div>
                    <div className="font-body text-[11px] text-white/40">{item.meta}</div>
                  </div>
                  <span className="text-white/45 text-sm">→</span>
                </div>
              ))}
              <div className="mt-[18px] pt-[18px] border-t border-white/[0.07] flex gap-2.5">
                <a href="/signup" className="flex-1 text-center bg-red text-white font-display text-[13px] font-bold py-3 rounded-[10px] hover:bg-red-hover transition-all shadow-[0_4px_12px_rgba(196,18,48,0.35)]">
                  Register to Vote
                </a>
                <button className="px-4 py-3 rounded-[10px] bg-white/[0.06] border border-white/[0.12] font-display text-[13px] font-semibold text-white/65 hover:bg-white/[0.1] hover:text-white transition-all whitespace-nowrap">
                  View All →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tagline row */}
      <div className="relative z-[2] pad-x pb-10 max-w-[1200px] mx-auto w-full mt-12 pt-12 border-t border-white/[0.10]">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-[1.5px] bg-white/40" />
          <span className="font-display text-[10px] font-bold tracking-[3px] uppercase text-white/55">HYPERLOCAL <em className="text-red not-italic">CIVIC</em> ENGAGEMENT</span>
          <div className="w-9 h-[1.5px] bg-white/40" />
        </div>
      </div>

    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// STATS RIBBON
// ════════════════════════════════════════════════════════════════
function StatsRibbon() {
  return (
    <div className="bg-navy-800 border-t border-b border-white/[0.08] py-7 pad-x">
      <div className="grid grid-cols-4 gap-px bg-white/[0.10] rounded overflow-hidden max-w-[1200px] mx-auto max-md:grid-cols-2">
        {[
          { num: String(daysToElection()), label: 'Days to General Election · Nov 3', color: 'var(--cp-red)' },
          { num: '20K+', label: 'Elected Officials Listed', color: 'var(--cp-gold)' },
          { num: '1,800+', label: 'District & City Pages', color: 'var(--cp-gold)' },
          { num: '100%', label: 'Free · Nonpartisan · Public', color: 'var(--cp-gold)' },
        ].map((stat, i) => (
          <div key={i} className="py-5 px-7 bg-navy-800">
            <Stat value={stat.num} label={stat.label} color={stat.color} size={32} dark />
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// FIND YOUR REPS
// ════════════════════════════════════════════════════════════════
function FindYourRepsSection() {
  return (
    <section className="section-pad-sm pad-x bg-gray-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-navy/3 blur-3xl pointer-events-none" />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="reveal">
          <p className="section-eyebrow" style={{ textAlign: 'center' }}>Free Civic Lookup</p>
          <h2 className="font-display text-[clamp(28px,4vw,42px)] font-black tracking-[-1px] text-navy leading-[1.1] mb-3">
            Find Your <em className="text-red not-italic">Representatives</em>
          </h2>
          <p className="font-serif text-lg text-stone leading-relaxed mb-10 max-w-xl mx-auto">
            Type any address, ZIP code, or state to instantly see who represents you — from city council to Congress.
          </p>
        </div>
        <div className="reveal">
          <FindYourReps />
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// TRUST BAR
// ════════════════════════════════════════════════════════════════
function TrustBar() {
  return (
    <div className="bg-cream border-y border-cream-dark py-5 pad-x">
      <div className="flex items-center justify-center gap-12 flex-wrap max-w-[1200px] mx-auto">
        {['City of Chicago', 'Cook County', 'Illinois Board of Elections', 'City Clerk', 'Data.gov', 'OpenGov Portal'].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <div className="w-px h-6 bg-cream-dark" />}
            <span className="font-display text-xs font-bold text-navy/65 tracking-[0.5px] flex items-center gap-2.5">
              <span className="text-lg">🏛️</span> {item}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// HOW IT WORKS
// ════════════════════════════════════════════════════════════════
function HowItWorks() {
  const steps = [
    {
      num: '01', verb: 'Learn.', dot: true, color: 'inherit',
      desc: 'Enter your address. Instantly see everything that affects your street — who represents you, what your government is deciding, and what resources exist in your neighborhood.',
      examples: ['Who are my local elected officials?', "What's on the city council agenda?", 'What grants is my business eligible for?'],
    },
    {
      num: '02', verb: 'Organize.', dot: true, color: 'inherit',
      desc: 'See upcoming meetings, registration deadlines, and volunteer opportunities near you — everything in one place, no account required.',
      examples: ['See upcoming meetings near you', 'Sign up to volunteer as a poll worker', 'Browse community programs and grants'],
    },
    {
      num: '03', verb: 'Vote.', dot: true, color: 'var(--cp-red)',
      desc: 'Check your registration status, find your polling place through official state tools, and see who is running where you live — from local judges to school boards to Congress.',
      examples: ['Am I registered? Is my address current?', "Who's on my ballot this November?", 'Where is my polling place?'],
    },
  ];

  return (
    <section className="section-pad pad-x bg-white">
      <div className="container-main">
        <div className="container-narrow reveal">
          <p className="section-eyebrow">How It Works</p>
          <h2 className="section-heading">Three words.<br />One platform.</h2>
          <p className="section-body">Everything CivicPie does maps to three verbs — the stages of civic life. Where you start doesn&apos;t matter. Showing up does.</p>
        </div>
        <div className="grid grid-cols-3 gap-[2px] mt-[72px] bg-gray-200 rounded-[20px] overflow-hidden shadow-sm reveal max-lg:grid-cols-1">
          {steps.map((step, i) => (
            <div key={i} className="bg-white p-12 relative group hover:bg-gray-50 transition-colors">
              <div className="font-display text-[72px] font-black tracking-[-3px] leading-none text-gray-100 mb-3 group-hover:text-[rgba(196,18,48,0.08)] transition-colors">{step.num}</div>
              <div className="font-display text-[28px] font-black tracking-[-0.5px] text-navy mb-1.5" style={{ color: step.color === 'var(--cp-red)' ? step.color : undefined }}>
                {step.verb.split('.')[0]}<span className="text-red">.</span>
              </div>
              <p className="font-body text-[15px] text-stone leading-relaxed mb-7">{step.desc}</p>
              <div className="flex flex-col gap-2">
                {step.examples.map((ex, j) => (
                  <div key={j} className="flex items-center gap-2 font-body text-[13px] text-stone">
                    <div className="w-[5px] h-[5px] rounded-full bg-gold flex-shrink-0" /> {ex}
                  </div>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-transparent group-hover:bg-red transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// MANIFESTO
// ════════════════════════════════════════════════════════════════
function Manifesto() {
  return (
    <section className="bg-cream py-[120px] px-10 relative overflow-hidden">
      <div className="absolute left-[-20px] top-[-40px] font-serif text-[400px] font-bold text-cream-dark leading-none pointer-events-none select-none">&quot;</div>
      <div className="max-w-[900px] mx-auto relative z-[1] reveal">
        <p className="font-serif text-[clamp(28px,4vw,48px)] leading-[1.3] text-navy italic mb-8">
          &quot;As American as knowing <em className="text-red italic">who&apos;s on the ballot.</em> Government belongs to the people who show up. CivicPie makes showing up easier.&quot;
        </p>
        <div className="flex items-center gap-4 font-display text-xs font-bold tracking-[2px] uppercase text-stone">
          <div className="w-8 h-0.5 bg-red" />
          CivicPie · Hyperlocal Civic Engagement · Nonpartisan
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// FEATURES
// ════════════════════════════════════════════════════════════════
function Features() {
  const features = [
    { icon: '🗳️', title: 'Elections & Voting', body: 'Registration deadlines, early-voting dates, and candidate filings for the 2026 midterms — sourced from official state and federal records.', tag: '2026 midterms' },
    { icon: '👤', title: 'Your Representatives', body: 'Every elected official from city council to Congress for your address — 20,000+ officials across all 50 states, from official public records.', tag: 'Address-level' },
    { icon: '🏛️', title: 'City Council & Meetings', body: 'Upcoming council, board, and committee meetings with dates, times, and official agendas — starting with Chicago and expanding city by city.', tag: 'Official agendas' },
    { icon: '🤝', title: 'Volunteer Opportunities', body: 'Ways to take part near you — poll work, public comment, boards, and community service — collected in one place.', tag: 'Near you' },
    { icon: '💰', title: 'Grants & Programs', body: 'Government services, assistance programs, and grant opportunities from official sources — browse what exists in your community.', tag: 'Public programs' },
    { icon: '📌', title: 'Your Dashboard', body: 'Create a free account and your district, your officials, real upcoming meetings, and the election countdown are pinned to one page.', tag: 'Free account' },
  ];

  return (
    <section className="bg-navy py-[120px] px-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 bottom-0 w-1/2 pointer-events-none" style={{ background: 'radial-gradient(ellipse at right, rgba(196,18,48,0.12) 0%, transparent 60%)' }} />
      <div className="grid grid-cols-[380px_1fr] gap-24 items-start max-w-[1200px] mx-auto max-lg:grid-cols-1 max-lg:gap-12">
        <div className="sticky top-[120px] reveal max-lg:static">
          <p className="section-eyebrow" style={{ color: 'var(--cp-gold)' }}>The Platform</p>
          <h2 className="font-display text-[clamp(32px,4vw,52px)] font-black tracking-[-1.5px] leading-none text-white mb-5">
            Every slice of your government,<br /><em className="text-red not-italic">in one place.</em>
          </h2>
          <p className="font-body text-base text-white/50 leading-relaxed mb-10">
            All sourced from official public government websites. No opinion. No spin. Just the data that directly affects your life, organized and searchable.
          </p>
          <div className="flex gap-3 flex-wrap">
            <a href="/signup" className="btn-primary">Get Started Free</a>
            <button className="btn-ghost">See All Features</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[2px] bg-white/[0.05] rounded-[20px] overflow-hidden reveal max-sm:grid-cols-1">
          {features.map((f, i) => (
            <div key={i} className="bg-[rgba(0,27,61,0.5)] p-9 border border-white/[0.05] relative overflow-hidden hover:bg-white/[0.04] transition-colors group">
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-red transition-colors" />
              <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-[22px] mb-5 group-hover:bg-[rgba(196,18,48,0.15)] transition-colors">{f.icon}</div>
              <div className="font-display text-[17px] font-bold text-white mb-2.5 tracking-[-0.2px]">{f.title}</div>
              <p className="font-body text-[13.5px] text-white/45 leading-relaxed">{f.body}</p>
              <span className="inline-flex items-center mt-4 px-2.5 py-1 rounded-full font-body text-[11px] font-semibold bg-[rgba(232,160,48,0.1)] text-gold tracking-[0.5px]">{f.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// LISTINGS
// ════════════════════════════════════════════════════════════════
function Listings() {
  const [zip, setZip] = useState('');
  const [searching, setSearching] = useState(false);
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searching) return;
    setSearching(true);
    try {
      await routeAddressSearch(zip);
    } finally {
      setSearching(false);
    }
  };
  const listings = [
    { icon: '🏛️', title: 'City Council — Regular Meeting', meta: 'Wed Oct 21 · 10:00 AM · City Hall Council Chambers', badge: 'Meeting', badgeClass: 'badge-navy' },
    { icon: '🗳️', title: 'General Election — Voter Registration', meta: 'Grace period through Nov 3 · Register & vote in person', badge: 'Election', badgeClass: 'badge-red' },
    { icon: '📋', title: 'Zoning Hearing', meta: 'Fridays · 10:00 AM · Public comment period open', badge: 'Meeting', badgeClass: 'badge-navy' },
    { icon: '🤝', title: 'Poll Worker Training — General Election', meta: 'Nov 3 · Election Day signup', badge: 'Volunteer', badgeClass: 'badge-green' },
    { icon: '💰', title: 'Small Business Grant Applications', meta: 'Up to $15,000 · Check eligibility', badge: 'Grant', badgeClass: 'badge-gold' },
    { icon: '🏘️', title: 'Community Development Block Grant — Housing', meta: 'Ongoing · Rental assistance for qualifying households', badge: 'Service', badgeClass: 'badge-cream' },
  ];

  return (
    <section className="section-pad pad-x bg-white">
      <div className="grid grid-cols-[1fr_480px] gap-20 items-start max-w-[1200px] mx-auto max-lg:grid-cols-1">
        <div>
          <div className="mb-10 reveal">
            <p className="section-eyebrow">What&apos;s Happening Now</p>
            <h2 className="section-heading">Ward 3 · Chicago<br /><em>This month.</em></h2>
            <p className="text-base text-stone mt-3">Illustrative sample — real ward data appears here once connected.</p>
          </div>
          <div className="flex gap-2 mb-6 flex-wrap reveal">
            {['All', 'Meetings', 'Elections', 'Volunteer', 'Grants', 'Services'].map((tab, i) => (
              <button key={tab} className={`px-4 py-2 rounded-full font-display text-xs font-bold border-[1.5px] transition-colors tracking-[0.3px] cursor-pointer ${i === 0 ? 'bg-navy text-white border-navy' : 'bg-white text-stone border-gray-200 hover:border-navy hover:text-navy'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2.5 reveal">
            {listings.map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-[18px] px-5 rounded-[14px] border-[1.5px] border-gray-200 bg-white cursor-pointer hover:border-navy hover:shadow-md hover:translate-x-1 transition-all">
                <div className="w-[52px] h-[52px] rounded-xl bg-cream flex items-center justify-center text-[22px] flex-shrink-0 group-hover:bg-cream-dark">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm font-bold text-navy mb-[3px] truncate">{item.title}</div>
                  <div className="font-body text-xs text-stone">{item.meta}</div>
                </div>
                <span className={`badge ${item.badgeClass} flex-shrink-0`}>{item.badge}</span>
                <span className="text-gray-200 text-base group-hover:text-navy transition-colors">→</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ward Panel */}
        <div className="sticky top-[120px] max-lg:static reveal">
          <div className="bg-cream rounded-[20px] border border-cream-dark p-8 mb-4">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="font-display text-[22px] font-black text-navy tracking-[-0.5px]">Ward 3</div>
                <div className="font-body text-[13px] text-stone mt-[3px]">Chicago, IL · Sample data</div>
              </div>
              <div className="bg-navy text-white font-display text-[10px] font-bold px-3 py-1.5 rounded-full tracking-[1px] whitespace-nowrap">SAMPLE</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[{ n: 'Nov 3', l: 'General Election Day', c: 'var(--cp-red)' }, { n: '50', l: 'Chicago wards covered', c: 'var(--cp-navy)' }, { n: '20K+', l: 'Officials in the directory', c: 'var(--cp-gold-dim)' }, { n: 'Free', l: 'Always, for everyone', c: 'var(--cp-navy)' }].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-cream-dark">
                  <Stat value={s.n} label={s.l} color={s.c} size={26} labelFirst />
                </div>
              ))}
            </div>
            <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-stone mb-3">Your Representatives</div>
            {['Pat Dowell · Ward 3 Alderperson', 'Brandon Johnson · Mayor, City of Chicago', 'Lamont J. Robinson · State Rep · District 5'].map((rep, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-[10px] bg-white mb-2 border border-cream-dark hover:shadow-sm transition-shadow cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-cream-dark flex items-center justify-center text-base flex-shrink-0">👤</div>
                <div><div className="font-display text-[13px] font-bold text-navy">{rep.split('·')[0]}</div><div className="font-body text-[11px] text-stone">{rep.split('·').slice(1).join('·')}</div></div>
              </div>
            ))}
          </div>
          <a href="/signup" className="block bg-navy text-white rounded-xl py-4 px-5 font-display text-sm font-bold text-center tracking-[0.3px] hover:bg-navy-700 transition-colors">📋 Check Voter Registration →</a>
          <div className="bg-navy rounded-[20px] p-7 mt-4">
            <div className="font-display text-lg font-black text-white mb-1.5">Not Ward 3?</div>
            <div className="font-body text-[13px] text-white/45 mb-[18px]">Enter your zip code to see your ward.</div>
            <form onSubmit={handleSearch} className="flex bg-white/[0.08] border-[1.5px] border-white/[0.12] rounded-xl overflow-hidden transition-colors focus-within:border-white/30">
              <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} placeholder="Your zip code…" className="flex-1 bg-transparent border-none outline-none font-body text-sm text-white py-3.5 px-4 placeholder:text-white/55" />
              <button type="submit" disabled={searching} className="bg-red text-white font-display text-[13px] font-bold px-5 tracking-[0.3px] hover:bg-red-hover transition-colors">{searching ? 'Looking up…' : 'Go →'}</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// ELECTION CTA
// ════════════════════════════════════════════════════════════════
function ElectionCTA() {
  return (
    <section className="bg-red py-[100px] px-10 relative overflow-hidden">
      <div className="absolute top-[-60%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/[0.05] pointer-events-none" />
      <div className="absolute bottom-[-40%] left-[-5%] w-[400px] h-[400px] rounded-full bg-black/[0.06] pointer-events-none" />
      <div className="max-w-[1200px] mx-auto relative z-[1] grid grid-cols-2 gap-20 items-center max-lg:grid-cols-1">
        <div>
          <p className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Upcoming Elections</p>
          <h2 className="font-display text-[clamp(36px,4vw,56px)] font-black tracking-[-1.5px] leading-[0.95] text-white mb-5">
            The ballot is {daysToElection()} days away.<br />Do you know what&apos;s on it?
          </h2>
          <p className="font-body text-base text-white/65 leading-relaxed mt-4">
            Most people vote in presidential elections. Very few know who&apos;s running for city council, school board, or local judge — the positions that affect your daily life the most.
          </p>
          <div className="mt-9 flex gap-3.5 flex-wrap">
            <button className="bg-white text-red font-display text-sm font-bold py-3.5 px-7 rounded-[10px] tracking-[0.3px] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
              See My Full Ballot
            </button>
            <button className="bg-transparent text-white border-2 border-white/40 font-display text-sm font-semibold py-[13px] px-6 rounded-[10px] tracking-[0.3px] hover:border-white hover:bg-white/[0.08] transition-all">
              Check Registration Status
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 reveal">
          {[
            { month: 'OCT', day: '29', title: 'Mail Ballot Request Deadline', sub: 'Illinois · Last day to request a vote-by-mail ballot' },
            { month: 'NOV', day: '02', title: 'Early Voting Ends', sub: 'Last day of early voting · Sept 24 – Nov 2' },
            { month: 'NOV', day: '03', title: 'General Election Day', sub: 'Polls open 6 AM – 7 PM · All races' },
          ].map((card, i) => (
            <div key={i} className="bg-white/[0.1] border border-white/[0.15] rounded-2xl p-5 backdrop-blur-[8px] flex items-center gap-4">
              <div className="bg-white/[0.15] rounded-[10px] p-2.5 text-center flex-shrink-0">
                <div className="font-display text-[9px] font-bold text-white/70 tracking-[1.5px] uppercase">{card.month}</div>
                <div className="font-display text-2xl font-black text-white leading-none">{card.day}</div>
              </div>
              <div className="flex-1">
                <div className="font-display text-[15px] font-bold text-white mb-[3px]">{card.title}</div>
                <div className="font-body text-xs text-white/60">{card.sub}</div>
              </div>
              <span className="text-white/40 text-base ml-auto">→</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// TESTIMONIALS
// ════════════════════════════════════════════════════════════════
function Testimonials() {
  const cards = [
    { icon: '🏛️', title: 'Public records only', body: 'Every official, meeting, and deadline on CivicPie comes from official public sources. No rumors, no campaign data, no voter files.' },
    { icon: '⚖️', title: 'Nonpartisan by design', body: 'No endorsements and no targeting. Your government, presented the same way for everyone, whichever way you vote.' },
    { icon: '🔓', title: 'Free, no account needed', body: 'Look up your representatives in seconds. An account only personalizes your dashboard — the data itself is free for everyone.' },
  ];

  return (
    <section className="section-pad pad-x bg-gray-50">
      <div className="container-main">
        <div className="container-narrow text-center reveal">
          <p className="section-eyebrow" style={{ textAlign: 'center' }}>Why CivicPie</p>
          <h2 className="font-display text-[clamp(32px,4vw,52px)] font-black tracking-[-1.5px] leading-none text-navy mb-5 text-center">
            Government finally<br /><em className="text-red not-italic">made local.</em>
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-6 max-w-[1200px] mx-auto mt-16 max-lg:grid-cols-1 reveal">
          {cards.map((card, i) => (
            <div key={i} className="bg-white rounded-[20px] border border-gray-200 p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="text-[26px] mb-4">{card.icon}</div>
              <div className="font-display text-[16px] font-bold text-navy mb-2">{card.title}</div>
              <p className="font-body text-sm text-stone leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// FINAL CTA
// ════════════════════════════════════════════════════════════════
function FinalCTA() {
  const [zip, setZip] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searching) return;
    setSearching(true);
    try {
      await routeAddressSearch(zip);
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="bg-navy section-pad pad-x relative overflow-hidden text-center">
      <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(196,18,48,0.2) 0%, transparent 65%)' }} />
      <div className="relative z-[1] max-w-[760px] mx-auto reveal">
        <p className="font-display text-[10px] font-bold tracking-[4px] uppercase text-gold mb-5">Get a Slice of Gov</p>
        <h2 className="font-display text-[clamp(44px,6vw,72px)] font-black tracking-[-2px] leading-[0.95] text-white mb-6">
          Your city is<br />deciding things<br /><span className="text-red">right now.</span>
        </h2>
        <p className="font-serif text-xl text-white/55 leading-relaxed mb-12">
          Enter your zip code. Find out who represents you, what they&apos;re deciding, and how you can show up.
        </p>
        <div className="max-w-[480px] mx-auto mb-5">
          <SearchPill
            value={zip}
            onChange={setZip}
            onSubmit={() => handleSearch()}
            placeholder="Enter your zip code or city…"
            buttonLabel="Find My Gov →"
            loading={searching}
            loadingLabel="Looking up…"
          />
        </div>
        <p className="font-body text-xs text-white/45">Free forever. No account required to explore.</p>
        <div className="flex items-center justify-center gap-3.5 mt-16 pt-12 border-t border-white/[0.07]">
          <div className="w-10 h-[1.5px] bg-white/20" />
          <span className="font-display text-[11px] font-bold tracking-[3px] uppercase text-white/55">LEARN · ORGANIZE · <em className="text-red not-italic">VOTE</em></span>
          <div className="w-10 h-[1.5px] bg-white/20" />
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// FOOTER
// ════════════════════════════════════════════════════════════════
function Footer() {
  return (
    <footer className="bg-navy pt-20 pb-10 pad-x border-t border-white/[0.06]">
      <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr] gap-16 max-w-[1200px] mx-auto mb-16 max-md:grid-cols-2">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <PieLogo size={26} />
            <div className="font-display text-[22px] font-black text-white tracking-[-0.5px] leading-none">
              Civic<span className="text-red">Pie</span>
            </div>
          </div>
          <div className="font-display text-[9px] font-bold tracking-[2.5px] uppercase text-white/45 mb-3.5">Hyperlocal Civic Engagement</div>
          <p className="font-body text-[13px] text-white/40 leading-relaxed max-w-[300px]">Local info. Real impact. Nonpartisan. Built on public government data, built for the people it affects.</p>
        </div>
        {[
          { title: 'Platform', links: [
            { label: 'Explore', href: '/explore' },
            { label: 'Elections', href: '/elections' },
            { label: 'Officials', href: '/officials' },
            { label: 'Events', href: '/events' },
            { label: 'Services', href: '/services' },
          ] },
          { title: 'Resources', links: [
            { label: 'Voter Registration', href: '/elections' },
            { label: 'Grants & Programs', href: '/resources' },
            { label: 'Volunteer', href: '/resources' },
            { label: 'Transcripts', href: '/meetings' },
            { label: 'API Access', href: '/about' },
          ] },
          { title: 'Organization', links: [
            { label: 'About CivicPie', href: '/about' },
            { label: 'Press', href: '/about' },
            { label: 'Contact', href: '/about' },
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
          ] },
        ].map((col, i) => (
          <div key={i}>
            <div className="font-display text-[10px] font-bold tracking-[2.5px] uppercase text-white/45 mb-5">{col.title}</div>
            {col.links.map(link => (
              <a key={link.label} href={link.href} className="block font-body text-sm text-white/45 mb-3 hover:text-white transition-colors">{link.label}</a>
            ))}
          </div>
        ))}
      </div>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between pt-8 border-t border-white/[0.07]">
        <p className="font-body text-xs text-white/20">© 2026 CivicPie · Nonpartisan · All data sourced from public government records</p>
        <div className="flex gap-[3px] items-center">
          <div className="h-1 rounded-[2px]" style={{ width: 28, background: 'var(--cp-navy-light)' }} />
          <div className="h-1 rounded-[2px]" style={{ width: 18, background: 'var(--cp-red)' }} />
          <div className="h-1 rounded-[2px]" style={{ width: 12, background: 'var(--cp-gold)' }} />
        </div>
      </div>
    </footer>
  );
}
