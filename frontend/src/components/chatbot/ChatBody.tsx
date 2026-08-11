import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ShieldAlert, BarChart3, Users, CheckCircle2, Award } from 'lucide-react'

import helloImg from '@/assets/betabuddy/hello.png'
import analyzingImg from '@/assets/betabuddy/analyzing.png'
import replyReadyImg from '@/assets/betabuddy/reply_ready.png'

export interface ChatMessageItem {
  id: string
  sender: 'assistant' | 'user'
  text: string
  timestamp: string
}

export const SUGGESTION_CHIPS = [
  { label: 'Explain SWOT', icon: Sparkles },
  { label: 'Top Competitor', icon: Users },
  { label: 'Market Opportunity', icon: BarChart3 },
  { label: 'Business Risks', icon: ShieldAlert },
  { label: 'Recommendations', icon: CheckCircle2 },
  { label: 'Validation Score', icon: Award },
] as const

const THINKING_MESSAGES = [
  'Analyzing dashboard...',
  'Reviewing competitors...',
  'Preparing explanation...',
  'Almost ready...',
]

interface ChatBodyProps {
  messages: ChatMessageItem[]
  onSelectChip: (chipText: string) => void
  isLoadingPreview?: boolean
  scrollRef: React.RefObject<HTMLDivElement | null>
}

/**
 * ChatBody Component (UI v2)
 * Features avatar state isolation (hello.png welcome, reply_ready.png messages, analyzing.png thinking),
 * AI thinking message cycling every 1.8s, Lucide icon suggestion chips, and 220ms message entrance animations.
 */
export const ChatBody: React.FC<ChatBodyProps> = React.memo(({
  messages,
  onSelectChip,
  isLoadingPreview = false,
  scrollRef,
}) => {
  const [thinkingIndex, setThinkingIndex] = useState(0)

  // Cycle thinking messages every 1.8 seconds during loading preview
  useEffect(() => {
    if (!isLoadingPreview) {
      setThinkingIndex(0)
      return
    }

    const interval = setInterval(() => {
      setThinkingIndex((prev) => (prev + 1) % THINKING_MESSAGES.length)
    }, 1800)

    return () => clearInterval(interval)
  }, [isLoadingPreview])

  return (
    <div
      ref={scrollRef}
      aria-live="polite"
      className="flex-1 p-4 overflow-y-auto space-y-4 bg-gradient-to-b from-slate-50/60 via-white to-slate-50/60 dark:from-slate-900/60 dark:via-slate-900 dark:to-slate-900/60 custom-scrollbar"
    >
      {/* ── ONBOARDING CARD / EMPTY STATE (hello.png ONLY) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-800/80 dark:to-slate-900 border border-indigo-100/80 dark:border-slate-700/60 shadow-xs"
      >
        <div className="flex items-start gap-3.5">
          {/* Welcome Card Avatar: hello.png ONLY */}
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-1 border border-indigo-100 dark:border-slate-700 shadow-xs flex-shrink-0 flex items-center justify-center">
            <motion.img
              src={helloImg}
              alt="BetaBuddy Greeting"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full h-full object-contain"
            />
          </div>

          <div className="space-y-1 text-slate-800 dark:text-slate-100">
            <h4 className="text-sm font-extrabold tracking-tight text-indigo-950 dark:text-indigo-200">
              Hello, I'm BetaBuddy 👋
            </h4>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
              I help you understand the insights generated from your startup validation report.
            </p>
          </div>
        </div>

        {/* 6 Clickable Suggestion Chips (Lucide Icons ONLY, No Emojis) */}
        <div className="mt-3.5 pt-3 border-t border-indigo-100/60 dark:border-slate-700/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 mb-2">
            Suggested Dashboard Questions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTION_CHIPS.map((chip, idx) => {
              const Icon = chip.icon
              return (
                <motion.button
                  key={chip.label}
                  type="button"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  whileHover={{ y: -2, backgroundColor: 'rgba(238, 242, 255, 0.9)' }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onSelectChip(chip.label)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <span>{chip.label}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* ── MESSAGE BUBBLES ── */}
      {messages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={
            msg.sender === 'assistant'
              ? { opacity: 0, y: 10, scale: 0.97 }
              : { opacity: 0, x: 14 }
          }
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`flex flex-col ${
            msg.sender === 'user' ? 'items-end' : 'items-start'
          }`}
        >
          <div className="flex items-end gap-2 max-w-[88%]">
            {msg.sender === 'assistant' && (
              /* Completed Assistant Message Avatar: reply_ready.png ONLY with hover rotate */
              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 flex-shrink-0 flex items-center justify-center shadow-2xs mb-1 hover:rotate-6 transition-transform cursor-pointer">
                <img
                  src={replyReadyImg}
                  alt="BetaBuddy Reply"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div
              className={`px-4 py-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white rounded-[20px] rounded-tr-xs shadow-sm font-medium'
                  : 'bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-[20px] rounded-tl-xs shadow-2xs'
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1 font-medium">
            {msg.timestamp}
          </span>
        </motion.div>
      ))}

      {/* ── AI THINKING / TYPING STATE (analyzing.png ONLY) ── */}
      <AnimatePresence>
        {isLoadingPreview && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22 }}
            className="flex items-end gap-2 my-2"
          >
            {/* Analyzing Avatar: analyzing.png ONLY */}
            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 flex-shrink-0 flex items-center justify-center shadow-2xs mb-1">
              <motion.img
                src={analyzingImg}
                alt="BetaBuddy Thinking"
                animate={{ y: [0, -4, 0], scale: [1, 1.03, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-[20px] rounded-tl-xs shadow-2xs flex flex-col gap-1 min-w-[170px]">
              {/* Cycling Thinking Text */}
              <AnimatePresence mode="wait">
                <motion.span
                  key={THINKING_MESSAGES[thinkingIndex]}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.15 }}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400"
                >
                  {THINKING_MESSAGES[thinkingIndex]}
                </motion.span>
              </AnimatePresence>

              {/* Bouncing 3 Dots */}
              <div className="flex items-center gap-1.5 py-0.5">
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.1 }}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"
                />
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.2 }}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"
                />
                <motion.span
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.3 }}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

ChatBody.displayName = 'ChatBody'
