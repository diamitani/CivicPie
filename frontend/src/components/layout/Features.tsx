'use client'

import { motion } from 'framer-motion'
import { MapPin, MessageSquare, Calendar, FileText, Bell, Users, Search, Shield } from 'lucide-react'

const features = [
  {
    icon: MapPin,
    title: 'Ward Explorer',
    description: 'Interactive map of all 50 Chicago wards with demographics, boundaries, and neighborhood details.',
    color: 'bg-blue-500',
  },
  {
    icon: MessageSquare,
    title: 'CivicGuide AI',
    description: 'Ask questions in plain English. Get answers about meetings, officials, and local issues instantly.',
    color: 'bg-purple-500',
  },
  {
    icon: Calendar,
    title: 'Meeting Tracker',
    description: 'Never miss a meeting. Get calendars, agendas, and minutes for all ward and city council meetings.',
    color: 'bg-green-500',
  },
  {
    icon: FileText,
    title: 'Voting Records',
    description: 'Track how your alderman votes on key issues. Transparent access to city council decisions.',
    color: 'bg-amber-500',
  },
  {
    icon: Users,
    title: 'Official Profiles',
    description: 'Comprehensive profiles for all aldermen with contact info, committees, and initiatives.',
    color: 'bg-rose-500',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description: 'Get notified about meetings, votes, and issues that matter to your neighborhood.',
    color: 'bg-cyan-500',
  },
]

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

export function Features() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-medium mb-4">
              <Shield className="w-4 h-4" />
              Everything You Need
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Civic Engagement, Simplified
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Powerful tools to help you understand, engage with, and influence 
              your local government—all in one beautiful platform.
            </p>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group p-8 rounded-3xl bg-slate-50 hover:bg-white hover:shadow-xl border border-transparent hover:border-slate-200 transition-all duration-300"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", feature.color)}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-slate-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// Helper function for className
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
