'use client'

import { motion } from 'framer-motion'
import { ArrowRight, MapPin, Users, Calendar, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Ward } from '@/types'

interface WardGridProps {
  wards: Ward[]
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5
    }
  }
}

export function WardGrid({ wards }: WardGridProps) {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-4">
              <MapPin className="w-4 h-4" />
              Explore Chicago
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              All 50 Wards
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Browse every ward in Chicago. Find your alderman, upcoming meetings, 
              and local initiatives in your neighborhood.
            </p>
          </motion.div>
        </div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {wards.map((ward) => (
            <WardCard key={ward.id} ward={ward} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function WardCard({ ward }: { ward: Ward }) {
  const nextMeeting = ward.meetings.find(m => m.status === 'upcoming')
  
  return (
    <motion.div
      variants={itemVariants}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Header */}
      <div className="relative h-32 civic-gradient p-6 flex items-end">
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl text-white font-bold text-lg">
            {ward.id}
          </span>
        </div>
        
        {ward.alderman.photoUrl && (
          <div className="absolute top-4 right-4">
            <img
              src={ward.alderman.photoUrl}
              alt={ward.alderman.name}
              className="w-16 h-16 rounded-xl object-cover border-2 border-white/50 shadow-lg"
            />
          </div>
        )}
        
        <div className="relative">
          <h3 className="text-white font-semibold">{ward.alderman.name}</h3>
          <p className="text-white/70 text-sm">Alderman</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Neighborhoods */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {ward.neighborhoods.slice(0, 3).map((hood) => (
              <span
                key={hood}
                className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg"
              >
                {hood}
              </span>
            ))}
            {ward.neighborhoods.length > 3 && (
              <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg">
                +{ward.neighborhoods.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Users className="w-4 h-4 text-slate-400" />
            <span>{(ward.population / 1000).toFixed(1)}k residents</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{ward.meetings.length} meetings</span>
          </div>
        </div>

        {/* Next Meeting */}
        {nextMeeting && (
          <div className="mb-4 p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-600 font-medium mb-1">Next Meeting</p>
            <p className="text-sm text-slate-700 truncate">{nextMeeting.title}</p>
            <p className="text-xs text-slate-500">{new Date(nextMeeting.date).toLocaleDateString()}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/wards/${ward.id}`}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            View Ward
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          {ward.alderman.website && (
            <a
              href={ward.alderman.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}
