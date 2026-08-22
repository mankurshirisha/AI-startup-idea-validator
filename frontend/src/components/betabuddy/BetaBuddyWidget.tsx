import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles } from 'lucide-react'
import axios from 'axios'
import { BetaBuddyMascot, type MascotState } from './BetaBuddyMascot'
import { SuggestionChips } from './SuggestionChips'
import { TypingIndicator } from './TypingIndicator'

export interface ChatMessage {
  id: string
  sender: 'assistant' | 'user'
  text: string
  timestamp: string
  mascotState?: MascotState
}

interface BetaBuddyWidgetProps {
  validationResult?: any
}

/**
 * BetaBuddyWidget Component
 * Modern enterprise-grade floating chatbot widget for BeforeBeta Dashboard.
 * Connected to the backend intelligence layer at `/api/betabuddy/chat`.
 */
export const BetaBuddyWidget: React.FC<BetaBuddyWidgetProps> = ({ validationResult }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [analyzingStatus, setAnalyzingStatus] = useState('Analyzing dashboard information...')

  // Session ID persisted per widget instance
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)

  // Initial welcome message
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hi! I'm BetaBuddy. 👋\n\nI can help you understand your startup analysis.\n\nYou can ask about:\n• SWOT analysis\n• Competitors\n• Market opportunity\n• Risks\n• Recommendations",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mascotState: 'reply_ready',
    },
  ])

  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [isOpen, messages, isTyping])

  // Populate input field when chip is clicked
  const handleSelectChip = useCallback((chipText: string) => {
    setInputText(chipText)
  }, [])

  // Handle Input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value)
  }

  // Handle User Message Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const question = inputText.trim()
    if (!question || isTyping) return

    // 1. Add User Message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputText('')
    setIsTyping(true)
    setAnalyzingStatus('Analyzing dashboard information...')

    try {
      // 2. Call Backend BetaBuddy Intelligence Endpoint
      const response = await axios.post('/api/betabuddy/chat', {
        sessionId,
        question,
        validationResult: validationResult || null,
      })

      const data = response.data || {}
      const answer = data.answer || "I couldn't find that information in your startup validation dashboard."

      // 3. Add Assistant Message with reply_ready mascot avatar
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'assistant',
        text: answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mascotState: 'reply_ready',
      }

      setMessages((prev) => [...prev, botMsg])
    } catch (err) {
      console.error('BetaBuddy chat error:', err)
      const errorMsg: ChatMessage = {
        id: `bot_err_${Date.now()}`,
        sender: 'assistant',
        text: "I couldn't find that information in your startup validation dashboard.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mascotState: 'reply_ready',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      {/* ── 1. FLOATING CIRCULAR BUTTON ── */}
      <motion.button
        type="button"
        aria-label={isOpen ? 'Close BetaBuddy Chat' : 'Open BetaBuddy Chat'}
        onClick={() => setIsOpen((prev) => !prev)}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '58px',
          height: '58px',
          zIndex: 9999,
        }}
        className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#3b3bdb] to-[#2563eb] text-white shadow-xl hover:shadow-2xl transition-all cursor-pointer ring-4 ring-indigo-500/20 focus:outline-none"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close-icon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="mascot-icon"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative flex items-center justify-center"
            >
              <BetaBuddyMascot state="hello" size={36} showStatusDot />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── 2. CHAT PANEL DRAWER ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            style={{
              position: 'fixed',
              bottom: '92px',
              right: '24px',
              width: '380px',
              height: '620px',
              maxHeight: 'calc(100vh - 110px)',
              maxWidth: 'calc(100vw - 32px)',
              zIndex: 9999,
              fontFamily: "'DM Sans', 'Inter', sans-serif",
            }}
            className="flex flex-col rounded-2xl bg-white/97 backdrop-blur-2xl border border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(26,26,46,0.22),0_0_0_1px_rgba(59,59,219,0.08)] overflow-hidden"
          >
            {/* ── HEADER ── */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/40">
              <div className="flex items-center gap-3">
                <BetaBuddyMascot state="hello" size={32} showStatusDot />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-extrabold text-white tracking-tight leading-none">
                      BetaBuddy
                    </h3>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      <Sparkles className="w-2.5 h-2.5 text-cyan-300" />
                      AI Companion
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                    Your BeforeBeta startup companion
                  </p>
                </div>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* ── CHAT BODY ── */}
            <div
              ref={chatScrollRef}
              className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-[#f8f9fe] via-white to-[#f8f9fe] custom-scrollbar"
            >
              {/* Messages Render */}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-end gap-2 max-w-[88%]">
                    {msg.sender === 'assistant' && (
                      <div className="flex-shrink-0 mb-1">
                        <BetaBuddyMascot
                          state={msg.mascotState || 'reply_ready'}
                          size={28}
                        />
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-[#3b3bdb] to-[#2563eb] text-white rounded-br-xs shadow-sm font-medium'
                          : 'bg-[#f0f2fd] border border-[#e4e6f8] text-slate-800 rounded-bl-xs shadow-2xs'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
                    {msg.timestamp}
                  </span>
                </motion.div>
              ))}

              {/* ── SUGGESTION CHIPS ── */}
              <div className="pt-2 border-t border-indigo-100/60">
                <p className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Click a suggestion to populate the prompt:
                </p>
                <SuggestionChips onSelectChip={handleSelectChip} />
              </div>

              {/* ── ANALYZING / TYPING INDICATOR ── */}
              <TypingIndicator visible={isTyping} statusText={analyzingStatus} />
            </div>

            {/* ── INPUT AREA ── */}
            <div className="p-3 bg-white border-t border-slate-100">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Ask about your startup report..."
                    disabled={isTyping}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium disabled:opacity-60"
                  />
                  {inputText && !isTyping && (
                    <button
                      type="button"
                      onClick={() => setInputText('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-[#3b3bdb] to-[#2563eb] text-white shadow-sm hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </form>
            </div>

            {/* ── FOOTER DISCLAIMER ── */}
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-medium">
                BetaBuddy answers only questions related to your BeforeBeta dashboard.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

BetaBuddyWidget.displayName = 'BetaBuddyWidget'
export default BetaBuddyWidget
