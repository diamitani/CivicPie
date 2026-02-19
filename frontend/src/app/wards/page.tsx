'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { WardGrid } from '@/components/ward/WardGrid'
import { Search, MapPin } from 'lucide-react'
import { ALL_WARDS, searchWards, CHICAGO_WARDS } from '@/lib/ward-data'

export default function WardsPage() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredWards = useMemo(() => {
    if (!searchQuery.trim()) return ALL_WARDS
    const q = searchQuery.toLowerCase()
    return ALL_WARDS.filter(ward =>
      ward.alderman.name.toLowerCase().includes(q) ||
      ward.neighborhoods.some(n => n.toLowerCase().includes(q)) ||
      ward.id.toString() === q.trim()
    )
  }, [searchQuery])

  return (
    <main className="min-h-screen bg-slate-50">
      <Navigation />

      {/* Header */}
      <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
              <MapPin className="w-4 h-4" />
              Chicago City Council
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              All 50 Wards
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Explore every ward in Chicago. Find your alderperson, learn about your neighborhood,
              and discover what&apos;s happening in your community.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-2xl mx-auto mb-12"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by ward number, alderperson name, or neighborhood..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-slate-500 mt-2 text-center">
                {filteredWards.length} ward{filteredWards.length !== 1 ? 's' : ''} found
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Ward Grid */}
      <WardGrid wards={filteredWards} />

      {/* Data source note */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <p className="text-center text-sm text-slate-400">
          Data sourced from{' '}
          <a href="https://data.cityofchicago.org/resource/htai-wnw4.json" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            Chicago Data Portal
          </a>{' '}
          and{' '}
          <a href="https://www.chicago.gov/city/en/about/wards.html" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
            chicago.gov
          </a>. Last verified February 18, 2026.
        </p>
      </div>
    </main>
  )
}
