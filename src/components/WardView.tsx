'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Users, Building2, ChevronRight, ExternalLink, TrendingUp, Star, Heart, Globe, Sparkles, Landmark, Megaphone, HandHeart, Shield } from 'lucide-react';

interface WardData {
  districtMeta: any;
  officials: any[];
  events: any[];
  agencies: any[];
  civicGroups: any[];
  quickStats: any[];
  wardBusinesses: any[];
  legislation: any[];
  benefits: any[];
  communityHighlights: any[];
}

interface DirectoryData {
  [category: string]: any[];
}

export function WardView({ wardId, onBack }: { wardId: string; onBack: () => void }) {
  const [wardData, setWardData] = useState<WardData | null>(null);
  const [directory, setDirectory] = useState<DirectoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'officials' | 'agencies' | 'directory' | 'community'>('overview');
  const [directoryCategory, setDirectoryCategory] = useState<string | null>(null);
  const [geocodeResult, setGeocodeResult] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Static export: load from public/data/ JSON files
      const [wardRes, dirRes] = await Promise.all([
        fetch('/data/ward_data.json'),
        fetch('/data/ward_directory.json'),
      ]);
      if (!wardRes.ok) throw new Error('Failed to load ward data');
      const wardJson = await wardRes.json();
      const dirJson = dirRes.ok ? await dirRes.json() : null;

      setWardData(wardJson);
      setDirectory(dirJson);
      if (wardJson.districtMeta?.name) {
        document.title = `CivicPie — ${wardJson.districtMeta.name}`;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ward data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#c9a227] border-t-transparent" />
          <p className="text-sm text-gray-400">Loading ward {wardId}...</p>
        </div>
      </div>
    );
  }

  if (error || !wardData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-32 text-center">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-white mb-2">Couldn&apos;t load ward data</h2>
        <p className="text-gray-400 mb-6">{error || 'Unknown error'}</p>
        <button onClick={loadData} className="btn-primary">Try again</button>
      </div>
    );
  }

  const meta = wardData.districtMeta;

  return (
    <div>
      {/* Ward Hero */}
      <WardHero meta={meta} wardId={wardId} stats={wardData.quickStats} />

      {/* Tabs */}
      <TabBar activeTab={activeTab} onTabChange={(t) => { setActiveTab(t); setDirectoryCategory(null); }}
        counts={{ officials: wardData.officials?.length || 0, agencies: wardData.agencies?.length || 0, directory: Object.values(directory || {}).reduce((a: number, b: any[]) => a + b.length, 0), community: wardData.civicGroups?.length || 0 }}
      />

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'overview' && <OverviewTab wardData={wardData} directory={directory} />}
        {activeTab === 'officials' && <OfficialsTab officials={wardData.officials} />}
        {activeTab === 'agencies' && <AgenciesTab agencies={wardData.agencies} />}
        {activeTab === 'directory' && directory && (
          <DirectoryTab directory={directory} category={directoryCategory} onCategoryChange={setDirectoryCategory} />
        )}
        {activeTab === 'community' && <CommunityTab wardData={wardData} />}
      </div>
    </div>
  );
}

// ─── Ward Hero ───────────────────────────────────────────────────────────────

function WardHero({ meta, wardId, stats }: { meta: any; wardId: string; stats: any[] }) {
  return (
    <div className="relative bg-gradient-to-b from-[#0f1f3d]/50 to-[#0a1628] pt-8 pb-12 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#c9a227]/5 via-transparent to-transparent" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <span>{meta.city || 'Chicago'}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white">{meta.name || `Ward ${wardId}`}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#3b82f6] flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                  {meta.name || `Ward ${wardId}`}
                </h1>
                <p className="text-gray-400">{meta.city}, {meta.state}</p>
              </div>
            </div>
            <p className="text-lg text-gray-300 max-w-2xl mb-6">{meta.description}</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {meta.neighborhoods?.map((n: string) => (
                <span key={n} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2563eb]/15 text-[#93c5fd] text-xs font-medium border border-[#2563eb]/20">
                  {n}
                </span>
              ))}
            </div>
            {meta.alderman && (
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Users className="w-4 h-4" /> {meta.alderman}
              </p>
            )}
          </div>

          {/* Quick Stats */}
          {stats && stats.length > 0 && (
            <div className="flex-shrink-0">
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 min-w-[240px]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Stats</p>
                <div className="space-y-3">
                  {stats.slice(0, 5).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">{s.label}</span>
                      <span className="text-sm font-semibold text-white">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────

function TabBar({ activeTab, onTabChange, counts }: {
  activeTab: string;
  onTabChange: (tab: any) => void;
  counts: { officials: number; agencies: number; directory: number; community: number };
}) {
  const tabs = [
    { id: 'overview', label: '🏠 Overview' },
    { id: 'officials', label: `👥 Officials (${counts.officials})` },
    { id: 'agencies', label: `🏛️ Agencies (${counts.agencies})` },
    { id: 'directory', label: `📋 Directory (${counts.directory})` },
    { id: 'community', label: `🤝 Community (${counts.community})` },
  ] as const;

  return (
    <div className="border-b border-white/[0.06] sticky top-16 bg-[#0a1628] z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[#c9a227] text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ wardData, directory }: { wardData: WardData; directory: DirectoryData | null }) {
  const { events, districtMeta } = wardData;
  const office = districtMeta?.wardOffice;
  const pb = districtMeta?.participatoryBudgeting;

  return (
    <div className="space-y-12">
      {/* Events */}
      {events && events.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">📅 Upcoming Events</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.slice(0, 3).map((event: any) => (
              <div key={event.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#2563eb]/15 text-[#93c5fd] text-xs font-medium border border-[#2563eb]/20">
                    {event.category}
                  </span>
                  <span className="text-xs text-gray-500">{event.date}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{event.title}</h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{event.description}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" /> {event.location}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ward Office + PB */}
      <div className="grid sm:grid-cols-2 gap-6">
        {office && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#2563eb]" /> Ward Office
            </h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>{office.address}</p>
              <p>{office.phone}</p>
              <p className="text-xs">{office.hours}</p>
              {office.website && (
                <a href={office.website} target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline inline-flex items-center gap-1">
                  Visit website <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
        {pb && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#22c55e]" /> Participatory Budgeting
            </h3>
            <p className="text-sm text-gray-400 mb-3">Total: <span className="text-white font-semibold">{pb.totalBudget}</span></p>
            {pb.winners2026 && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500 mb-2">2026 Winning Projects:</p>
                {pb.winners2026.slice(0, 5).map((w: string, i: number) => (
                  <p key={i} className="text-sm text-gray-300">• {w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Directory preview */}
      {directory && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">📋 Neighborhood Directory</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(directory).map(([cat, entries]) => (
              <div key={cat} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-center hover:bg-white/[0.05] transition-all">
                <div className="text-3xl mb-2">{catIcons[cat] || '📍'}</div>
                <p className="text-sm font-medium text-white">{cat}</p>
                <p className="text-xs text-gray-500 mt-1">{entries.length} listings</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const catIcons: Record<string, string> = {
  'Dining & Nightlife': '🍽️', 'Shopping & Retail': '🛍️', 'Education & Youth': '📚',
  'Civic & Spiritual': '⛪', 'Health & Wellness': '🏥', 'Arts & Culture': '🎨', 'Services': '🔧',
};

// ─── Officials Tab ───────────────────────────────────────────────────────────

function OfficialsTab({ officials }: { officials: any[] }) {
  if (!officials?.length) return <EmptyState message="No officials data available yet." />;

  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-6">👥 Your Elected Officials</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {officials.map((o: any) => (
          <div key={o.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#2563eb]/15 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-[#3b82f6]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white truncate">{o.name}</h3>
                <p className="text-sm text-[#93c5fd]">{o.title}</p>
                <p className="text-xs text-gray-500">{o.level} {o.party ? `• ${o.party}` : ''}</p>
              </div>
            </div>
            {o.keyIssues?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {o.keyIssues.slice(0, 4).map((issue: string) => (
                  <span key={issue} className="text-[11px] px-2 py-1 rounded-md bg-white/[0.04] text-gray-400">{issue}</span>
                ))}
              </div>
            )}
            {o.contact && (
              <div className="space-y-1 text-xs text-gray-500">
                {o.contact.phone && <p>📞 {o.contact.phone}</p>}
                {o.contact.email && <p>✉️ {o.contact.email}</p>}
                {o.contact.website && (
                  <a href={o.contact.website} target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline inline-flex items-center gap-1 mt-1">
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

// ─── Agencies Tab ─────────────────────────────────────────────────────────────

function AgenciesTab({ agencies }: { agencies: any[] }) {
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  if (!agencies?.length) return <EmptyState message="No agencies available yet." />;

  const levels = ['Local', 'City', 'County', 'State', 'Federal'];
  const filtered = levelFilter ? agencies.filter(a => a.level === levelFilter) : agencies;

  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-6">🏛️ Government Agencies & Services</h2>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setLevelFilter(null)}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            !levelFilter ? 'bg-[#c9a227]/15 text-[#c9a227] border-[#c9a227]/25' : 'bg-white/[0.04] text-gray-400 border-white/[0.08] hover:text-white'
          }`}>
          All ({agencies.length})
        </button>
        {levels.map(l => {
          const count = agencies.filter(a => a.level === l).length;
          if (count === 0) return null;
          return (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                levelFilter === l ? 'bg-[#c9a227]/15 text-[#c9a227] border-[#c9a227]/25' : 'bg-white/[0.04] text-gray-400 border-white/[0.08] hover:text-white'
              }`}>
              {l} ({count})
            </button>
          );
        })}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((agency: any) => (
          <div key={agency.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-all">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#2563eb]/15 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-[#3b82f6]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-white text-sm">{agency.name}</h3>
                <p className="text-xs text-gray-500">{agency.type} • {agency.level}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3 line-clamp-2">{agency.description}</p>
            {agency.services?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {agency.services.slice(0, 4).map((s: string) => (
                  <span key={s} className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.03] text-gray-500">{s}</span>
                ))}
              </div>
            )}
            {agency.phone && <p className="text-xs text-gray-500 mt-2">📞 {agency.phone}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Directory Tab ────────────────────────────────────────────────────────────

function DirectoryTab({ directory, category, onCategoryChange }: {
  directory: DirectoryData;
  category: string | null;
  onCategoryChange: (c: string | null) => void;
}) {
  const categories = Object.keys(directory);

  if (!category) {
    return (
      <section>
        <h2 className="text-2xl font-bold text-white mb-6">📋 Neighborhood Directory</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(cat => (
            <button key={cat} onClick={() => onCategoryChange(cat)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-left hover:border-[#c9a227]/30 hover:bg-white/[0.05] transition-all">
              <div className="text-3xl mb-3">{catIcons[cat] || '📍'}</div>
              <h3 className="font-semibold text-white text-sm">{cat}</h3>
              <p className="text-xs text-gray-500 mt-1">{directory[cat].length} listings</p>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const entries = directory[category] || [];
  return (
    <section>
      <button onClick={() => onCategoryChange(null)} className="text-sm text-gray-400 hover:text-white mb-6 inline-flex items-center gap-1 transition-colors">
        ← Back to categories
      </button>
      <h2 className="text-2xl font-bold text-white mb-6">{catIcons[category] || '📍'} {category}</h2>
      <p className="text-sm text-gray-500 mb-4">{entries.length} listings</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map((entry: any) => (
          <div key={entry.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-all">
            <h3 className="font-medium text-white text-sm">{entry.name}</h3>
            <p className="text-xs text-gray-400 mt-1">{entry.address || 'Address not listed'}</p>
            {entry.neighborhood && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-gray-500 mt-2 inline-block">
                {entry.neighborhood}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Community Tab ────────────────────────────────────────────────────────────

function CommunityTab({ wardData }: { wardData: WardData }) {
  const { civicGroups, quickStats, wardBusinesses } = wardData;

  return (
    <div className="space-y-12">
      {civicGroups?.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">🤝 Civic & Community Groups</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {civicGroups.map((group: any) => (
              <div key={group.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#c9a227]/10 flex items-center justify-center flex-shrink-0">
                    {group.type === 'Political Org' ? <Megaphone className="w-5 h-5 text-[#c9a227]" /> :
                     group.type === 'Neighborhood Org' ? <HandHeart className="w-5 h-5 text-[#c9a227]" /> :
                     <Star className="w-5 h-5 text-[#c9a227]" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm">{group.name}</h3>
                    <p className="text-xs text-gray-500">{group.type} • {group.focus}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mb-3 line-clamp-2">{group.description}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {group.tags?.slice(0, 4).map((tag: string) => (
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
      )}

      {quickStats?.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">📊 Ward at a Glance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickStats.map((stat: any) => (
              <div key={stat.id} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 text-center">
                <p className="text-2xl font-bold text-[#c9a227] mb-1">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {wardBusinesses?.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">🏪 Featured Local Businesses</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {wardBusinesses.map((biz: any) => (
              <div key={biz.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-all">
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

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-3xl mb-3">📭</div>
      <p className="text-gray-400">{message}</p>
    </div>
  );
}
