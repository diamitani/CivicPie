'use client'

import { motion } from 'framer-motion'
import { Navigation } from '@/components/layout/Navigation'
import { CivicChat } from '@/components/chat/CivicChat'
import { Sparkles, MessageCircle, Lightbulb, FileText, HelpCircle } from 'lucide-react'

const exampleQuestions = [
  {
    category: 'Meetings',
    icon: FileText,
    questions: [
      'When is the next ward meeting?',
      'How do I get the meeting agenda?',
      'Can I attend meetings virtually?',
      'How do I submit public comment?',
    ],
  },
  {
    category: 'Your Representative',
    icon: MessageCircle,
    questions: [
      'Who is my alderman?',
      'How do I contact my alderman?',
      'What committees are they on?',
      "What's their voting record?",
    ],
  },
  {
    category: 'Getting Involved',
    icon: Lightbulb,
    questions: [
      'How can I volunteer in my ward?',
      'How do I run for local office?',
      'What community boards can I join?',
      'How do I report an issue?',
    ],
  },
  {
    category: 'Elections',
    icon: HelpCircle,
    questions: [
      'When is the next election?',
      'Am I registered to vote?',
      'Where is my polling place?',
      "Who's running for alderman?",
    ],
  },
]

export default function ChatPage() {
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
              <Sparkles className="w-4 h-4" />
              AI-Powered Assistant
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Ask CivicGuide
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Get instant answers about Chicago's wards, aldermen, meetings, and civic processes. 
              CivicGuide uses AI to help you navigate local government.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CivicChat className="h-[650px] shadow-xl" />
              </motion.div>
            </div>

            {/* Example Questions Sidebar */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-40"
              >
                <h2 className="font-serif text-2xl font-bold text-slate-900 mb-6">
                  Try Asking
                </h2>
                
                <div className="space-y-6">
                  {exampleQuestions.map((category, idx) => (
                    <div key={category.category}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <category.icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-slate-900">{category.category}</h3>
                      </div>
                      <ul className="space-y-2">
                        {category.questions.map((question, qIdx) => (
                          <li
                            key={qIdx}
                            className="text-sm text-slate-600 hover:text-blue-600 cursor-pointer transition-colors pl-10"
                          >
                            • {question}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    How it Works
                  </h3>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    CivicGuide searches through public records, meeting minutes, 
                    and official sources to provide accurate, up-to-date answers 
                    about Chicago civic life.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
