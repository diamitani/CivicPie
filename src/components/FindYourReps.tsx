'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Users, Phone, Mail, Globe, ExternalLink, X, Sparkles, Building2 } from 'lucide-react';

// ─── Rep data indexed from static JSON ───────────────────────────────────────

interface RepResult {
  id: string;
  name: string;
  title: string;
  level: string;
  party?: string;
  district: string;
  photo?: string;
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    office?: string;
  };
  keyIssues?: string[];
  achievements?: string[];
  bio?: string;
}

interface SearchResult {
  district: { name: string; type: string; description: string };
  reps: RepResult[];
  source: string;
}

// ─── Search function ─────────────────────────────────────────────────────────
// Single source of truth: the live /api/lookup endpoint (seed data today,
// Supabase tomorrow). No more hardcoded static JSON indexes.

function toRep(o: any, fallbackDistrict: string): RepResult {
  const contact: RepResult['contact'] = {};
  for (const c of o.contacts || []) {
    if (c.type === 'email' && !contact.email) contact.email = c.value;
    else if (c.type === 'phone' && !contact.phone) contact.phone = c.value;
    else if ((c.type === 'website' || c.type === 'url') && !contact.website) contact.website = c.value;
  }
  if (o.email && !contact.email) contact.email = o.email;
  if (o.phone && !contact.phone) contact.phone = o.phone;
  if (o.website && !contact.website) contact.website = o.website;
  return {
    id: o.id || `${o.name || 'rep'}`,
    name: o.name || 'Unknown',
    title: o.office_title || o.office || o.title || 'Representative',
    level: o.level || '',
    party: o.party,
    district: fallbackDistrict,
    photo: o.photo_url || undefined,
    contact,
    bio: o.bio,
  };
}

async function lookupReps(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (!q || q.length < 2) return [];

  let body: any = null;
  try {
    const res = await fetch(`/api/lookup?address=${encodeURIComponent(q)}`);
    body = await res.json().catch(() => null);
  } catch {
    return [];
  }
  if (!body || body.error) return [];

  const results: SearchResult[] = [];

  if (body.coverage === 'local') {
    const m = (body.district_id || '').match(/^il-chicago-ward-(\d+)$/);
    const districtName = m ? `Ward ${parseInt(m[1], 10)}, Chicago` : (body.ward || body.district_id || 'Your district');
    const officials = body.officials || [];
    if (officials.length > 0) {
      results.push({
        district: { name: districtName, type: m ? 'Ward' : 'District', description: body.address || q },
        reps: officials.map((o: any) => toRep(o, districtName)),
        source: 'CivicPie · public records',
      });
    }
  } else if (body.coverage === 'none') {
    // Out-of-coverage areas still get federal + state representatives.
    const reps = [...(body.federal_officials || []), ...(body.state_officials || [])]
      .map((o: any) => toRep(o, body.address || q));
    if (reps.length > 0) {
      results.push({
        district: {
          name: body.address || 'Your area',
          type: 'Federal + State',
          description: body.message || 'Your federal and state representatives.',
        },
        reps,
        source: 'CivicPie · public records',
      });
    }
  }

  return results;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function FindYourReps() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [selectedRep, setSelectedRep] = useState<RepResult | null>(null);
  const [initial, setInitial] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || q.length < 2) return;
    setLoading(true);
    setInitial(false);
    setSelected(null);
    setSelectedRep(null);
    const res = await lookupReps(q);
    setResults(res);
    setLoading(false);
  };

  const quickLookups = ['60660', 'Illinois', 'California', 'New York', 'Texas'];

  return (
    <div className="w-full">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
        <div className="flex items-center bg-white rounded-2xl shadow-lg border-2 border-transparent focus-within:border-[#C41230]/30 focus-within:shadow-[0_0_0_4px_rgba(196,18,48,0.10)] transition-all overflow-hidden">
          <div className="flex-1 flex items-center gap-3 pl-5 py-4">
            <Search className="w-5 h-5 text-[#9BA3AF] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter your address, ZIP, or state to find your reps…"
              className="flex-1 bg-transparent border-none outline-none font-body text-[15px] text-[#001B3D] placeholder:text-[#9BA3AF] min-w-0"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setResults([]); setInitial(true); setSelected(null); setSelectedRep(null); }}
                className="p-1 rounded-full hover:bg-[#F4F4F2]"><X className="w-4 h-4 text-[#9BA3AF]" /></button>
            )}
          </div>
          <button type="submit" disabled={loading}
            className="bg-[#C41230] text-white font-display font-bold text-sm px-6 py-4 hover:bg-[#E8243E] transition-colors disabled:opacity-60 flex-shrink-0">
            {loading ? 'Searching…' : 'Find My Reps →'}
          </button>
        </div>

        {/* Quick lookups */}
        {initial && (
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="text-[11px] text-[#9BA3AF] font-body">Try:</span>
            {quickLookups.map(q => (
              <button key={q} onClick={() => { setQuery(q); setTimeout(() => handleSearch(new Event('submit') as any), 50); }}
                className="px-3 py-1.5 rounded-full bg-[#F4F4F2] text-[#001B3D] font-body text-xs font-medium hover:bg-[#E8E8E6] transition-colors border border-[#E8E8E6]">
                {q}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C41230] border-t-transparent" />
        </div>
      )}

      {/* No results */}
      {!loading && !initial && results.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <p className="font-display font-bold text-[#001B3D] mb-1">No representatives found</p>
          <p className="text-sm text-[#6B7280]">Try a different ZIP code, city, or state name.</p>
        </div>
      )}

      {/* Results list or detail view */}
      {!loading && results.length > 0 && (
        selectedRep ? (
          <RepDetail rep={selectedRep} onBack={() => setSelectedRep(null)} />
        ) : selected ? (
          <DistrictDetail result={selected} onSelectRep={setSelectedRep} onBack={() => setSelected(null)} />
        ) : (
          <div className="mt-8 space-y-4 max-w-3xl mx-auto">
            <p className="font-display text-[10px] font-bold tracking-[3px] uppercase text-[#6B7280] text-center mb-6">
              {results.length} {results.length === 1 ? 'result' : 'results'} found
            </p>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => setSelected(r)}
                className="w-full text-left bg-white rounded-2xl border border-[#E8E8E6] p-6 hover:border-[#C41230]/30 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#001B3D]/5 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-[#001B3D]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-display font-bold text-lg text-[#001B3D]">{r.district.name}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-[#F5EDD8] text-[#B87818] font-display text-[10px] font-bold uppercase tracking-wider">{r.district.type}</span>
                      </div>
                      <p className="text-sm text-[#6B7280]">{r.district.description}</p>
                      <p className="text-xs text-[#9BA3AF] mt-2">{r.reps.length} representative{r.reps.length !== 1 ? 's' : ''} · {r.source}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[#C41230] font-display text-sm font-bold group-hover:gap-2 transition-all flex-shrink-0">
                    View all <span>→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── District detail ─────────────────────────────────────────────────────────

function DistrictDetail({ result, onSelectRep, onBack }: {
  result: SearchResult;
  onSelectRep: (rep: RepResult) => void;
  onBack: () => void;
}) {
  const levels = ['City', 'County', 'State', 'Federal'];
  const grouped: Record<string, RepResult[]> = {};
  for (const r of result.reps) {
    const l = r.level || 'Other';
    if (!grouped[l]) grouped[l] = [];
    grouped[l].push(r);
  }

  return (
    <div className="mt-8 max-w-3xl mx-auto">
      <button onClick={onBack} className="text-sm text-[#6B7280] hover:text-[#001B3D] mb-6 inline-flex items-center gap-1 font-body transition-colors">
        ← Back to results
      </button>

      {/* District header */}
      <div className="bg-white rounded-2xl border border-[#E8E8E6] p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display font-black text-2xl text-[#001B3D]">{result.district.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#F5EDD8] text-[#B87818] font-display text-[10px] font-bold uppercase tracking-wider">{result.district.type}</span>
            </div>
            <p className="text-sm text-[#6B7280]">{result.district.description}</p>
            <p className="text-xs text-[#9BA3AF] mt-2">Data source: {result.source}</p>
          </div>
          <div className="w-14 h-14 rounded-xl bg-[#F5EDD8] flex items-center justify-center flex-shrink-0">
            <MapPin className="w-7 h-7 text-[#C41230]" />
          </div>
        </div>
      </div>

      {/* Officials grid */}
      {levels.map(level => {
        const offs = grouped[level];
        if (!offs?.length) return null;
        return (
          <div key={level} className="mb-6">
            <h3 className="font-display text-[11px] font-bold tracking-[2px] uppercase text-[#6B7280] mb-3">{level} Officials</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {offs.map(rep => (
                <button
                  key={rep.id}
                  onClick={() => onSelectRep(rep)}
                  className="text-left bg-white rounded-xl border border-[#E8E8E6] p-4 hover:border-[#001B3D] hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#001B3D]/5 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-[#001B3D]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-display font-bold text-sm text-[#001B3D]">{rep.name}</h4>
                      <p className="text-xs text-[#C41230] font-medium">{rep.title}</p>
                      {rep.party && <p className="text-[10px] text-[#9BA3AF] mt-0.5">{rep.party}</p>}
                    </div>
                    <span className="text-[#9BA3AF] group-hover:text-[#C41230] transition-colors">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Rep detail ──────────────────────────────────────────────────────────────

function RepDetail({ rep, onBack }: { rep: RepResult; onBack: () => void }) {
  return (
    <div className="mt-8 max-w-2xl mx-auto">
      <button onClick={onBack} className="text-sm text-[#6B7280] hover:text-[#001B3D] mb-6 inline-flex items-center gap-1 font-body transition-colors">
        ← Back
      </button>

      <div className="bg-white rounded-2xl border border-[#E8E8E6] overflow-hidden">
        {/* Header */}
        <div className="bg-[#001B3D] p-8 text-white">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-xl bg-white/[0.08] border border-white/[0.10] flex items-center justify-center flex-shrink-0">
              <Users className="w-8 h-8 text-[#E8A030]" />
            </div>
            <div>
              <span className="inline-flex px-2.5 py-0.5 rounded-full bg-[#C41230]/20 text-[#E8A030] font-display text-[10px] font-bold uppercase tracking-wider mb-2">{rep.level} · {rep.party || 'Nonpartisan'}</span>
              <h2 className="font-display font-black text-2xl tracking-[-0.5px]">{rep.name}</h2>
              <p className="text-white/55 font-body text-sm mt-1">{rep.title} — {rep.district}</p>
            </div>
          </div>
        </div>

        {/* Contact info */}
        {rep.contact && (rep.contact.phone || rep.contact.email || rep.contact.website || rep.contact.office) && (
          <div className="p-6 border-b border-[#E8E8E6]">
            <h3 className="font-display text-[11px] font-bold tracking-[2px] uppercase text-[#6B7280] mb-4">Contact</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {rep.contact.phone && (
                <a href={`tel:${rep.contact.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-3 p-3 rounded-lg bg-[#F4F4F2] hover:bg-[#E8E8E6] transition-colors">
                  <Phone className="w-4 h-4 text-[#C41230]" />
                  <span className="font-body text-sm text-[#001B3D]">{rep.contact.phone}</span>
                </a>
              )}
              {rep.contact.email && (
                <a href={`mailto:${rep.contact.email}`} className="flex items-center gap-3 p-3 rounded-lg bg-[#F4F4F2] hover:bg-[#E8E8E6] transition-colors">
                  <Mail className="w-4 h-4 text-[#C41230]" />
                  <span className="font-body text-sm text-[#001B3D] truncate">{rep.contact.email}</span>
                </a>
              )}
              {rep.contact.website && (
                <a href={rep.contact.website} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-[#F4F4F2] hover:bg-[#E8E8E6] transition-colors">
                  <Globe className="w-4 h-4 text-[#C41230]" />
                  <span className="font-body text-sm text-[#001B3D]">Official Website</span>
                  <ExternalLink className="w-3 h-3 text-[#9BA3AF]" />
                </a>
              )}
              {rep.contact.office && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F4F4F2]">
                  <MapPin className="w-4 h-4 text-[#C41230]" />
                  <span className="font-body text-sm text-[#001B3D]">{rep.contact.office}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key issues */}
        {rep.keyIssues && rep.keyIssues.length > 0 && (
          <div className="p-6 border-b border-[#E8E8E6]">
            <h3 className="font-display text-[11px] font-bold tracking-[2px] uppercase text-[#6B7280] mb-4">Key Issues</h3>
            <div className="flex flex-wrap gap-2">
              {rep.keyIssues.map((issue: string) => (
                <span key={issue} className="px-3 py-1.5 rounded-full bg-[#F5EDD8] text-[#001B3D] font-body text-xs font-medium border border-[#EDE0C4]">{issue}</span>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {rep.achievements && rep.achievements.length > 0 && (
          <div className="p-6 border-b border-[#E8E8E6]">
            <h3 className="font-display text-[11px] font-bold tracking-[2px] uppercase text-[#6B7280] mb-4">Achievements</h3>
            <div className="space-y-2">
              {rep.achievements.map((a: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#10B981] mt-1 flex-shrink-0">✓</span>
                  <span className="font-body text-sm text-[#374151]">{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action */}
        <div className="p-6 bg-[#F5EDD8]">
          <p className="font-display text-sm font-bold text-[#001B3D] mb-3">Want to see more?</p>
          <div className="flex gap-3">
            {rep.contact?.website && (
              <a href={rep.contact.website} target="_blank" rel="noreferrer"
                className="btn-primary btn-sm inline-flex">
                Visit Website <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <a href="https://www.vote.gov" target="_blank" rel="noreferrer"
              className="btn-secondary btn-sm inline-flex">
              Register to Vote
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
