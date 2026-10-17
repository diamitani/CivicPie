'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, User, Loader2, FileText, AlertCircle } from 'lucide-react'
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
        ? "Hi! I'm CivicGuide. I can help with this ward's official contacts, neighborhood context, meeting channels, election basics, and ways to get involved. Ask anything."
        : "Hi! I'm CivicGuide. Ask me about Chicago wards, meetings, elections, city services, or how to get involved in your neighborhood.",
      timestamp: new Date().toISOString(),
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

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
    const prompt = input.trim()

    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          wardId,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to reach CivicGuide right now.')
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: payload.message,
          timestamp: new Date().toISOString(),
          sources: payload.sources ?? [],
        },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach CivicGuide right now.'
      setError(message)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I hit a connection issue just now. Please try again, or ask a more specific ward or meeting question so I can use the fallback civic data.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
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
          <p className="text-xs text-white/70">Source-backed civic assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-white/70">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
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
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                
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
