'use client'

import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { Calendar, MapPin, Clock, FileText, Video } from 'lucide-react'

const upcomingMeetings = [
  {
    id: 1,
    title: 'City Council Meeting',
    date: '2024-03-15',
    time: '10:00 AM',
    location: 'City Hall - 121 N LaSalle St',
    type: 'city-council',
    description: 'Regular city council session with voting on ordinances and resolutions.',
    hasVideo: true,
  },
  {
    id: 2,
    title: 'Budget Committee Hearing',
    date: '2024-03-18',
    time: '9:00 AM',
    location: 'City Hall - 121 N LaSalle St',
    type: 'committee',
    description: 'Public hearing on the proposed city budget.',
    hasAgenda: true,
  },
  {
    id: 3,
    title: '43rd Ward Community Meeting',
    date: '2024-03-20',
    time: '7:00 PM',
    location: 'Lincoln Park Library',
    type: 'ward',
    description: 'Monthly ward meeting with updates on local initiatives.',
  },
]

const pastMeetings = [
  {
    id: 4,
    title: 'Transportation Committee',
    date: '2024-02-28',
    time: '10:00 AM',
    location: 'City Hall',
    type: 'committee',
    hasMinutes: true,
  },
  {
    id: 5,
    title: '32nd Ward Town Hall',
    date: '2024-02-25',
    time: '6:30 PM',
    location: 'Ward Office',
    type: 'town-hall',
  },
]

export default function MeetingsPage() {
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
              Meeting Calendar
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Stay informed about upcoming ward meetings, city council sessions, 
              and committee hearings. All meetings are open to the public.
            </p>
          </motion.div>

          {/* Upcoming Meetings */}
          <div className="mb-16">
            <h2 className="font-serif text-2xl font-bold text-slate-900 mb-6">Upcoming Meetings</h2>
            <div className="space-y-4">
              {upcomingMeetings.map((meeting) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                    {/* Date Badge */}
                    <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-blue-600 flex flex-col items-center justify-center text-white">
                      <span className="text-xs uppercase font-medium">
                        {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-2xl font-bold">
                        {new Date(meeting.date).getDate()}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{meeting.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          meeting.type === 'city-council' ? 'bg-purple-100 text-purple-700' :
                          meeting.type === 'committee' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {meeting.type.replace('-', ' ')}
                        </span>
                      </div>
                      
                      <p className="text-slate-600 mb-2">{meeting.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {meeting.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {meeting.location}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {meeting.hasAgenda && (
                        <button className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors">
                          <FileText className="w-4 h-4" />
                          Agenda
                        </button>
                      )}
                      {meeting.hasVideo && (
                        <button className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors">
                          <Video className="w-4 h-4" />
                          Watch Live
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Past Meetings */}
          <div>
            <h2 className="font-serif text-2xl font-bold text-slate-900 mb-6">Past Meetings</h2>
            <div className="space-y-4">
              {pastMeetings.map((meeting) => (
                <motion.div
                  key={meeting.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 opacity-75"
                >
                  <div className="flex items-center gap-6">
                    <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-slate-200 flex flex-col items-center justify-center text-slate-600">
                      <span className="text-xs uppercase font-medium">
                        {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-2xl font-bold">
                        {new Date(meeting.date).getDate()}
                      </span>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{meeting.title}</h3>
                      <div className="flex gap-4 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {meeting.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {meeting.location}
                        </span>
                      </div>
                    </div>

                    {meeting.hasMinutes && (
                      <button className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-slate-200 transition-colors">
                        <FileText className="w-4 h-4" />
                        Minutes
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
