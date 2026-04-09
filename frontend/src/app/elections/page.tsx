'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Navigation } from '@/components/layout/Navigation'
import { BellRing, ExternalLink, Vote } from 'lucide-react'
import {
  ELECTION_ALERT_TOPICS,
  ELECTION_READINESS_STEPS,
  OFFICIAL_ELECTION_RESOURCES,
} from '@/lib/election-data'

export default function ElectionsPage() {
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
              <Vote className="w-4 h-4" />
              Elections
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Election Readiness
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Civic Pie is being built to track election signals responsibly: registration, polling changes,
              candidate notices, and ward-specific reminders sourced from official records.
            </p>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="font-serif text-2xl font-bold text-slate-900">Official resources</h2>
              <div className="mt-6 grid gap-4">
                {OFFICIAL_ELECTION_RESOURCES.map((resource) => (
                  <a
                    key={resource.title}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-blue-300 hover:shadow-md"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{resource.category}</p>
                    <h3 className="mt-2 font-semibold text-slate-900">{resource.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{resource.description}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600">
                      Visit official source
                      <ExternalLink className="h-4 w-4" />
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <BellRing className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl font-bold">What to subscribe to</h2>
                    <p className="text-sm text-slate-300">Event-driven election alerts are usually the most valuable.</p>
                  </div>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-slate-200">
                  {ELECTION_ALERT_TOPICS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link
                  href="/updates"
                  className="mt-8 inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Set Election Alerts
                </Link>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="font-serif text-2xl font-bold text-slate-900">How Civic Pie handles election data</h2>
                <div className="mt-6 grid gap-4">
                  {ELECTION_READINESS_STEPS.map((step, index) => (
                    <div key={step.title} className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                      <h3 className="mt-2 font-semibold text-slate-900">{step.title}</h3>
                      <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
