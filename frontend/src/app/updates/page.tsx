'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BellRing, CheckCircle2, MapPin, Mail, Sparkles } from 'lucide-react'
import { Navigation } from '@/components/layout/Navigation'
import {
  CIVIC_COVERAGE_METRICS,
  DIGEST_FREQUENCIES,
  DIGEST_PREVIEW,
  SUBSCRIPTION_TOPICS,
} from '@/lib/community-data'
import { CHICAGO_WARDS } from '@/lib/ward-data'
import { cn } from '@/lib/utils'

type DigestFrequencyId = (typeof DIGEST_FREQUENCIES)[number]['id']
type SubscriptionTopicId = (typeof SUBSCRIPTION_TOPICS)[number]['id']

const DEFAULT_TOPICS: SubscriptionTopicId[] = ['meetings', 'community-news', 'voting']
const DEFAULT_FREQUENCIES: DigestFrequencyId[] = ['weekly', 'event-driven']

export default function UpdatesPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [wardNumber, setWardNumber] = useState('')
  const [topics, setTopics] = useState<SubscriptionTopicId[]>(DEFAULT_TOPICS)
  const [frequencies, setFrequencies] = useState<DigestFrequencyId[]>(DEFAULT_FREQUENCIES)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' })

  const toggleTopic = (topic: SubscriptionTopicId) => {
    setTopics((current) =>
      current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic]
    )
  }

  const toggleFrequency = (frequency: DigestFrequencyId) => {
    setFrequencies((current) =>
      current.includes(frequency) ? current.filter((item) => item !== frequency) : [...current, frequency]
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus({ type: 'idle' })

    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          address,
          zipCode,
          wardNumber: wardNumber ? Number(wardNumber) : null,
          topics,
          frequencies,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save your update preferences right now.')
      }

      setStatus({
        type: 'success',
        message:
          payload.mode === 'dev-file'
            ? 'Saved locally for development. Add Supabase credentials to store subscriptions in production.'
            : 'Your civic update preferences have been saved.',
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to save your preferences right now.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Navigation />

      <section className="pt-32 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
              <BellRing className="h-4 w-4" />
              Personalized civic updates
            </span>
            <h1 className="mt-6 font-serif text-4xl font-bold text-slate-900 sm:text-5xl">
              Sign Up for Civic Pie
            </h1>
            <p className="mt-4 text-xl text-slate-600">
              Get a cleaner civic signal for your ward: meetings, elections, candidates, volunteer opportunities,
              and community public-interest news delivered on your schedule.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.form
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-[1fr_180px]">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Address or neighborhood</span>
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="1234 N Example St, Edgewater"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">ZIP</span>
                <input
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                  placeholder="60640"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-sm font-medium text-slate-700">Ward</span>
              <select
                value={wardNumber}
                onChange={(event) => setWardNumber(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Choose your ward</option>
                {CHICAGO_WARDS.map((ward) => (
                  <option key={ward.ward} value={ward.ward}>
                    Ward {ward.ward} · {ward.alderperson}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Topics to follow</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SUBSCRIPTION_TOPICS.map((topic) => {
                  const selected = topics.includes(topic.id)
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      className={cn(
                        'rounded-2xl border px-4 py-4 text-left transition',
                        selected
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{topic.label}</span>
                        {selected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{topic.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Delivery timing</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {DIGEST_FREQUENCIES.map((frequency) => {
                  const selected = frequencies.includes(frequency.id)
                  return (
                    <button
                      key={frequency.id}
                      type="button"
                      onClick={() => toggleFrequency(frequency.id)}
                      className={cn(
                        'rounded-2xl border px-4 py-4 text-left transition',
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{frequency.label}</span>
                        {selected && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <p className={cn('mt-2 text-sm', selected ? 'text-slate-200' : 'text-slate-600')}>
                        {frequency.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {status.type !== 'idle' && (
              <div
                className={cn(
                  'mt-6 rounded-2xl px-4 py-3 text-sm',
                  status.type === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border border-rose-200 bg-rose-50 text-rose-900'
                )}
              >
                {status.message}
              </div>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Email-only for now. Address helps personalize your ward and neighborhood signal.
              </p>
              <button
                type="submit"
                disabled={isSubmitting || topics.length === 0 || frequencies.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save My Preferences'}
              </button>
            </div>
          </motion.form>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-3">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold">What you get</h2>
                  <p className="text-sm text-slate-300">Built for real civic follow-through, not doomscrolling.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                {DIGEST_PREVIEW.map((item) => (
                  <div key={item.title} className="rounded-2xl bg-white/5 p-4">
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <h2 className="font-serif text-2xl font-bold text-slate-900">Current coverage</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-3xl font-bold text-blue-700">{CIVIC_COVERAGE_METRICS.totalWards}</p>
                  <p className="text-sm text-slate-600">Ward contact records</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-3xl font-bold text-amber-700">{CIVIC_COVERAGE_METRICS.wardSites}+</p>
                  <p className="text-sm text-slate-600">Official ward websites tracked</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-3xl font-bold text-emerald-700">{CIVIC_COVERAGE_METRICS.trackedCitySources}</p>
                  <p className="text-sm text-slate-600">Citywide official sources</p>
                </div>
                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-3xl font-bold text-slate-900">{CIVIC_COVERAGE_METRICS.digestModes}</p>
                  <p className="text-sm text-slate-600">Digest and alert modes</p>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                <p>
                  Weekly scraping and reconciliation is designed to keep these subscriptions aligned with official public data,
                  then deliver the right items to each person based on their area and topics.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  )
}
