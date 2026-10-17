'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, MapPin, Users } from 'lucide-react'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 civic-gradient" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 h-96 bg-gradient-to-t from-slate-50 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium mb-8"
            >
              <Sparkles className="w-4 h-4" />
              <span>Civic Pie: Get a Piece of Gov.</span>
            </motion.div>

            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
              Your Ward.
              <br />
              <span className="text-amber-300">Your Civic Feed.</span>
            </h1>

            <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Personalized updates about meetings, voting, candidates, volunteer opportunities,
              and community news, plus a source-backed civic AI assistant for your neighborhood.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/updates"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-900 font-semibold rounded-2xl hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
              >
                <Sparkles className="w-5 h-5" />
                Sign Up for Updates
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/community"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/20 hover:bg-white/20 transition-all"
              >
                <MapPin className="w-5 h-5" />
                Explore Community
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-12 flex items-center justify-center lg:justify-start gap-8"
            >
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-white">50</div>
                <div className="text-sm text-white/60">Wards</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-white">40+</div>
                <div className="text-sm text-white/60">Ward Sites</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold text-white">4</div>
                <div className="text-sm text-white/60">Digest Modes</div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="glass-card rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">Your Civic Brief</div>
                    <div className="text-xs text-slate-500">Personalized by ward and topic</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl bg-slate-100 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Daily</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Meeting notices, public hearing agendas, city service alerts, and ward office announcements.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Event-Driven</p>
                    <p className="mt-1 text-sm text-slate-700">
                      Candidate filings, registration deadlines, polling updates, and volunteer opportunities near you.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Ask CivicGuide</p>
                    <p className="mt-1 text-sm text-slate-700">
                      “Summarize what matters in my ward this week and link me to the official sources.”
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Topics You Choose</p>
                    <p className="mt-1 text-sm text-white/85">
                      Voting, candidates, meetings, volunteer work, city services, and community news.
                    </p>
                  </div>
                </div>
              </div>

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-6 -right-6 bg-amber-400 text-amber-900 px-4 py-2 rounded-xl shadow-lg font-semibold text-sm"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Source-Backed
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -bottom-4 -left-4 bg-white px-4 py-3 rounded-xl shadow-lg"
              >
                <div className="text-xs text-slate-500 mb-1">Coverage</div>
                <div className="font-semibold text-slate-900">Chicago + Your Ward</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
