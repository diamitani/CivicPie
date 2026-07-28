'use client';

import { useState, useEffect } from 'react';
import {
  MapPin, Search, Users, Calendar, Building2, ChevronRight,
  ExternalLink, Phone, Mail, TrendingUp, Star, Heart,
  Globe, Sparkles, ArrowRight, Compass, Layers, Shield,
  Landmark, BookOpen, Megaphone, HandHeart, School, Church,
  ShoppingBag, UtensilsCrossed, Activity
} from 'lucide-react';
import type { WardData, DirectoryData, Official, Agency, DirectoryEntry, CivicGroup } from '@/lib/data';

// ─── Helper: Chicago wards ─────────────────────────────────────────────────
const CHICAGO_WARDS: Record<string, { name: string; neighborhoods: string[] }> = {
  '1': { name: 'West Town / Wicker Park', neighborhoods: ['Wicker Park', 'Ukrainian Village', 'East Village'] },
  '2': { name: 'West Town / Ukrainian Village', neighborhoods: ['Ukrainian Village', 'West Town', 'East Village'] },
  '3': { name: 'Bronzeville / South Loop', neighborhoods: ['Bronzeville', 'South Loop', 'Douglas'] },
  '4': { name: 'Kenwood / Hyde Park', neighborhoods: ['Kenwood', 'Hyde Park', 'Oakland'] },
  '5': { name: 'Hyde Park / South Shore', neighborhoods: ['Hyde Park', 'South Shore', 'Woodlawn'] },
  '48': { name: 'Edgewater & Andersonville', neighborhoods: ['Edgewater', 'Andersonville', 'Lakewood-Balmoral', 'Bryn Mawr Historic District', 'Magnolia Glen'] },
};

const CHICAGO_WARD_OFFICES: Record<string, { address: string; phone: string; website: string; alderman: string }> = {
  '48': { address: '6012 N Broadway, Chicago, IL 60660', phone: '(773) 784-5277', website: 'https://the48thward.org', alderman: 'Leni Manaa-Hoppenworth' },
  '1': { address: '1272 N Milwaukee Ave, Chicago, IL 60622', phone: '(872) 206-2685', website: 'https://the1stward.com', alderman: 'Daniel La Spata' },
  '2': { address: '1447 W Chicago Ave, Chicago, IL 60642', phone: '(312) 643-2299', website: 'https://ward2chicago.com', alderman: 'Brian Hopkins' },
};

// ─── Main Component ────────────────────────────────────────────────────────
export default function HomePage() {
  const [view, setView] = useState<'hero' | 'ward'>('hero');
  const [searchQuery, setSearchQuery] = useState('');
  const [wardNumber, setWardNumber] = useState<string | null>(null);
  const [wardData, setWardData] = useState<WardData | null>(null);
  const [directoryData, setDirectoryData] = useState<DirectoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'officials' | 'agencies' | 'directory' | 'community'>('overview');
  const [directoryCategory, setDirectoryCategory] = useState<string | null>(null);

  // ─── Load data for a ward ─────────────────────────────────────────────
  const loadWardData = async (ward: string) => {
    setLoading(true);
    try {
      const [wd, dd] = await Promise.all([
        fetch('/data/ward_data.json').then(r => r.json()),
        fetch('/data/ward_directory.json').then(r => r.json()),
      ]);
      setWardData(wd);
      setDirectoryData(dd);
      setWardNumber(ward);
      setView('ward');
    } catch (e) {
      console.error('Error loading ward data:', e);
    } finally {
      setLoading(false);
    }
  };

  // ─── Handle search ────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // For v1: detect ward from input (simple matching)
    // In production, this calls geocoding API from civic-ward-hub
    const query = searchQuery.toLowerCase();

    if (query.includes('60660') || query.includes('60640') || query.includes('edgewater') || query.includes('andersonville') || query.includes('48')) {
      loadWardData('48');
    } else if (query.includes('60622') || query.includes('wicker park')) {
      loadWardData('1');
    } else if (query.includes('60615') || query.includes('hyde park')) {
      loadWardData('5');
    } else {
      // Default to 48th Ward demo for v1
      loadWardData('48');
    }
  };

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => loadWardData('48'), // v1: default to 48th Ward demo
        () => loadWardData('48'),
      );
    } else {
      loadWardData('48');
    }
  };

  // ─── Quick ward selector ─────────────────────────────────────────────
  const demoWards = ['1', '2', '5', '48'];

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* ─── NAVBAR ─────────────────────────────────────────────────── */}
      <nav className="border-b border-white/[0.06] bg-[#0a1628]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c9a227] to-[#f59e0b] flex items-center justify-center">
              <Landmark className="w-5 h-5 text-[#0a1628]" />
            </div>
            <span className="font-bold text-xl tracking-tight">
              <span className="text-white">Civic</span>
              <span className="text-[#c9a227]">Pie</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            {view === 'ward' && (
              <>
                <button onClick={() => setView('hero')} className="text-sm text-gray-400 hover:text-white transition-colors">
                  Change location
                </button>
              </>
            )}
            {view === 'hero' && (
              <button className="text-sm text-gray-400 hover:text-white transition-colors">About</button>
            )}
          </div>
        </div>
      </nav>

      {/* ─── HERO VIEW ───────────────────────────────────────────────── */}
      {view === 'hero' && (
        <div className="relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#2563eb]/5 blur-3xl" />
            <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-[#c9a227]/5 blur-3xl" />
          </div>

          <div className="relative max-w-4xl mx-auto px-4 py-24 sm:py-32 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] mb-8">
              <Sparkles className="w-4 h-4 text-[#c9a227]" />
              <span className="text-sm text-gray-300">v1 — Pilot in Chicago</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              What&apos;s happening in<br />
              <span className="gold-text">your neighborhood?</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-xl mx-auto mb-12 leading-relaxed">
              Find your district, connect with local officials, discover events, 
              and explore the businesses and organizations that make your community thrive.
            </p>

            {/* Search box — like Nextdoor */}
            <form onSubmit={handleSearch} className="max-w-lg mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Enter your address, ZIP code, or neighborhood…"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-500 focus:outline-none focus:border-[#c9a227]/40 focus:ring-4 focus:ring-[#c9a227]/10 transition-all text-lg"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#c9a227] hover:bg-[#d4b03a] text-[#0a1628] font-semibold px-5 py-2 rounded-xl transition-colors"
                >
                  Find my district
                </button>
              </div>
            </form>

            {/* Detect location button */}
            <button
              onClick={handleDetectLocation}
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-16"
            >
              <Compass className="w-4 h-4" />
              Use my location
            </button>

            {/* Quick ward selector */}
            <div className="border-t border-white/[0.06] pt-10">
              <p className="text-sm text-gray-500 mb-4">Or explore a Chicago ward:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {demoWards.map(ward => (
                  <button
                    key={ward}
                    onClick={() => loadWardData(ward)}
                    className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-[#c9a227]/30 transition-all text-sm font-medium"
                  >
                    {CHICAGO_WARDS[ward]?.name || `Ward ${ward}`}
                    <span className="block text-xs text-gray-500 mt-0.5">Ward {ward}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── WARD VIEW ────────────────────────────────────────────────── */}
      {view === 'ward' && wardData && (
        <div>
          {/* Ward Hero */}
          <WardHero wardData={wardData} wardNumber={wardNumber!} />

          {/* Tab Navigation */}
          <div className="border-b border-white/[0.06] sticky top-16 bg-[#0a1628] z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
              {(['overview', 'officials', 'agencies', 'directory', 'community'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setDirectoryCategory(null); }}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-[#c9a227] text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {tab === 'overview' && '🏠 Overview'}
                  {tab === 'officials' && `👥 Officials (${wardData.officials.length})`}
                  {tab === 'agencies' && `🏛️ Agencies (${wardData.agencies.length})`}
                  {tab === 'directory' && `📋 Directory (982)`}
                  {tab === 'community' && `🤝 Community (${wardData.civicGroups.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#c9a227] border-t-transparent" />
              </div>
            )}

            {!loading && activeTab === 'overview' && (
              <WardOverview wardData={wardData} directoryData={directoryData!} />
            )}
            {!loading && activeTab === 'officials' && (
              <OfficialsSection officials={wardData.officials} />
            )}
            {!loading && activeTab === 'agencies' && (
              <AgenciesSection agencies={wardData.agencies} />
            )}
            {!loading && activeTab === 'directory' && directoryData && (
              <DirectorySection
                directoryData={directoryData}
                category={directoryCategory}
                onCategoryChange={setDirectoryCategory}
              />
            )}
            {!loading && activeTab === 'community' && (
              <CommunitySection civicGroups={wardData.civicGroups} quickStats={wardData.quickStats} wardBusinesses={wardData.wardBusinesses} />
            )}
          </div>
        </div>
      )}

      {/* ─── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Landmark className="w-4 h-4" />
              <span>CivicPie v1 — Civic engagement starts at home</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">About</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <span>civicpie.com</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function WardHero({ wardData, wardNumber }: { wardData: WardData; wardNumber: string }) {
  const meta = wardData.districtMeta;
  const stats = wardData.quickStats;

  return (
    <div className="relative bg-gradient-to-b from-navy-700/50 to-navy-900 pt-8 pb-12 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#c9a227]/5 via-transparent to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <span>Chicago</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white">{meta.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#3b82f6] flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {meta.name || `Ward ${wardNumber}`}
                </h1>
                <p className="text-gray-400">{meta.city}, {meta.state}</p>
              </div>
            </div>
            <p className="text-lg text-gray-300 max-w-2xl mb-6">{meta.description}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {meta.neighborhoods?.map(n => (
                <span key={n} className="chip">{n}</span>
              ))}
            </div>
            {meta.alderman && (
              <p className="text-sm text-gray-400">
                <Users className="w-4 h-4 inline mr-1" />
                {meta.alderman}
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex-shrink-0">
            <div className="glass p-6 min-w-[240px]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Stats</p>
              <div className="space-y-3">
                {stats?.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{s.label}</span>
                    <span className="text-sm font-semibold text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WardOverview({ wardData, directoryData }: { wardData: WardData; directoryData: DirectoryData }) {
  const { districtMeta, events, legislation, benefits, communityHighlights } = wardData;
  const office = districtMeta.wardOffice;
  const pb = districtMeta.participatoryBudgeting;

  return (
    <div className="space-y-12">
      {/* Events */}
      <section>
        <h2 className="section-title text-white">📅 Upcoming Events</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.slice(0, 3).map(event => (
            <div key={event.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <span className="chip text-xs">{event.category}</span>
                <span className="text-xs text-gray-500">{event.date}</span>
              </div>
              <h3 className="font-semibold text-white mb-2">{event.title}</h3>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">{event.description}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" /> {event.location}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ward Office + PB */}
      <div className="grid sm:grid-cols-2 gap-6">
        {office && (
          <div className="card">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#2563eb]" />
              Ward Office
            </h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>{office.address}</p>
              <p>{office.phone}</p>
              <p>{office.hours}</p>
              <a href={office.website} target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline inline-flex items-center gap-1">
                Visit website <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
        {pb && (
          <div className="card">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#22c55e]" />
              Participatory Budgeting
            </h3>
            <p className="text-sm text-gray-400 mb-2">Total: <span className="text-white font-semibold">{pb.totalBudget}</span></p>
            {pb.winners2026 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">2026 Winners:</p>
                {pb.winners2026.slice(0, 4).map((w, i) => (
                  <p key={i} className="text-sm text-gray-300">• {w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Directory Preview */}
      {directoryData && (
        <section>
          <h2 className="section-title text-white">📋 Neighborhood Directory</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(directoryData).map(([cat, entries]) => (
              <div key={cat} className="card p-4 text-center">
                <div className="text-2xl mb-1">
                  {cat.includes('Dining') ? '🍽️' : cat.includes('Shopping') ? '🛍️' : cat.includes('Education') ? '📚' : cat.includes('Civic') ? '⛪' : cat.includes('Health') ? '🏥' : cat.includes('Arts') ? '🎨' : '🔧'}
                </div>
                <p className="text-sm font-medium text-white">{cat}</p>
                <p className="text-xs text-gray-500">{entries.length} listings</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OfficialsSection({ officials }: { officials: Official[] }) {
  return (
    <section>
      <h2 className="section-title text-white">👥 Your Elected Officials</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {officials.map(official => (
          <div key={official.id} className="card">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#2563eb]/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate">{official.name}</h3>
                <p className="text-sm text-[#93c5fd]">{official.title}</p>
                <p className="text-xs text-gray-500">{official.level} • {official.party || 'Nonpartisan'}</p>
              </div>
            </div>
            {official.keyIssues && official.keyIssues.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {official.keyIssues.slice(0, 3).map(issue => (
                  <span key={issue} className="text-xs px-2 py-1 rounded-md bg-white/[0.04] text-gray-400">{issue}</span>
                ))}
              </div>
            )}
            {official.contact && (
              <div className="space-y-1 text-xs text-gray-500">
                {official.contact.phone && <p>📞 {official.contact.phone}</p>}
                {official.contact.email && <p>✉️ {official.contact.email}</p>}
                {official.contact.website && (
                  <a href={official.contact.website} target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline inline-flex items-center gap-1">
                    Website <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function AgenciesSection({ agencies }: { agencies: Agency[] }) {
  const levels = ['Local', 'City', 'County', 'State', 'Federal'];
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const filtered = levelFilter ? agencies.filter(a => a.level === levelFilter) : agencies;

  return (
    <section>
      <h2 className="section-title text-white">🏛️ Government Agencies & Services</h2>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setLevelFilter(null)}
          className={`chip ${!levelFilter ? '!bg-[#c9a227]/20 !text-[#c9a227] !border-[#c9a227]/30' : ''}`}
        >
          All ({agencies.length})
        </button>
        {levels.map(l => (
          <button
            key={l}
            onClick={() => setLevelFilter(l)}
            className={`chip ${levelFilter === l ? '!bg-[#c9a227]/20 !text-[#c9a227] !border-[#c9a227]/30' : ''}`}
          >
            {l} ({agencies.filter(a => a.level === l).length})
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(agency => (
          <div key={agency.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2563eb]/15 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#3b82f6]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{agency.name}</h3>
                  <p className="text-xs text-gray-500">{agency.type} • {agency.level}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3 line-clamp-2">{agency.description}</p>
            <div className="flex flex-wrap gap-1">
              {agency.services.slice(0, 4).map(s => (
                <span key={s} className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.03] text-gray-500">{s}</span>
              ))}
            </div>
            {agency.phone && <p className="text-xs text-gray-500 mt-3">📞 {agency.phone}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function DirectorySection({
  directoryData,
  category,
  onCategoryChange,
}: {
  directoryData: DirectoryData;
  category: string | null;
  onCategoryChange: (c: string | null) => void;
}) {
  const categories = Object.keys(directoryData);
  const entries = category ? directoryData[category] || [] : [];
  const catIcons: Record<string, string> = {
    'Dining & Nightlife': '🍽️',
    'Shopping & Retail': '🛍️',
    'Education & Youth': '📚',
    'Civic & Spiritual': '⛪',
    'Health & Wellness': '🏥',
    'Arts & Culture': '🎨',
    'Services': '🔧',
  };

  return (
    <section>
      <h2 className="section-title text-white">📋 Neighborhood Directory</h2>
      {!category ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className="card hover:border-[#c9a227]/30 text-left"
            >
              <div className="text-3xl mb-3">{catIcons[cat] || '📍'}</div>
              <h3 className="font-semibold text-white">{cat}</h3>
              <p className="text-sm text-gray-500">{directoryData[cat].length} listings</p>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <button onClick={() => onCategoryChange(null)} className="text-sm text-gray-400 hover:text-white mb-4 inline-flex items-center gap-1">
            ← Back to categories
          </button>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {entries.map((entry: DirectoryEntry) => (
              <div key={entry.id} className="card p-4">
                <h3 className="font-medium text-white text-sm">{entry.name}</h3>
                <p className="text-xs text-gray-400 mt-1">{entry.address || 'Address not listed'}</p>
                {entry.neighborhood && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-500 mt-2 inline-block">{entry.neighborhood}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CommunitySection({ civicGroups, quickStats, wardBusinesses }: { civicGroups: CivicGroup[]; quickStats: any[]; wardBusinesses?: any[] }) {
  return (
    <div className="space-y-12">
      <section>
        <h2 className="section-title text-white">🤝 Civic & Community Groups</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {civicGroups.map(group => (
            <div key={group.id} className="card">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#c9a227]/10 flex items-center justify-center flex-shrink-0">
                  {group.type === 'Political Org' ? <Megaphone className="w-5 h-5 text-[#c9a227]" /> :
                   group.type === 'Neighborhood Org' ? <HandHeart className="w-5 h-5 text-[#c9a227]" /> :
                   group.type === 'Advocacy' ? <Shield className="w-5 h-5 text-[#c9a227]" /> :
                   <Star className="w-5 h-5 text-[#c9a227]" />}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">{group.name}</h3>
                  <p className="text-xs text-gray-500">{group.type} • {group.focus}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-3 line-clamp-2">{group.description}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {group.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.03] text-gray-500">{tag}</span>
                ))}
              </div>
              {group.website && (
                <a href={group.website} target="_blank" rel="noreferrer" className="text-xs text-[#3b82f6] hover:underline inline-flex items-center gap-1">
                  Visit <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Stats */}
      {quickStats && quickStats.length > 0 && (
        <section>
          <h2 className="section-title text-white">📊 Ward at a Glance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickStats.map(stat => (
              <div key={stat.id} className="card p-5 text-center">
                <p className="text-2xl font-bold text-[#c9a227] mb-1">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top Businesses */}
      {wardBusinesses && wardBusinesses.length > 0 && (
        <section>
          <h2 className="section-title text-white">🏪 Featured Local Businesses</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {wardBusinesses.map((biz: any) => (
              <div key={biz.id} className="card p-4">
                <h3 className="font-medium text-white text-sm">{biz.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{biz.type}</p>
                <p className="text-xs text-gray-600 mt-0.5">{biz.address}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
