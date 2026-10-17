'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { CivicChat } from '@/components/chat/CivicChat'
import {
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Calendar,
  FileText,
  Building,
  Globe,
} from 'lucide-react'
import Link from 'next/link'
import { getWardRecord, toWard, DATA_SOURCES, WardDataRecord } from '@/lib/ward-data'

export default function WardPage({ params }: { params: { id: string } }) {
  const wardId = parseInt(params.id)
  const record = getWardRecord(wardId)
  const [activeTab, setActiveTab] = useState<'overview' | 'meetings' | 'contact'>('overview')

  if (!record) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Navigation />
        <div className="pt-40 text-center">
          <h1 className="font-serif text-4xl font-bold text-slate-900 mb-4">Ward Not Found</h1>
          <p className="text-slate-600 mb-8">Ward {wardId} doesn&apos;t exist. Chicago has wards 1-50.</p>
          <Link href="/wards" className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            Browse All Wards
          </Link>
        </div>
      </main>
    )
  }

  const ward = toWard(record)
  const cityPageUrl = DATA_SOURCES.wardDetail(wardId)

  return (
    <main className="min-h-screen bg-slate-50">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-2 text-white/70 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Ward {ward.id}</span>
                <span className="text-white/30 mx-1">|</span>
                <span className="text-sm">{record.wardOfficeCity}, {record.wardOfficeState} {record.wardOfficeZip}</span>
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white mb-2">
                {ward.neighborhoods.slice(0, 3).join(', ')}
              </h1>
              <p className="text-white/80 text-lg">
                Alderperson <span className="font-semibold text-white">{record.alderperson}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={`tel:${record.wardPhone}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                <Phone className="w-4 h-4" />
                {record.wardPhone}
              </a>
              <a
                href={`mailto:${record.email}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-900 rounded-xl hover:bg-blue-50 transition-colors font-medium"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
              {record.website && (
                <a
                  href={record.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Website
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tabs */}
      <div className="sticky top-24 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {(['overview', 'meetings', 'contact'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              {activeTab === 'overview' && <OverviewTab record={record} cityPageUrl={cityPageUrl} />}
              {activeTab === 'meetings' && <MeetingsTab record={record} />}
              {activeTab === 'contact' && <ContactTab record={record} cityPageUrl={cityPageUrl} />}
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-40">
              <h3 className="font-semibold text-slate-900 mb-4">Ask CivicGuide about Ward {wardId}</h3>
              <CivicChat wardId={wardId} className="h-[500px] shadow-lg" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

/* ─── Tab Components ─────────────────────────────────────────────────────── */

function OverviewTab({ record, cityPageUrl }: { record: WardDataRecord; cityPageUrl: string }) {
  return (
    <div className="space-y-8">
      {/* Alderman Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="font-serif text-2xl font-bold text-slate-900 mb-6">Your Alderperson</h2>
        <div className="flex gap-6">
          {record.photoUrl ? (
            <img src={record.photoUrl} alt={record.alderperson} className="w-24 h-24 rounded-2xl object-cover shadow-md" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white text-3xl font-bold shadow-md">
              {record.alderperson.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-900">{record.alderperson}</h3>
            <p className="text-slate-600 mb-2">Alderperson, Ward {record.ward}</p>
            <p className="text-sm text-slate-500 mb-4">Term: May 2023 &ndash; May 2027</p>

            <div className="flex flex-wrap gap-3 text-sm">
              <a href={`mailto:${record.email}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                <Mail className="w-4 h-4" /> {record.email}
              </a>
              <a href={`tel:${record.wardPhone}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                <Phone className="w-4 h-4" /> {record.wardPhone}
              </a>
              {record.website && (
                <a href={record.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                  <ExternalLink className="w-3 h-3" /> Official Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Neighborhoods */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="font-serif text-2xl font-bold text-slate-900 mb-4">Neighborhoods</h2>
        <div className="flex flex-wrap gap-2">
          {record.neighborhoods.map((hood) => (
            <span key={hood} className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-xl font-medium">{hood}</span>
          ))}
        </div>
      </div>

      {/* Official Sources */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="font-serif text-2xl font-bold text-slate-900 mb-4">Official Sources</h2>
        <p className="text-sm text-slate-500 mb-4">
          All information on this page is sourced from official City of Chicago records. Data last verified February 18, 2026.
        </p>
        <div className="space-y-3">
          <SourceLink href={cityPageUrl} title={`Chicago.gov Ward ${record.ward} Page`} subtitle="Official city page" />
          {record.website && (
            <SourceLink href={record.website} title="Alderperson's Official Website" subtitle={record.website} />
          )}
          <SourceLink
            href={`https://chicago.councilmatic.org/search/?q=ward+${record.ward}`}
            title="Councilmatic Legislation Search"
            subtitle="View legislation and voting records"
          />
        </div>
      </div>
    </div>
  )
}

function MeetingsTab({ record }: { record: WardDataRecord }) {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="font-serif text-2xl font-bold text-slate-900 mb-4">Meeting Information</h2>
        <p className="text-slate-600 mb-6">
          Meeting schedules for Ward {record.ward} are published by the alderperson&apos;s office.
          Check the sources below for the most current schedule.
        </p>
        <div className="space-y-4">
          {record.website && (
            <a href={record.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900">Ward {record.ward} Meetings</h4>
                <p className="text-sm text-slate-600">Check the alderperson&apos;s website for upcoming meeting dates.</p>
              </div>
              <ExternalLink className="w-5 h-5 text-blue-600" />
            </a>
          )}
          <a href="https://chicityclerkelms.chicago.gov/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-900">City Council Meetings</h4>
              <p className="text-sm text-slate-600">Full council meeting agendas, minutes, and legislation from the City Clerk.</p>
            </div>
            <ExternalLink className="w-5 h-5 text-slate-400" />
          </a>
        </div>
      </div>
    </div>
  )
}

function ContactTab({ record, cityPageUrl }: { record: WardDataRecord; cityPageUrl: string }) {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="font-serif text-2xl font-bold text-slate-900 mb-6">Ward Office</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-5">
            <ContactItem icon={<MapPin className="w-5 h-5 text-blue-600" />} label="Ward Office Address">
              <p className="text-slate-600">{record.wardOfficeAddress}</p>
              <p className="text-slate-600">{record.wardOfficeCity}, {record.wardOfficeState} {record.wardOfficeZip}</p>
            </ContactItem>
            <ContactItem icon={<Phone className="w-5 h-5 text-blue-600" />} label="Ward Office Phone">
              <a href={`tel:${record.wardPhone}`} className="text-blue-600 hover:underline">{record.wardPhone}</a>
              {record.wardFax && <p className="text-sm text-slate-500">Fax: {record.wardFax}</p>}
            </ContactItem>
            <ContactItem icon={<Mail className="w-5 h-5 text-blue-600" />} label="Email">
              <a href={`mailto:${record.email}`} className="text-blue-600 hover:underline">{record.email}</a>
            </ContactItem>
          </div>
          <div className="space-y-5">
            <ContactItem icon={<Building className="w-5 h-5 text-slate-600" />} label="City Hall Office" bg="bg-slate-100">
              <p className="text-slate-600">{record.cityHallAddress}</p>
              <p className="text-slate-600">Chicago, IL 60602</p>
            </ContactItem>
            <ContactItem icon={<Phone className="w-5 h-5 text-slate-600" />} label="City Hall Phone" bg="bg-slate-100">
              <a href={`tel:${record.cityHallPhone}`} className="text-blue-600 hover:underline">{record.cityHallPhone}</a>
            </ContactItem>
            {record.website && (
              <ContactItem icon={<Globe className="w-5 h-5 text-slate-600" />} label="Website" bg="bg-slate-100">
                <a href={record.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                  {record.website}
                </a>
              </ContactItem>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-800">Data source:</span>{' '}
          <a href="https://data.cityofchicago.org/resource/htai-wnw4.json" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Chicago Data Portal &mdash; Ward Offices
          </a>{' '}and{' '}
          <a href={cityPageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            chicago.gov Ward {record.ward}
          </a>. Last verified February 18, 2026.
        </p>
      </div>
    </div>
  )
}

/* ─── Tiny helpers ───────────────────────────────────────────────────────── */

function SourceLink({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
        <Globe className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
    </a>
  )
}

function ContactItem({ icon, label, children, bg = 'bg-blue-100' }: { icon: React.ReactNode; label: string; children: React.ReactNode; bg?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>{icon}</div>
      <div>
        <p className="font-medium text-slate-900">{label}</p>
        {children}
      </div>
    </div>
  )
}
