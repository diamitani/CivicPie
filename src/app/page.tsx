'use client';

import { useState, useEffect, useRef } from 'react';
import { PieLogo, CivicPieWordmark } from '@/components/Logo';

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
        <a href="#" className="flex items-center gap-3 flex-shrink-0">
          <PieLogo size={26} />
          <div>
            <div className="font-display text-2xl font-black tracking-[-0.5px] text-white leading-none">
              Civic<span className="text-[#C41230]">Pie</span>
            </div>
            <div className="font-display text-[7px] font-bold tracking-[2px] uppercase text-white/30 mt-0.5">
              Hyperlocal Civic Engagement
            </div>
          </div>
        </a>
        <div className="flex items-center gap-8 flex-1 justify-center">
          {['Explore', 'Events', 'Officials', 'Elections', 'Services'].map(link => (
            <a key={link} href="#" className="font-display text-[13px] font-semibold text-white/55 hover:text-white transition-colors tracking-[0.3px]">
              {link}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a href="/signin" className="font-display text-[13px] font-semibold text-white/55 hover:text-white transition-colors">
            Sign In
          </a>
          <a href="/signup" className="font-display text-[13px] font-bold bg-[#C41230] text-white px-5 py-2.5 rounded-lg tracking-[0.3px] hover:bg-[#E8243E] transition-all shadow-[0_2px_8px_rgba(196,18,48,0.35)]">
            Sign Up Free
          </a>
        </div>
      </div>
    </nav>
  );
}

// ════════════════════════════════════════════════════════════════
// HERO
// ════════════════════════════════════════════════════════════════
function Hero() {
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
      <div className="absolute right-0 top-0 bottom-0 w-[6px]" style={{ background: 'linear-gradient(180deg, #E8A030 0%, #C41230 50%, transparent 100%)' }} />

      <div className="relative z-[2] py-[160px] px-10 max-w-[1200px] mx-auto w-full">
        <div className="grid grid-cols-[1fr_420px] gap-20 items-center max-lg:grid-cols-1">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-[18px] py-2 backdrop-blur-[8px] mb-7 animate-fade-up text-white/65 text-xs font-medium">
              <span className="w-[7px] h-[7px] rounded-full bg-[#E8A030] flex-shrink-0 animate-pulse" />
              Nonpartisan · Free · Powered by public data
            </div>
            <h1 className="font-display text-[clamp(52px,6vw,80px)] font-black tracking-[-2.5px] leading-[0.95] text-white mb-7">
              Your city.<br />Your gov.<br />
              <span className="text-[#E8A030]">In one place.</span>
            </h1>
            <p className="font-serif text-xl text-white/55 leading-relaxed mb-10 max-w-[520px]">
              CivicPie connects you with the local services, elected officials, meetings, elections, and opportunities that directly affect your life — sourced entirely from public government data.
            </p>
            {/* Search */}
            <div className="flex items-center bg-white/[0.07] border-[1.5px] border-white/[0.12] rounded-full py-1.5 pl-6 pr-1.5 max-w-[500px] backdrop-blur-[12px] mb-6 transition-all focus-within:border-white/25 focus-within:shadow-[0_0_0_4px_rgba(232,160,48,0.12)]">
              <input type="text" placeholder="Enter your zip code or city…" className="flex-1 bg-transparent border-none outline-none font-body text-[15px] text-white placeholder:text-white/35 min-w-0" />
              <button className="bg-[#C41230] text-white font-display text-[13px] font-bold py-3 px-[22px] rounded-full tracking-[0.3px] hover:bg-[#E8243E] transition-all shadow-[0_4px_12px_rgba(196,18,48,0.4)] flex-shrink-0">
                Find My Gov →
              </button>
            </div>
            <div className="flex items-center gap-6 text-xs text-white/35">
              <span>🔒 Free to use</span><span className="w-1 h-1 rounded-full bg-white/20" />
              <span>📋 Public data only</span><span className="w-1 h-1 rounded-full bg-white/20" />
              <span>🏛️ No political affiliation</span>
            </div>
          </div>

          {/* Right — Ward Card */}
          <div className="relative max-lg:hidden">
            <div className="absolute top-[-16px] right-[-16px] bg-[#C41230] text-white rounded-full py-2 px-4 font-display text-[11px] font-bold tracking-[0.5px] shadow-[0_8px_24px_rgba(196,18,48,0.4)] z-10 flex items-center gap-1.5 animate-float">
              🗳️ Primary: 30 Days Away
            </div>
            <div className="bg-white/[0.04] border border-white/[0.10] rounded-[20px] p-7 backdrop-blur-[16px]">
              <div className="font-display text-[9px] font-bold tracking-[2.5px] uppercase text-[#E8A030] mb-4">★ Ward 3 · Chicago, IL</div>
              <div className="font-display text-[22px] font-black text-white tracking-[-0.5px] mb-1">Your Ward Overview</div>
              <div className="font-body text-[13px] text-white/45 mb-6">Updated 2 minutes ago · 4 new items</div>
              {[
                { icon: '🗳️', bg: 'rgba(196,18,48,0.15)', title: 'Voter Registration Deadline', meta: 'May 14 · 30 days remaining' },
                { icon: '🏛️', bg: 'rgba(0,27,61,0.15)', title: 'City Council Meeting', meta: 'May 14 · 7:00 PM · City Hall' },
                { icon: '🤝', bg: 'rgba(16,185,129,0.12)', title: 'Poll Worker Volunteer', meta: 'May 18 · 12 spots open' },
                { icon: '💰', bg: 'rgba(232,160,48,0.15)', title: 'Small Business Grant', meta: 'Deadline May 31 · Up to $15k' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3 px-3.5 rounded-xl bg-white/[0.04] mb-2.5 cursor-pointer hover:bg-white/[0.08] transition-colors">
                  <div className="w-9 h-9 rounded-[9px] flex-shrink-0 flex items-center justify-center text-base" style={{ background: item.bg }}>{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-[13px] font-bold text-white truncate">{item.title}</div>
                    <div className="font-body text-[11px] text-white/40">{item.meta}</div>
                  </div>
                  <span className="text-white/25 text-sm">→</span>
                </div>
              ))}
              <div className="mt-[18px] pt-[18px] border-t border-white/[0.07] flex gap-2.5">
                <a href="/signup" className="flex-1 text-center bg-[#C41230] text-white font-display text-[13px] font-bold py-3 rounded-[10px] hover:bg-[#E8243E] transition-all shadow-[0_4px_12px_rgba(196,18,48,0.35)]">
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
      <div className="relative z-[2] px-10 pb-10 max-w-[1200px] mx-auto w-full mt-12 pt-12 border-t border-white/[0.07]">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-[1.5px] bg-white/20" />
          <span className="font-display text-[10px] font-bold tracking-[3px] uppercase text-white/30">HYPERLOCAL <em className="text-[#C41230] not-italic">CIVIC</em> ENGAGEMENT</span>
          <div className="w-9 h-[1.5px] bg-white/20" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-fade-up { animation: fadeInUp 0.6s cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════
// STATS RIBBON
// ════════════════════════════════════════════════════════════════
function StatsRibbon() {
  return (
    <div className="bg-white/[0.04] border-t border-b border-white/[0.07] py-7 px-10">
      <div className="grid grid-cols-4 gap-px bg-white/[0.07] rounded overflow-hidden max-w-[1200px] mx-auto max-md:grid-cols-2">
        {[
          { num: '30', label: 'Days to Primary Election', color: '#C41230' },
          { num: '50k+', label: 'Government Pages Indexed', color: '#FFFFFF' },
          { num: '$12M', label: 'In Available Community Grants', color: '#E8A030' },
          { num: '100%', label: 'Free · Nonpartisan · Public', color: '#FFFFFF' },
        ].map((stat, i) => (
          <div key={i} className="py-5 px-7 bg-[rgba(0,27,61,0.01)] text-center">
            <div className="font-display text-[32px] font-black tracking-[-1px] leading-none mb-1" style={{ color: stat.color }}>
              {stat.num}
            </div>
            <div className="font-body text-xs text-white/35 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// TRUST BAR
// ════════════════════════════════════════════════════════════════
function TrustBar() {
  return (
    <div className="bg-cream border-y border-[#EDE0C4] py-5 px-10">
      <div className="flex items-center justify-center gap-12 flex-wrap max-w-[1200px] mx-auto">
        {['City of Chicago', 'Cook County', 'Illinois Board of Elections', 'City Clerk', 'Data.gov', 'OpenGov Portal'].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <div className="w-px h-6 bg-[#EDE0C4]" />}
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
      desc: 'Track upcoming meetings, set reminders for registration deadlines, and find volunteer opportunities near you. Civic participation made calendar-simple.',
      examples: ['Save and track upcoming events', 'Sign up to volunteer as a poll worker', 'Apply for community programs and grants'],
    },
    {
      num: '03', verb: 'Vote.', dot: true, color: '#C41230',
      desc: 'Check your registration status. Find your polling place. Know exactly who\'s on your ballot and what they stand for. From local judges to school boards to Congress.',
      examples: ['Am I registered? Is my address current?', "Who's on my ballot this November?", 'Where is my polling place?'],
    },
  ];

  return (
    <section className="py-[120px] px-10 bg-white">
      <div className="container-main">
        <div className="container-narrow reveal">
          <p className="section-eyebrow">How It Works</p>
          <h2 className="section-heading">Three words.<br />One platform.</h2>
          <p className="section-body">Everything CivicPie does maps to three verbs — the stages of civic life. Where you start doesn&apos;t matter. Showing up does.</p>
        </div>
        <div className="grid grid-cols-3 gap-[2px] mt-[72px] bg-[#E8E8E6] rounded-[20px] overflow-hidden shadow-sm reveal max-lg:grid-cols-1">
          {steps.map((step, i) => (
            <div key={i} className="bg-white p-12 relative group hover:bg-[#FAFAF8] transition-colors">
              <div className="font-display text-[72px] font-black tracking-[-3px] leading-none text-[#F4F4F2] mb-3 group-hover:text-[rgba(196,18,48,0.08)] transition-colors">{step.num}</div>
              <div className="font-display text-[28px] font-black tracking-[-0.5px] text-navy mb-1.5" style={{ color: step.color === '#C41230' ? step.color : undefined }}>
                {step.verb.split('.')[0]}<span className="text-[#C41230]">.</span>
              </div>
              <p className="font-body text-[15px] text-stone leading-relaxed mb-7">{step.desc}</p>
              <div className="flex flex-col gap-2">
                {step.examples.map((ex, j) => (
                  <div key={j} className="flex items-center gap-2 font-body text-[13px] text-stone">
                    <div className="w-[5px] h-[5px] rounded-full bg-[#E8A030] flex-shrink-0" /> {ex}
                  </div>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-transparent group-hover:bg-[#C41230] transition-colors" />
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
      <div className="absolute left-[-20px] top-[-40px] font-serif text-[400px] font-bold text-[#EDE0C4] leading-none pointer-events-none select-none">&quot;</div>
      <div className="max-w-[900px] mx-auto relative z-[1] reveal">
        <p className="font-serif text-[clamp(28px,4vw,48px)] leading-[1.3] text-navy italic mb-8">
          &quot;As American as knowing <em className="text-[#C41230] italic">who&apos;s on the ballot.</em> Government belongs to the people who show up. CivicPie makes showing up easier.&quot;
        </p>
        <div className="flex items-center gap-4 font-display text-xs font-bold tracking-[2px] uppercase text-stone">
          <div className="w-8 h-0.5 bg-[#C41230]" />
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
    { icon: '🗳️', title: 'Elections & Voting', body: 'Voter registration status, your complete ballot, candidate platforms, and real-time election results — sourced directly from your state\'s election board.', tag: 'Always current' },
    { icon: '👤', title: 'Your Representatives', body: 'Every elected official from city council to Congress, with voting records, contact info, committee assignments, and upcoming public events.', tag: 'Ward-level' },
    { icon: '🏛️', title: 'City Council & Meetings', body: 'Live agendas, full transcripts, attendance records, and vote results for every public government meeting — searchable by topic or date.', tag: 'Searchable transcripts' },
    { icon: '🤝', title: 'Volunteer Opportunities', body: 'Civic volunteer openings near you — poll workers, community boards, advisory committees, and local nonprofits seeking help.', tag: 'Apply in-app' },
    { icon: '💰', title: 'Grants & Programs', body: 'Government grants, small business programs, rental assistance, healthcare resources, and community services your household qualifies for.', tag: 'Eligibility matched' },
    { icon: '🔔', title: 'Civic Alerts', body: 'Real-time notifications about zoning changes, permit filings, government decisions, and civic events that affect your specific address.', tag: 'Address-level alerts' },
  ];

  return (
    <section className="bg-navy py-[120px] px-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 bottom-0 w-1/2 pointer-events-none" style={{ background: 'radial-gradient(ellipse at right, rgba(196,18,48,0.12) 0%, transparent 60%)' }} />
      <div className="grid grid-cols-[380px_1fr] gap-24 items-start max-w-[1200px] mx-auto max-lg:grid-cols-1 max-lg:gap-12">
        <div className="sticky top-[120px] reveal max-lg:static">
          <p className="section-eyebrow" style={{ color: '#E8A030' }}>The Platform</p>
          <h2 className="font-display text-[clamp(32px,4vw,52px)] font-black tracking-[-1.5px] leading-none text-white mb-5">
            Every slice of your government,<br /><em className="text-[#C41230] not-italic">in one place.</em>
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
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-[#C41230] transition-colors" />
              <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-[22px] mb-5 group-hover:bg-[rgba(196,18,48,0.15)] transition-colors">{f.icon}</div>
              <div className="font-display text-[17px] font-bold text-white mb-2.5 tracking-[-0.2px]">{f.title}</div>
              <p className="font-body text-[13.5px] text-white/45 leading-relaxed">{f.body}</p>
              <span className="inline-flex items-center mt-4 px-2.5 py-1 rounded-full font-body text-[11px] font-semibold bg-[rgba(232,160,48,0.1)] text-[#E8A030] tracking-[0.5px]">{f.tag}</span>
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
  const listings = [
    { icon: '🏛️', title: 'Ward 3 City Council — Regular Meeting', meta: 'Tue May 14 · 7:00 PM · City Hall Room 201', badge: 'Meeting', badgeClass: 'badge-navy' },
    { icon: '🗳️', title: 'Primary Election — Voter Registration Deadline', meta: 'May 14 · 30 days remaining', badge: 'Election', badgeClass: 'badge-red' },
    { icon: '📋', title: 'Zoning Variance Hearing — 1423 W. Maple', meta: 'Fri May 17 · 10:00 AM · Public comment period open', badge: 'Meeting', badgeClass: 'badge-navy' },
    { icon: '🤝', title: 'Poll Worker Training — Primary Election', meta: 'Sat May 18 · 10:00 AM · Lincoln Library · 12 spots open', badge: 'Volunteer', badgeClass: 'badge-green' },
    { icon: '💰', title: 'Small Business Grant — Round 3 Applications', meta: 'Deadline May 31 · Up to $15,000', badge: 'Grant', badgeClass: 'badge-gold' },
    { icon: '🏘️', title: 'Community Development Block Grant — Housing', meta: 'Ongoing · Rental assistance for qualifying households', badge: 'Service', badgeClass: 'badge-cream' },
  ];

  return (
    <section className="py-[120px] px-10 bg-white">
      <div className="grid grid-cols-[1fr_480px] gap-20 items-start max-w-[1200px] mx-auto max-lg:grid-cols-1">
        <div>
          <div className="mb-10 reveal">
            <p className="section-eyebrow">What&apos;s Happening Now</p>
            <h2 className="section-heading">Ward 3 · Chicago<br /><em>This month.</em></h2>
            <p className="text-base text-stone mt-3">Live data from official Chicago city sources. Updated every 15 minutes.</p>
          </div>
          <div className="flex gap-2 mb-6 flex-wrap reveal">
            {['All', 'Meetings', 'Elections', 'Volunteer', 'Grants', 'Services'].map((tab, i) => (
              <button key={tab} className={`px-4 py-2 rounded-full font-display text-xs font-bold border-[1.5px] transition-colors tracking-[0.3px] cursor-pointer ${i === 0 ? 'bg-navy text-white border-navy' : 'bg-white text-stone border-[#E8E8E6] hover:border-navy hover:text-navy'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2.5 reveal">
            {listings.map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-[18px] px-5 rounded-[14px] border-[1.5px] border-[#E8E8E6] bg-white cursor-pointer hover:border-navy hover:shadow-md hover:translate-x-1 transition-all">
                <div className="w-[52px] h-[52px] rounded-xl bg-cream flex items-center justify-center text-[22px] flex-shrink-0 group-hover:bg-[#EDE0C4]">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm font-bold text-navy mb-[3px] truncate">{item.title}</div>
                  <div className="font-body text-xs text-stone">{item.meta}</div>
                </div>
                <span className={`badge ${item.badgeClass} flex-shrink-0`}>{item.badge}</span>
                <span className="text-[#E8E8E6] text-base group-hover:text-navy transition-colors">→</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ward Panel */}
        <div className="sticky top-[120px] max-lg:static reveal">
          <div className="bg-cream rounded-[20px] border border-[#EDE0C4] p-8 mb-4">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="font-display text-[22px] font-black text-navy tracking-[-0.5px]">Ward 3</div>
                <div className="font-body text-[13px] text-stone mt-[3px]">Chicago, IL · 60614</div>
              </div>
              <div className="bg-navy text-white font-display text-[10px] font-bold px-3 py-1.5 rounded-full tracking-[1px] whitespace-nowrap">YOUR WARD</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[{ n: '30', l: 'Days to primary', c: '#C41230' }, { n: '3', l: 'Upcoming meetings', c: '#001B3D' }, { n: '$2.4M', l: 'Available grants', c: '#B87818' }, { n: '18', l: 'Volunteer spots', c: '#001B3D' }].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-4 border border-[#EDE0C4]">
                  <div className="font-display text-[26px] font-black tracking-[-1px] leading-none mb-[3px]" style={{ color: s.c }}>{s.n}</div>
                  <div className="font-body text-[11px] text-stone">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="font-display text-[11px] font-bold tracking-[2px] uppercase text-stone mb-3">Your Representatives</div>
            {['Maria Rodriguez · Ward 3 Alderperson', 'Angela Davis · Mayor, City of Chicago', 'James Chen · State Rep · District 14'].map((rep, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-[10px] bg-white mb-2 border border-[#EDE0C4] hover:shadow-sm transition-shadow cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-[#EDE0C4] flex items-center justify-center text-base flex-shrink-0">👤</div>
                <div><div className="font-display text-[13px] font-bold text-navy">{rep.split('·')[0]}</div><div className="font-body text-[11px] text-stone">{rep.split('·').slice(1).join('·')}</div></div>
              </div>
            ))}
          </div>
          <a href="/signup" className="block bg-navy text-white rounded-xl py-4 px-5 font-display text-sm font-bold text-center tracking-[0.3px] hover:bg-[#1C3A5E] transition-colors">📋 Check Voter Registration →</a>
          <div className="bg-navy rounded-[20px] p-7 mt-4">
            <div className="font-display text-lg font-black text-white mb-1.5">Not Ward 3?</div>
            <div className="font-body text-[13px] text-white/45 mb-[18px]">Enter your zip code to see your ward.</div>
            <div className="flex bg-white/[0.08] border-[1.5px] border-white/[0.12] rounded-xl overflow-hidden transition-colors focus-within:border-white/30">
              <input type="text" placeholder="Your zip code…" className="flex-1 bg-transparent border-none outline-none font-body text-sm text-white py-3.5 px-4 placeholder:text-white/30" />
              <button className="bg-[#C41230] text-white font-display text-[13px] font-bold px-5 tracking-[0.3px] hover:bg-[#E8243E] transition-colors">Go →</button>
            </div>
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
    <section className="bg-[#C41230] py-[100px] px-10 relative overflow-hidden">
      <div className="absolute top-[-60%] right-[-10%] w-[600px] h-[600px] rounded-full bg-white/[0.05] pointer-events-none" />
      <div className="absolute bottom-[-40%] left-[-5%] w-[400px] h-[400px] rounded-full bg-black/[0.06] pointer-events-none" />
      <div className="max-w-[1200px] mx-auto relative z-[1] grid grid-cols-2 gap-20 items-center max-lg:grid-cols-1">
        <div>
          <p className="section-eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>Upcoming Elections</p>
          <h2 className="font-display text-[clamp(36px,4vw,56px)] font-black tracking-[-1.5px] leading-[0.95] text-white mb-5">
            The ballot is 30 days away.<br />Do you know what&apos;s on it?
          </h2>
          <p className="font-body text-base text-white/65 leading-relaxed mt-4">
            Most people vote in presidential elections. Very few know who&apos;s running for city council, school board, or local judge — the positions that affect your daily life the most.
          </p>
          <div className="mt-9 flex gap-3.5 flex-wrap">
            <button className="bg-white text-[#C41230] font-display text-sm font-bold py-3.5 px-7 rounded-[10px] tracking-[0.3px] hover:-translate-y-[1px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
              See My Full Ballot
            </button>
            <button className="bg-transparent text-white border-2 border-white/40 font-display text-sm font-semibold py-[13px] px-6 rounded-[10px] tracking-[0.3px] hover:border-white hover:bg-white/[0.08] transition-all">
              Check Registration Status
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3 reveal">
          {[
            { month: 'MAY', day: '14', title: 'Voter Registration Deadline', sub: 'Primary Election · Ward 3, Chicago' },
            { month: 'JUN', day: '18', title: 'Primary Election Day', sub: 'City Council · State Reps · Local Judges' },
            { month: 'NOV', day: '04', title: 'General Election Day', sub: 'All local, state, and federal races' },
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
    { stars: '★★★★★', quote: '"I\'ve lived in Ward 3 for 11 years and never knew who my alderperson was. CivicPie showed me in 30 seconds — and sent me a reminder about the zoning change on my block."', name: 'Danielle M.', role: 'Homeowner, Ward 3', badge: 'Chicago, IL', avatar: '👩' },
    { stars: '★★★★★', quote: '"Found a $15k small business grant I didn\'t know existed. Applied through CivicPie. Got funded. This is the most useful civic tool I\'ve ever seen."', name: 'Marcus T.', role: 'Small Business Owner', badge: 'Ward 3', avatar: '👨' },
    { stars: '★★★★★', quote: '"I use this with my political science students. It\'s the only tool that shows them government at the street level — not just Congress. Genuinely changes how they see participation."', name: 'Prof. Sarah K.', role: 'Loyola University', badge: 'Educator', avatar: '👩‍🏫' },
  ];

  return (
    <section className="py-[120px] px-10 bg-[#FAFAF8]">
      <div className="container-main">
        <div className="container-narrow text-center reveal">
          <p className="section-eyebrow" style={{ textAlign: 'center' }}>From Real Constituents</p>
          <h2 className="font-display text-[clamp(32px,4vw,52px)] font-black tracking-[-1.5px] leading-none text-navy mb-5 text-center">
            Government finally<br /><em className="text-[#C41230] not-italic">made local.</em>
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-6 max-w-[1200px] mx-auto mt-16 max-lg:grid-cols-1 reveal">
          {cards.map((card, i) => (
            <div key={i} className="bg-white rounded-[20px] border border-[#E8E8E6] p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="text-[#E8A030] text-base mb-4 tracking-[2px]">{card.stars}</div>
              <p className="font-serif text-base text-navy leading-relaxed mb-6 italic">{card.quote}</p>
              <div className="flex items-center gap-3">
                <div className="w-[42px] h-[42px] rounded-full bg-cream flex items-center justify-center text-lg flex-shrink-0">{card.avatar}</div>
                <div>
                  <div className="font-display text-[13px] font-bold text-navy">{card.name}</div>
                  <div className="font-body text-xs text-stone">{card.role}</div>
                </div>
                <span className="ml-auto px-2.5 py-1 rounded-full bg-cream font-display text-[10px] font-bold text-navy whitespace-nowrap">{card.badge}</span>
              </div>
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
  return (
    <section className="bg-navy py-[140px] px-10 relative overflow-hidden text-center">
      <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(196,18,48,0.2) 0%, transparent 65%)' }} />
      <div className="relative z-[1] max-w-[760px] mx-auto reveal">
        <p className="font-display text-[10px] font-bold tracking-[4px] uppercase text-[#E8A030] mb-5">Get a Slice of Gov</p>
        <h2 className="font-display text-[clamp(44px,6vw,72px)] font-black tracking-[-2px] leading-[0.95] text-white mb-6">
          Your city is<br />deciding things<br /><span className="text-[#C41230]">right now.</span>
        </h2>
        <p className="font-serif text-xl text-white/55 leading-relaxed mb-12">
          Enter your zip code. Find out who represents you, what they&apos;re deciding, and how you can show up.
        </p>
        <div className="flex max-w-[480px] mx-auto mb-5 bg-white/[0.07] border-[1.5px] border-white/[0.14] rounded-full py-1.5 pl-6 pr-1.5 backdrop-blur-[12px] transition-all focus-within:border-white/[0.28] focus-within:shadow-[0_0_0_4px_rgba(232,160,48,0.12)]">
          <input type="text" placeholder="Enter your zip code or city…" className="flex-1 bg-transparent border-none outline-none font-body text-[15px] text-white placeholder:text-white/35" />
          <button className="bg-[#C41230] text-white font-display text-[13px] font-bold py-3 px-[22px] rounded-full hover:bg-[#E8243E] transition-colors whitespace-nowrap shadow-[0_4px_12px_rgba(196,18,48,0.4)]">
            Find My Gov →
          </button>
        </div>
        <p className="font-body text-xs text-white/25">Free forever. No account required to explore.</p>
        <div className="flex items-center justify-center gap-3.5 mt-16 pt-12 border-t border-white/[0.07]">
          <div className="w-10 h-[1.5px] bg-white/20" />
          <span className="font-display text-[11px] font-bold tracking-[3px] uppercase text-white/30">LEARN · ORGANIZE · <em className="text-[#C41230] not-italic">VOTE</em></span>
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
    <footer className="bg-navy pt-20 pb-10 px-10 border-t border-white/[0.06]">
      <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr] gap-16 max-w-[1200px] mx-auto mb-16 max-md:grid-cols-2">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <PieLogo size={26} />
            <div className="font-display text-[22px] font-black text-white tracking-[-0.5px] leading-none">
              Civic<span className="text-[#C41230]">Pie</span>
            </div>
          </div>
          <div className="font-display text-[9px] font-bold tracking-[2.5px] uppercase text-white/25 mb-3.5">Hyperlocal Civic Engagement</div>
          <p className="font-body text-[13px] text-white/40 leading-relaxed max-w-[300px]">Local info. Real impact. Nonpartisan. Built on public government data, built for the people it affects.</p>
        </div>
        {[
          { title: 'Platform', links: ['Explore', 'Elections', 'Officials', 'Events', 'Services'] },
          { title: 'Resources', links: ['Voter Registration', 'Grants & Programs', 'Volunteer', 'Transcripts', 'API Access'] },
          { title: 'Organization', links: ['About CivicPie', 'Press', 'Contact', 'Privacy Policy', 'Terms of Service'] },
        ].map((col, i) => (
          <div key={i}>
            <div className="font-display text-[10px] font-bold tracking-[2.5px] uppercase text-white/25 mb-5">{col.title}</div>
            {col.links.map(link => (
              <a key={link} href="#" className="block font-body text-sm text-white/45 mb-3 hover:text-white transition-colors">{link}</a>
            ))}
          </div>
        ))}
      </div>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between pt-8 border-t border-white/[0.07]">
        <p className="font-body text-xs text-white/20">© 2025 CivicPie · Nonpartisan · All data sourced from public government records</p>
        <div className="flex gap-[3px] items-center">
          <div className="h-1 rounded-[2px]" style={{ width: 28, background: '#1C3A5E' }} />
          <div className="h-1 rounded-[2px]" style={{ width: 18, background: '#C41230' }} />
          <div className="h-1 rounded-[2px]" style={{ width: 12, background: '#E8A030' }} />
        </div>
      </div>
    </footer>
  );
}
