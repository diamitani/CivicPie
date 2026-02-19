'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Bot, User, Loader2, MapPin, Calendar, FileText } from 'lucide-react'
import { ChatMessage } from '@/types'
import { cn } from '@/lib/utils'

interface CivicChatProps {
  wardId?: number
  className?: string
}

export function CivicChat({ wardId, className }: CivicChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: wardId 
        ? "Hi! I'm CivicGuide, your AI assistant for Chicago civic engagement. I can help you learn about this ward, upcoming meetings, your alderman's voting record, and how to get involved. What would you like to know?"
        : "Hi! I'm CivicGuide, your AI assistant for Chicago civic engagement. Ask me anything about wards, aldermen, meetings, or how to get involved in your neighborhood. I can help you find your ward, understand local issues, and connect with your representatives.",
      timestamp: new Date().toISOString(),
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    })
  }

  useEffect(() => {
    scrollToBottom(messages.length > 1 ? 'smooth' : 'auto')
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate API call - replace with actual API integration
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: generateResponse(input, wardId),
        timestamp: new Date().toISOString(),
        sources: [
          {
            title: 'Chicago City Council Website',
            url: 'https://chicago.gov',
            snippet: 'Official city council information'
          }
        ]
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  // Placeholder response generator - replace with actual AI integration
  function generateResponse(query: string, wardId?: number): string {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('meeting') || lowerQuery.includes('when')) {
      return wardId 
        ? `Ward ${wardId} meetings are typically held on the first Tuesday of each month at 7 PM. The next meeting is scheduled for March 5th at the local library. Would you like me to add this to your calendar or get the agenda?`
        : `Most wards hold meetings monthly. To get specific meeting times for your ward, please let me know which ward you're in, or I can help you find your ward first.`
    }
    
    if (lowerQuery.includes('alderman') || lowerQuery.includes('representative')) {
      return wardId
        ? `Your alderman for Ward ${wardId} is dedicated to serving the community. You can reach their office during business hours, or I can help you find their contact information and recent initiatives.`
        : `Chicago has 50 aldermen representing each ward. Would you like me to help you find your alderman based on your address?`
    }
    
    if (lowerQuery.includes('vote') || lowerQuery.includes('election')) {
      return `Chicago elections include municipal elections every 4 years. The next election is scheduled for February 2027. I can help you find your polling place, check your registration, or learn about the candidates.`
    }
    
    return `That's a great question about Chicago civic engagement. I'm here to help you navigate local government, find resources, and get involved in your community. Could you provide more details so I can give you the most accurate information?`
  }

  const suggestedQuestions = [
    "When is the next ward meeting?",
    "How do I contact my alderman?",
    "What's happening in my neighborhood?",
    "How can I get involved?",
  ]

  return (
    <div className={cn("flex flex-col h-[600px] bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">CivicGuide</h3>
          <p className="text-xs text-white/70">AI Civic Assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-white/70">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "flex gap-3",
                message.role === 'user' ? "flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                message.role === 'assistant' 
                  ? "bg-blue-600" 
                  : "bg-slate-200"
              )}>
                {message.role === 'assistant' ? (
                  <Sparkles className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-slate-600" />
                )}
              </div>
              
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                message.role === 'assistant'
                  ? "bg-slate-100 text-slate-800 rounded-tl-sm"
                  : "bg-blue-600 text-white rounded-tr-sm"
              )}>
                <p className="text-sm leading-relaxed">{message.content}</p>
                
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/50">
                    <p className="text-xs text-slate-500 mb-2">Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.sources.map((source, idx) => (
                        <a
                          key={idx}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/50 rounded-lg text-xs text-slate-600 hover:bg-white/80 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length < 3 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => setInput(question)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your ward, meetings, or local issues..."
            className="flex-1 px-4 py-3 bg-slate-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
