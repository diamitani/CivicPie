'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { Users, Search, Mail, Phone, ExternalLink, Globe } from 'lucide-react'
import Link from 'next/link'
import { CHICAGO_WARDS } from '@/lib/ward-data'

export default function AldermenPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return CHICAGO_WARDS
    const q = searchQuery.toLowerCase()
    return CHICAGO_WARDS.filter(w =>
      w.alderperson.toLowerCase().includes(q) ||
      w.ward.toString() === q.trim() ||
      w.neighborhoods.some(n => n.toLowerCase().includes(q))
    )
  }, [searchQuery])

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
              <Users className="w-4 h-4" />
              City Council
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Meet Your Aldermen
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Chicago&apos;s 50 alderpersons represent each ward in the City Council.
              Learn about your representative and how to connect with them.
            </p>
          </motion.div>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ward number, or neighborhood..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((w, idx) => (
              <motion.div
                key={w.ward}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.5) }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {w.photoUrl ? (
                    <img src={w.photoUrl} alt={w.alderperson} className="w-16 h-16 rounded-2xl object-cover shadow-md" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-xl font-bold shadow-md">
                      {w.alderperson.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{w.alderperson}</h3>
                    <p className="text-sm text-slate-600">Ward {w.ward}</p>
                  </div>
                </div>

                {/* Neighborhoods */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {w.neighborhoods.slice(0, 3).map(n => (
                    <span key={n} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-lg">{n}</span>
                  ))}
                  {w.neighborhoods.length > 3 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-lg">+{w.neighborhoods.length - 3}</span>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                  <a href={`mailto:${w.email}`} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                    <Mail className="w-4 h-4" /> Email
                  </a>
                  <a href={`tel:${w.wardPhone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                    <Phone className="w-4 h-4" /> Call
                  </a>
                  {w.website && (
                    <a href={w.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                      <Globe className="w-4 h-4" /> Site
                    </a>
                  )}
                  <Link href={`/wards/${w.ward}`} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 ml-auto">
                    View Ward &rarr;
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Data source */}
          <p className="text-center text-sm text-slate-400 mt-12">
            Data sourced from{' '}
            <a href="https://data.cityofchicago.org/resource/htai-wnw4.json" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Chicago Data Portal
            </a>. Last verified February 18, 2026.
          </p>
        </div>
      </section>
    </main>
  )
}
