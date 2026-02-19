'use client'

import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { Hero } from '@/components/layout/Hero'
import { Features } from '@/components/layout/Features'
import { WardGrid } from '@/components/ward/WardGrid'
import { CivicChat } from '@/components/chat/CivicChat'
import { Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { ALL_WARDS } from '@/lib/ward-data'

// Show first 12 wards on the homepage preview
const previewWards = ALL_WARDS.slice(0, 12)

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />

      {/* AI Assistant Preview Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                AI-Powered
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
                Meet CivicGuide
              </h2>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Your personal AI assistant for navigating Chicago politics. Ask questions
                in plain English and get instant, accurate answers about your ward,
                meetings, voting records, and how to make your voice heard.
              </p>

              <ul className="space-y-4 mb-8">
                {[
                  'Find your ward by address',
                  'Get meeting schedules and agendas',
                  'Understand voting records',
                  'Learn about local initiatives',
                  'Discover ways to get involved',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/chat"
                className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
              >
                Try CivicGuide
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:sticky lg:top-32"
            >
              <CivicChat className="h-[550px] shadow-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      <Features />
      <WardGrid wards={previewWards} />

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to Get Involved?
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Democracy works best when everyone participates. Start exploring your ward,
              connect with your alderperson, and make your voice heard in Chicago.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/wards"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-900 font-semibold rounded-2xl hover:bg-blue-50 transition-colors shadow-xl"
              >
                Explore All 50 Wards
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/chat"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Ask CivicGuide
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold">C</span>
                </div>
                <span className="font-serif text-lg font-semibold text-white">CivicPie</span>
              </div>
              <p className="text-sm">
                Empowering Chicago residents with accessible civic information and AI-powered engagement tools.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Explore</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/wards" className="hover:text-white transition-colors">All Wards</Link></li>
                <li><Link href="/aldermen" className="hover:text-white transition-colors">Aldermen</Link></li>
                <li><Link href="/meetings" className="hover:text-white transition-colors">Meetings</Link></li>
                <li><Link href="/chat" className="hover:text-white transition-colors">CivicGuide AI</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Official Sources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://www.chicago.gov/city/en/about/wards.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">City of Chicago Wards</a></li>
                <li><a href="https://chicityclerkelms.chicago.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">City Clerk eLMS</a></li>
                <li><a href="https://chicagoelections.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Board of Elections</a></li>
                <li><a href="https://data.cityofchicago.org/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Chicago Data Portal</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">About</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/data" className="hover:text-white transition-colors">Data Sources</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-sm text-center">
            <p>
              &copy; {new Date().getFullYear()} CivicPie. All data sourced from public records.
              Verified against{' '}
              <a href="https://data.cityofchicago.org/resource/htai-wnw4.json" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Chicago Data Portal
              </a>.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
