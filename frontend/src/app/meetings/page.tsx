'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { Calendar, ExternalLink, Mail, Phone, Search } from 'lucide-react'
import { CHICAGO_WARDS } from '@/lib/ward-data'

const citywideMeetingSources = [
  {
    title: 'Chicago City Clerk eLMS',
    description: 'Agendas, minutes, legislation, and official city council records.',
    url: 'https://chicityclerkelms.chicago.gov/',
  },
  {
    title: 'Chicago City Council',
    description: 'Official city government entry point for council information and ward details.',
    url: 'https://www.chicago.gov/city/en/about/wards.html',
  },
]

export default function MeetingsPage() {
  const [query, setQuery] = useState('')

  const filteredWards = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return CHICAGO_WARDS
    return CHICAGO_WARDS.filter((ward) => {
      return (
        ward.ward.toString() === value ||
        ward.alderperson.toLowerCase().includes(value) ||
        ward.neighborhoods.some((neighborhood) => neighborhood.toLowerCase().includes(value))
      )
    })
  }, [query])

  return (
    <main className="min-h-screen bg-slate-50">
      <Navigation />

      <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
              <Calendar className="w-4 h-4" />
              Public Meetings
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Official Meeting Channels
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Instead of showing fake calendars, Civic Pie points you to the official places where ward meetings,
              agendas, hearings, and neighborhood notices are actually published.
            </p>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="font-serif text-2xl font-bold text-slate-900">Citywide official sources</h2>
                <div className="mt-6 space-y-4">
                  {citywideMeetingSources.map((source) => (
                    <a
                      key={source.title}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 hover:shadow-md"
                    >
                      <h3 className="font-semibold text-slate-900">{source.title}</h3>
                      <p className="mt-2 text-sm text-slate-600">{source.description}</p>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600">
                        Open source
                        <ExternalLink className="h-4 w-4" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
                <h2 className="font-serif text-2xl font-bold">Best subscription topics for meetings</h2>
                <ul className="mt-6 space-y-3 text-sm text-slate-200">
                  <li>Meeting notices and agenda updates</li>
                  <li>Public hearing changes and comment opportunities</li>
                  <li>Ward office bulletins and newsletter posts</li>
                  <li>Event-driven alerts for date or location changes</li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-slate-900">Ward meeting directory</h2>
                  <p className="mt-2 text-slate-600">
                    Search your ward to find the official site, contact email, and ward office phone.
                  </p>
                </div>
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by ward, alderperson, or neighborhood"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {filteredWards.map((ward) => (
                  <div key={ward.ward} className="rounded-2xl border border-slate-200 p-5">
                    <p className="text-sm font-semibold text-slate-900">Ward {ward.ward}</p>
                    <p className="mt-1 text-sm text-slate-600">{ward.alderperson}</p>
                    <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">
                      {ward.neighborhoods.slice(0, 3).join(' • ')}
                    </p>

                    <div className="mt-4 space-y-2 text-sm">
                      {ward.website ? (
                        <a
                          href={ward.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Official ward site
                        </a>
                      ) : (
                        <p className="text-slate-500">No dedicated ward website listed. Contact the office directly.</p>
                      )}
                      <a href={`mailto:${ward.email}`} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                        <Mail className="h-4 w-4" />
                        {ward.email}
                      </a>
                      <a href={`tel:${ward.wardPhone}`} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                        <Phone className="h-4 w-4" />
                        {ward.wardPhone}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
