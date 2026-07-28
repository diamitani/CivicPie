'use client';

import { useState } from 'react';
import { Search, Compass, MapPin, Sparkles, Landmark, ChevronRight } from 'lucide-react';
import { WardView } from '@/components/WardView';

const DEMO_WARDS = [
  { id: '1', name: 'West Town / Wicker Park', neighborhoods: 'Wicker Park, Ukrainian Village' },
  { id: '2', name: 'West Town / Ukrainian Village', neighborhoods: 'Ukrainian Village, East Village' },
  { id: '5', name: 'Hyde Park / South Shore', neighborhoods: 'Hyde Park, Woodlawn' },
  { id: '48', name: 'Edgewater & Andersonville', neighborhoods: 'Edgewater, Andersonville, Bryn Mawr' },
];

export default function HomePage() {
  const [view, setView] = useState<'hero' | 'ward'>('hero');
  const [searchQuery, setSearchQuery] = useState('');
  const [wardId, setWardId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setLoading(true);
    setError(null);

    try {
      // First try the geocoding API
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: q }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.ward) {
          setWardId(String(data.ward));
          setView('ward');
          return;
        }
      }

      // Fallback: try to extract a ward number from the query
      const wardMatch = q.match(/(\d+)/);
      if (wardMatch && parseInt(wardMatch[1]) >= 1 && parseInt(wardMatch[1]) <= 50) {
        setWardId(wardMatch[1]);
        setView('ward');
        return;
      }

      // Simple ZIP/neighborhood matching
      const lower = q.toLowerCase();
      if (lower.includes('60660') || lower.includes('60640') || lower.includes('edgewater') || lower.includes('andersonville')) {
        setWardId('48');
      } else if (lower.includes('60622') || lower.includes('wicker')) {
        setWardId('1');
      } else if (lower.includes('60615') || lower.includes('hyde')) {
        setWardId('5');
      } else if (lower.includes('60642') || lower.includes('ukrainian')) {
        setWardId('2');
      } else {
        // Default to 48th Ward demo for v1
        setWardId('48');
      }
      setView('ward');
    } catch (err) {
      // Fallback to 48th Ward
      setWardId('48');
      setView('ward');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch('/api/geocode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                address: `${pos.coords.latitude}, ${pos.coords.longitude}`,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.ward) {
                setWardId(String(data.ward));
                setView('ward');
                return;
              }
            }
          } catch {}
          setWardId('48');
          setView('ward');
        },
        () => { setWardId('48'); setView('ward'); },
        { timeout: 5000 },
      );
    } else {
      setWardId('48');
      setView('ward');
    }
  };

  const selectWard = (id: string) => {
    setWardId(id);
    setView('ward');
  };

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Navbar */}
      <Navbar view={view} onBackToHero={() => setView('hero')} />

      {/* Hero View */}
      {view === 'hero' && (
        <HeroView
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSubmit={handleSearch}
          onDetectLocation={handleDetectLocation}
          onSelectWard={selectWard}
          loading={loading}
          error={error}
        />
      )}

      {/* Ward View */}
      {view === 'ward' && wardId && (
        <WardView wardId={wardId} onBack={() => setView('hero')} />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-[#0a1628]/80 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#c9a227] border-t-transparent" />
            <p className="text-sm text-gray-400">Finding your district...</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

// ─── Navbar ──────────────────────────────────────────────────────────────────

function Navbar({ view, onBackToHero }: { view: string; onBackToHero: () => void }) {
  return (
    <nav className="border-b border-white/[0.06] bg-[#0a1628]/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={onBackToHero} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c9a227] to-[#f59e0b] flex items-center justify-center">
            <Landmark className="w-5 h-5 text-[#0a1628]" />
          </div>
          <span className="font-bold text-xl tracking-tight">
            <span className="text-white">Civic</span>
            <span className="text-[#c9a227]">Pie</span>
          </span>
        </button>
        <div className="flex items-center gap-4">
          {view === 'ward' && (
            <button onClick={onBackToHero} className="text-sm text-gray-400 hover:text-white transition-colors">
              Change location
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Hero View ───────────────────────────────────────────────────────────────

function HeroView({
  searchQuery,
  onSearchChange,
  onSubmit,
  onDetectLocation,
  onSelectWard,
  loading,
  error,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDetectLocation: () => void;
  onSelectWard: (id: string) => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient background */}
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
          <span className="bg-gradient-to-r from-[#c9a227] via-[#d4b03a] to-[#f59e0b] bg-clip-text text-transparent">
            your neighborhood?
          </span>
        </h1>

        <p className="text-lg text-gray-400 max-w-xl mx-auto mb-12 leading-relaxed">
          Find your district, connect with local officials, discover events,
          and explore the businesses and organizations that make your community thrive.
        </p>

        {/* Search */}
        <form onSubmit={onSubmit} className="max-w-lg mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Enter your address, ZIP code, or neighborhood..."
              className="w-full pl-12 pr-28 py-4 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-500 focus:outline-none focus:border-[#c9a227]/40 focus:ring-4 focus:ring-[#c9a227]/10 transition-all text-lg"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#c9a227] hover:bg-[#d4b03a] disabled:opacity-50 text-[#0a1628] font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
            >
              Find my district
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-400 mt-2">{error}</p>
          )}
        </form>

        {/* Detect location */}
        <button
          onClick={onDetectLocation}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-16 disabled:opacity-50"
        >
          <Compass className="w-4 h-4" />
          Use my location
        </button>

        {/* Ward selector */}
        <div className="border-t border-white/[0.06] pt-10">
          <p className="text-sm text-gray-500 mb-4">Or explore a Chicago ward:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {DEMO_WARDS.map(ward => (
              <button
                key={ward.id}
                onClick={() => onSelectWard(ward.id)}
                className="px-6 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-[#c9a227]/30 transition-all text-left"
              >
                <span className="block text-sm font-medium text-white">{ward.name}</span>
                <span className="block text-xs text-gray-500 mt-0.5">Ward {ward.id}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Landmark className="w-4 h-4" />
            <span>CivicPie v1 — Civic engagement starts at home</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>civicpie.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
