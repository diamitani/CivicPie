'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Users, Building2, Calendar, Vote, FileText, HandHeart,
  ExternalLink, ChevronRight, Phone, Mail, Globe, Landmark,
  BookOpen, Megaphone, Shield, Sparkles, CheckCircle2, ArrowUpRight,
} from 'lucide-react';
import {
  loadDistrictPageData,
  DistrictPageData,
  DistrictType,
  DISTRICT_TYPE_LABELS,
} from '@/lib/district';
import { VoterRegistrationCard, ElectionAlertSignup, ElectionUrgencyBanner } from '@/components/ElectionFeatures';

type TabId = 'overview' | 'events' | 'elections' | 'officials' | 'meetings' | 'grants' | 'volunteer';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'elections', label: 'Elections', icon: Vote },
  { id: 'officials', label: 'Officials', icon: Users },
  { id: 'meetings', label: 'Meetings', icon: FileText },
  { id: 'grants', label: 'Grants', icon: BookOpen },
  { id: 'volunteer', label: 'Volunteer', icon: HandHeart },
];

export default function DistrictPageClient() {
  const params = useParams<{ type: string; id: string }>();
  const type = params?.type as DistrictType;
  const id = params?.id as string;

  const [data, setData] = useState<DistrictPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  useEffect(() => {
    if (!type || !id) return;
    setLoading(true);
    setError(null);
    const validTypes: DistrictType[] = ['ward', 'city', 'county', 'state', 'federal'];
    if (!validTypes.includes(type)) {
      setError(`Unknown district type: "${type}".`);
      setLoading(false);
      return;
    }
    loadDistrictPageData(type, id)
      .then((d: DistrictPageData | null) => {
        if (!d) { setError(`District not found: ${type}/${id}`); }
        else { setData(d); document.title = `CivicPie — ${d.displayName}`; }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [type, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#E8A030] border-t-transparent" />
          <p className="text-sm text-[#6B7280]">Loading district...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-32 text-center">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-bold text-[#001B3D] mb-2">District Not Found</h2>
        <p className="text-[#6B7280] mb-6">{error || 'Unknown error'}</p>
        <Link href="/" className="btn-primary">Go Home</Link>
      </div>
    );
  }

  const typeLabel = DISTRICT_TYPE_LABELS[data.districtType] || data.districtType;

  return (
    <div>
      <DistrictHero data={data} typeLabel={typeLabel} />
      <SubNav activeTab={activeTab} onTabChange={setActiveTab}
        counts={{ events: data.events?.length || 0, officials: data.officials?.length || 0,
          grants: data.grants?.length || 0, elections: data.elections?.length || 0 }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1 min-w-0">
            {activeTab === 'overview' && <OverviewTab data={data} />}
            {activeTab === 'events' && <EventsTab data={data} />}
            {activeTab === 'elections' && <ElectionsTab data={data} />}
            {activeTab === 'officials' && <OfficialsTab data={data} />}
            {activeTab === 'meetings' && <MeetingsTab data={data} />}
            {activeTab === 'grants' && <GrantsTab data={data} />}
            {activeTab === 'volunteer' && <VolunteerTab />}
          </div>
          <aside className="lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-20 space-y-6">
              <VoterRegistrationCard stateAbbr={data.stateAbbr} stateName={data.state} />
              <SidebarStats data={data} />
              <SidebarOfficials data={data} />
              <ElectionAlertSignup />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ─── DistrictHero ─── */
function DistrictHero({ data, typeLabel }: { data: DistrictPageData; typeLabel: string }) {
  return (
    <div className="relative bg-[#001B3D] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#C41230]/8 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-[#E8A030]/6 blur-3xl" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
        <div className="flex items-center gap-2 text-xs text-white/30 mb-5">
          <Link href="/" className="hover:text-white/60">CivicPie</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/${data.districtType}`} className="hover:text-white/60 capitalize">{data.districtType}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-white/60">{data.displayName}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C41230]/15 border border-[#C41230]/25 text-[#E8A030] text-xs font-semibold tracking-wide uppercase mb-4">
              <Sparkles className="w-3.5 h-3.5" /> {typeLabel} District
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.05] mb-3">
              {data.displayName}
            </h1>
            <p className="text-white/50 font-serif text-base sm:text-lg leading-relaxed max-w-2xl mb-5">{data.description}</p>
            {data.neighborhoods && data.neighborhoods.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {data.neighborhoods.map((n: string) => (
                  <span key={n} className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 text-xs">
                    <MapPin className="w-3 h-3 mr-1 text-[#E8A030]/60" />{n}
                  </span>
                ))}
              </div>
            )}
            {(data.city || data.state) && (
              <p className="text-sm text-white/40 flex items-center gap-2"><MapPin className="w-3.5 h-3.5" />{[data.city, data.state].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <div className="flex-shrink-0">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 min-w-[200px] backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[2px] text-white/30 mb-3">Quick Stats</p>
              <div className="space-y-2.5">
                {data.stats.slice(0, 4).map((stat: { label: string; value: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-xs text-white/40">{stat.label}</span>
                    <span className="text-sm font-semibold text-white">{stat.value}</span>
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

/* ─── SubNav ─── */
function SubNav({ activeTab, onTabChange, counts }: {
  activeTab: TabId; onTabChange: (t: TabId) => void; counts: Record<string, number>;
}) {
  return (
    <div className="border-b border-[#E8E8E6] bg-white sticky top-14 z-20 overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex gap-0.5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                isActive ? 'border-[#C41230] text-[#001B3D]' : 'border-transparent text-[#6B7280] hover:text-[#001B3D] hover:border-[#E8E8E6]'
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
              {typeof count === 'number' && count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-[#C41230]/15 text-[#C41230]' : 'bg-[#F4F4F2] text-[#6B7280]'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Tab sections ─── */
function OverviewTab({ data }: { data: DistrictPageData }) {
  return (
    <div className="space-y-12">
      {data.events?.length > 0 && <Section title="Upcoming Events" icon={Calendar}>
        <div className="grid sm:grid-cols-2 gap-4">{data.events.slice(0, 4).map((ev: any) => <EventCard key={ev.id} event={ev} />)}</div>
      </Section>}
      {data.officials?.length > 0 && <Section title="Your Representatives" icon={Users}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{data.officials.slice(0, 6).map((o: any) => <OfficialCard key={o.id || o.name} official={o} />)}</div>
      </Section>}
      {data.agencies?.length > 0 && <Section title="Government Agencies" icon={Building2}>
        <div className="grid sm:grid-cols-2 gap-3">{data.agencies.slice(0, 6).map((a: any) => <AgencyCard key={a.id || a.name} agency={a} />)}</div>
      </Section>}
      {data.grants?.length > 0 && <Section title="Available Grants" icon={BookOpen}>
        <div className="space-y-3">{data.grants.slice(0, 4).map((g: any, i: number) => <GrantRow key={i} grant={g} />)}</div>
      </Section>}
      {data.elections?.length > 0 && <Section title="Upcoming Elections" icon={Vote}>
        <div className="space-y-3">{data.elections.slice(0, 3).map((e: any, i: number) => <ElectionRow key={i} election={e} />)}</div>
      </Section>}
      {data.civicGroups?.length > 0 && <Section title="Community Groups" icon={HandHeart}>
        <div className="grid sm:grid-cols-2 gap-4">{data.civicGroups.slice(0, 4).map((g: any) => <CivicGroupCard key={g.id} group={g} />)}</div>
      </Section>}
      {!data.events?.length && !data.officials?.length && !data.agencies?.length && !data.grants?.length && (
        <EmptyState icon={Building2} title="District Data Coming Soon" description={`We're gathering data for ${data.displayName}.`} />
      )}
    </div>
  );
}

function EventsTab({ data }: { data: DistrictPageData }) {
  if (!data.events?.length) return <Section title="Events Calendar" icon={Calendar}><EmptyState icon={Calendar} title="No Events Yet" description="Events will appear here." /></Section>;
  return <Section title="Events Calendar" icon={Calendar}><div className="grid sm:grid-cols-2 gap-4">{data.events.map((ev: any) => <EventCard key={ev.id} event={ev} />)}</div></Section>;
}

function ElectionsTab({ data }: { data: DistrictPageData }) {
  return <div className="space-y-8">
    <Section title="Elections & Voter Information" icon={Vote}>
      {data.elections?.length ? <div className="space-y-3">{data.elections.map((e: any, i: number) => <ElectionRow key={i} election={e} />)}</div>
        : <EmptyState icon={Vote} title="Election Data Coming Soon" description="Election data will appear as dates approach." />}
    </Section>
    <div className="bg-[#F5EDD8] border border-[#EDE0C4] rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#C41230]/10 flex items-center justify-center flex-shrink-0"><CheckCircle2 className="w-6 h-6 text-[#C41230]" /></div>
        <div><h3 className="font-display font-bold text-[#001B3D] mb-2">Register to Vote</h3>
          <p className="text-sm text-[#6B7280] leading-relaxed mb-3">{data.stateAbbr ? `Check your registration through the ${data.state} election board.` : 'Check your voter registration status.'}</p>
          <a href={data.stateAbbr ? `https://www.vote.gov/register/${data.stateAbbr.toLowerCase()}` : 'https://www.vote.gov'} target="_blank" rel="noreferrer" className="btn-primary btn-sm inline-flex">Check Registration <ExternalLink className="w-3.5 h-3.5" /></a>
        </div>
      </div>
    </div>
  </div>;
}

function OfficialsTab({ data }: { data: DistrictPageData }) {
  if (!data.officials?.length) return <Section title="Elected Officials" icon={Users}><EmptyState icon={Users} title="No Officials" description="Official data being compiled." /></Section>;
  const grouped: Record<string, any[]> = {};
  data.officials.forEach((o: any) => { const l = o.level || 'Other'; if (!grouped[l]) grouped[l] = []; grouped[l].push(o); });
  return <div className="space-y-10">{Object.entries(grouped).map(([level, offs]) => (
    <Section key={level} title={level} icon={Users}><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{offs.map((o: any) => <OfficialCard key={o.id || o.name} official={o} />)}</div></Section>
  ))}</div>;
}

function MeetingsTab({ data }: { data: DistrictPageData }) {
  return <Section title="Meetings & Hearings" icon={FileText}>
    <div className="bg-[#F5EDD8] border border-[#EDE0C4] rounded-xl p-6">
      <div className="flex items-start gap-4"><div className="w-12 h-12 rounded-xl bg-[#001B3D]/10 flex items-center justify-center flex-shrink-0"><FileText className="w-6 h-6 text-[#001B3D]" /></div>
        <div><h3 className="font-display font-bold text-[#001B3D] mb-2">Meeting Records Coming Soon</h3><p className="text-sm text-[#6B7280]">Agendas, minutes, and transcripts for {data.displayName} will appear here.</p></div>
      </div>
    </div>
  </Section>;
}

function GrantsTab({ data }: { data: DistrictPageData }) {
  if (!data.grants?.length) return <Section title="Grants & Programs" icon={BookOpen}><EmptyState icon={BookOpen} title="No Grants" description="Grant programs will appear here." /></Section>;
  return <Section title="Grants & Programs" icon={BookOpen}><div className="space-y-3">{data.grants.map((g: any, i: number) => <GrantRow key={i} grant={g} />)}</div></Section>;
}

function VolunteerTab() {
  const ops = [
    { title: 'Poll Worker', desc: 'Serve on Election Day.', icon: Vote },
    { title: 'Community Board', desc: 'Join advisory boards.', icon: Megaphone },
    { title: 'Park Cleanup', desc: 'Neighborhood stewardship.', icon: Shield },
    { title: 'Youth Mentoring', desc: 'After-school civic programs.', icon: Users },
  ];
  return <Section title="Volunteer Opportunities" icon={HandHeart}>
    <div className="grid sm:grid-cols-2 gap-4">{ops.map((o, i) => (
      <div key={i} className="card p-5"><div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#C41230]/8 flex items-center justify-center flex-shrink-0"><o.icon className="w-5 h-5 text-[#C41230]" /></div>
        <div><h3 className="font-semibold text-sm text-[#001B3D] mb-1">{o.title}</h3><p className="text-xs text-[#6B7280]">{o.desc}</p></div>
      </div></div>
    ))}</div>
  </Section>;
}

/* ─── Sidebar ─── */
function SidebarStats({ data }: { data: DistrictPageData }) {
  return <div className="card p-5"><h3 className="font-display text-xs font-bold uppercase tracking-[2px] text-[#6B7280] mb-4">District Stats</h3>
    <div className="space-y-2.5">{data.stats.map((s: { label: string; value: string }, i: number) => (
      <div key={i} className="flex items-center justify-between py-1 border-b border-[#F4F4F2] last:border-0"><span className="text-xs text-[#6B7280]">{s.label}</span><span className="text-sm font-semibold text-[#001B3D]">{s.value}</span></div>
    ))}</div></div>;
}
function SidebarOfficials({ data }: { data: DistrictPageData }) {
  if (!data.officials?.length) return null;
  return <div className="card p-5"><h3 className="font-display text-xs font-bold uppercase tracking-[2px] text-[#6B7280] mb-4">Key Officials</h3>
    <div className="space-y-3">{data.officials.slice(0, 5).map((o: any) => (
      <div key={o.id || o.name} className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-[#001B3D]/6 flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5 text-[#001B3D]" /></div><div className="min-w-0"><p className="text-sm font-semibold text-[#001B3D] truncate">{o.name}</p><p className="text-xs text-[#6B7280]">{o.title}</p></div></div>
    ))}</div>
    {data.officials.length > 5 && <p className="text-xs text-[#6B7280] mt-3 italic">+ {data.officials.length - 5} more</p>}
  </div>;
}
function SidebarRegistration({ data }: { data: DistrictPageData }) {
  return <div className="card p-5 bg-[#001B3D] text-white"><div className="flex items-center gap-2 mb-3"><Vote className="w-5 h-5 text-[#E8A030]" /><h3 className="font-display font-bold text-sm">Voter Registration</h3></div>
    <p className="text-xs text-white/50 leading-relaxed mb-4">Check your status, register, or find your polling place.</p>
    <a href={data.stateAbbr ? `https://www.vote.gov/register/${data.stateAbbr.toLowerCase()}` : 'https://www.vote.gov'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 w-full justify-center py-2.5 rounded-lg bg-[#E8A030] text-[#001B3D] font-semibold text-sm hover:bg-[#F5BE6A] transition-colors">Check Registration <ArrowUpRight className="w-4 h-4" /></a>
  </div>;
}

/* ─── Shared cards ─── */
function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return <section><div className="flex items-center gap-2.5 mb-5"><Icon className="w-5 h-5 text-[#C41230]" /><h2 className="font-display font-bold text-xl text-[#001B3D]">{title}</h2></div>{children}</section>;
}
function EmptyState({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return <div className="text-center py-12 px-4"><div className="w-16 h-16 rounded-2xl bg-[#F4F4F2] flex items-center justify-center mx-auto mb-4"><Icon className="w-8 h-8 text-[#9BA3AF]" /></div><h3 className="font-display font-bold text-[#001B3D] mb-2">{title}</h3><p className="text-sm text-[#6B7280] max-w-md mx-auto">{description}</p></div>;
}
function EventCard({ event }: { event: any }) {
  return <div className="card p-5 hover:shadow-sm hover:-translate-y-0.5 transition-all"><div className="flex items-start justify-between mb-3"><span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#C41230]/8 text-[#C41230] text-[11px] font-semibold border border-[#C41230]/15">{event.category || 'Event'}</span><span className="text-[11px] text-[#9BA3AF]">{event.date}</span></div><h3 className="font-semibold text-sm text-[#001B3D] mb-2">{event.title}</h3><p className="text-xs text-[#6B7280] mb-3 line-clamp-2">{event.description}</p><div className="flex items-center gap-1 text-[11px] text-[#9BA3AF]"><MapPin className="w-3 h-3" />{event.location}</div></div>;
}
function OfficialCard({ official }: { official: any }) {
  return <div className="card p-5 hover:shadow-sm transition-all"><div className="flex items-start gap-3 mb-3"><div className="w-11 h-11 rounded-lg bg-[#001B3D]/6 flex items-center justify-center flex-shrink-0"><Users className="w-5 h-5 text-[#001B3D]" /></div><div className="min-w-0"><h3 className="font-semibold text-sm text-[#001B3D] truncate">{official.name}</h3><p className="text-xs text-[#C41230] font-medium">{official.title}</p><p className="text-[11px] text-[#9BA3AF] mt-0.5">{official.level}{official.party ? ` • ${official.party}` : ''}</p></div></div>{official.contact && <div className="space-y-1 text-xs text-[#6B7280]">{official.contact.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{official.contact.phone}</p>}{official.contact.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{official.contact.email}</p>}{official.contact.website && <a href={official.contact.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[#C41230] hover:underline mt-1 font-medium"><Globe className="w-3 h-3" />Website <ExternalLink className="w-3 h-3" /></a>}</div>}</div>;
}
function AgencyCard({ agency }: { agency: any }) {
  return <div className="card p-4 hover:shadow-sm transition-all"><div className="flex items-start gap-3"><div className="w-9 h-9 rounded-lg bg-[#001B3D]/6 flex items-center justify-center flex-shrink-0"><Building2 className="w-4 h-4 text-[#001B3D]" /></div><div className="min-w-0"><h3 className="font-semibold text-sm text-[#001B3D]">{agency.name}</h3><p className="text-[11px] text-[#9BA3AF]">{agency.level} • {agency.type || 'Agency'}</p></div></div></div>;
}
function GrantRow({ grant }: { grant: any }) {
  const title = grant.program || grant.title || 'Untitled Grant';
  return <div className="card p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-all"><div><h4 className="font-semibold text-sm text-[#001B3D]">{title}</h4><p className="text-xs text-[#6B7280] mt-1">{grant.agency || grant.sponsor || ''}{grant.type ? ` • ${grant.type}` : ''}</p><div className="flex items-center gap-3 mt-2"><span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8A030]/12 text-[#B87818] font-semibold">{grant.amount_range || 'Varies'}</span><span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C41230]/8 text-[#C41230] font-semibold">{grant.deadline_note || 'Check website'}</span></div></div>{(grant.url || grant.apply_url) && <a href={grant.url || grant.apply_url} target="_blank" rel="noreferrer" className="text-[#C41230] hover:underline flex-shrink-0 text-xs font-medium inline-flex items-center gap-1 mt-1">Apply <ExternalLink className="w-3 h-3" /></a>}</div>;
}
function ElectionRow({ election }: { election: any }) {
  return <div className="card p-4 flex items-start gap-4"><div className="w-10 h-10 rounded-lg bg-[#C41230]/8 flex items-center justify-center flex-shrink-0"><Vote className="w-5 h-5 text-[#C41230]" /></div><div className="flex-1 min-w-0"><h4 className="font-semibold text-sm text-[#001B3D]">{election.name || election.election_type || 'Election'}</h4>{election.schedule && <p className="text-xs text-[#6B7280] mt-0.5">{election.schedule}</p>}<div className="flex items-center gap-2 mt-2"><span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C41230]/10 text-[#C41230] font-semibold">{election.next_date || 'TBD'}</span>{election.level && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#001B3D]/6 text-[#001B3D] font-semibold capitalize">{election.level}</span>}</div></div></div>;
}
function CivicGroupCard({ group }: { group: any }) {
  return <div className="card p-5 hover:shadow-sm transition-all"><div className="flex items-start gap-3 mb-3"><div className="w-10 h-10 rounded-lg bg-[#E8A030]/10 flex items-center justify-center flex-shrink-0"><HandHeart className="w-5 h-5 text-[#B87818]" /></div><div className="min-w-0"><h3 className="font-semibold text-sm text-[#001B3D]">{group.name}</h3><p className="text-[11px] text-[#9BA3AF]">{group.type} • {group.focus}</p></div></div><p className="text-xs text-[#6B7280] line-clamp-2">{group.description}</p>{group.website && <a href={group.website} target="_blank" rel="noreferrer" className="text-xs text-[#C41230] hover:underline inline-flex items-center gap-1 mt-2 font-medium">Visit <ExternalLink className="w-3 h-3" /></a>}</div>;
}
