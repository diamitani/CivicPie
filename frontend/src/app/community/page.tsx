import { Navigation } from '@/components/layout/Navigation'
import {
  CITYWIDE_TRACKED_SOURCES,
  CIVIC_COVERAGE_METRICS,
  COMMUNITY_SIGNAL_TYPES,
  WARD_SOURCE_DIRECTORY,
} from '@/lib/community-data'
import { ExternalLink, Newspaper, Sparkles, Users } from 'lucide-react'
import Link from 'next/link'

const featuredWardSources = WARD_SOURCE_DIRECTORY.filter((ward) => Boolean(ward.website)).slice(0, 12)

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navigation />

      <section className="pt-32 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
              <Newspaper className="h-4 w-4" />
              Community signal network
            </span>
            <h1 className="mt-6 font-serif text-4xl font-bold text-slate-900 sm:text-5xl">
              A Nextdoor-style civic feed, built from public-interest sources
            </h1>
            <p className="mt-4 text-xl text-slate-600">
              Civic Pie tracks ward offices, city departments, election channels, and volunteer entry points so residents
              can follow what matters locally without sorting through noise.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard value={`${CIVIC_COVERAGE_METRICS.totalWards}`} label="Ward contact records" />
            <StatCard value={`${CIVIC_COVERAGE_METRICS.wardSites}+`} label="Ward websites tracked" />
            <StatCard value={`${CIVIC_COVERAGE_METRICS.trackedCitySources}`} label="Citywide official sources" />
            <StatCard value="Weekly" label="Scheduled reconcile cadence" />
          </div>
        </div>
      </section>

      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="font-serif text-2xl font-bold text-slate-900">Signals we track</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {COMMUNITY_SIGNAL_TYPES.map((item) => (
                <div key={item.title} className="rounded-2xl bg-slate-50 p-5">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold">Personalized by area</h2>
                <p className="text-sm text-slate-300">Sign up once and tailor the feed to your ward and topics.</p>
              </div>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              <li>Daily, weekly, monthly, or event-driven email updates</li>
              <li>Voting and candidate alerts during election cycles</li>
              <li>Meeting notices and public comment opportunities</li>
              <li>Volunteer and civic participation opportunities near you</li>
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/updates"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Join Updates
              </Link>
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Ask CivicGuide
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="font-serif text-2xl font-bold text-slate-900">Official source network</h2>
          <p className="mt-2 text-slate-600">
            These are the citywide public sources currently prioritized for ingestion and reconciliation.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CITYWIDE_TRACKED_SOURCES.map((source) => (
              <a
                key={source.title}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{source.category}</p>
                <h3 className="mt-2 font-semibold text-slate-900">{source.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{source.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600">
                  Visit source
                  <ExternalLink className="h-4 w-4" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-slate-900">Ward channels already mapped</h2>
              <p className="mt-2 text-slate-600">
                Official ward websites are the backbone for community notices, neighborhood meetings, and office announcements.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              <Users className="h-4 w-4" />
              Showing 12 of {CIVIC_COVERAGE_METRICS.wardSites}+ ward websites
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredWardSources.map((ward) => (
              <a
                key={ward.ward}
                href={ward.website ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-md"
              >
                <p className="text-sm font-semibold text-slate-900">Ward {ward.ward}</p>
                <p className="mt-1 text-sm text-slate-600">{ward.alderperson}</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                  {ward.neighborhoods.slice(0, 3).join(' • ')}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600">
                  Open official site
                  <ExternalLink className="h-4 w-4" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{label}</p>
    </div>
  )
}
