import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Users, TrendingUp, ShieldAlert, Lightbulb, Star, Copy, Check, RotateCcw } from 'lucide-react'

import helloImg from '@/assets/betabuddy/hello.png'
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
  { label: 'Market Opportunity', icon: TrendingUp },
  { label: 'Business Risks', icon: ShieldAlert },
  { label: 'Recommendations', icon: Lightbulb },
  { label: 'Validation Score', icon: Star },
] as const

interface ChatBodyProps {
  messages: ChatMessageItem[]
  onSelectChip: (chipText: string) => void
  isLoadingPreview?: boolean
  scrollRef: React.RefObject<HTMLDivElement | null>
}

/** Helper Copy Button component for assistant messages */
const AssistantCopyButton: React.FC<{ text: string }> = React.memo(({ text }) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy response markdown"
      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer flex items-center gap-1 text-[11px] font-medium backdrop-blur-xs select-none"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-slate-500 dark:text-slate-400">Copy</span>
        </>
      )}
    </button>
  )
})

/** Helper function to parse inline markdown (bold, links, code) */
const parseInlineMarkdown = (text: string) => {
  if (!text) return null

  // Tokenize for code, bold, links
  const regex = /(`[^`]+`|\*\*.*?\*\*|\[.*?\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s)]+)/g
  const parts = text.split(regex)

  return parts.map((part, index) => {
    if (!part) return null

    // Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="bg-slate-200/80 dark:bg-slate-700 px-2 py-0.5 rounded-md font-mono text-[14px] text-indigo-700 dark:text-indigo-300"
        >
          {part.slice(1, -1)}
        </code>
      )
    }

    // Bold text: **bold**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-[#111827] dark:text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }

    // Markdown Link: [text](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/)
      if (match) {
        return (
          <a
            key={index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#5A67FF] hover:underline font-medium cursor-pointer"
          >
            {match[1]}
          </a>
        )
      }
    }

    // Raw Link: https://...
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#5A67FF] hover:underline font-medium cursor-pointer"
        >
          {part}
        </a>
      )
    }

    return part
  })
}

/** Helper component to format structured markdown answers into clean ChatGPT-style UI */
const FormattedMarkdownText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null

  // 1. Check for Code Blocks ```code```
  if (text.includes('```')) {
    const codeBlocks = text.split(/(```[\s\S]*?```)/g)
    return (
      <div className="space-y-2.5 text-[13px] font-normal leading-[1.6] tracking-normal font-sans text-[#1F2937] dark:text-slate-100">
        {codeBlocks.map((block, idx) => {
          if (block.startsWith('```') && block.endsWith('```')) {
            const lines = block.slice(3, -3).trim().split('\n')
            const firstLine = lines[0].trim()
            const isLang = /^[a-zA-Z0-9_-]+$/.test(firstLine)
            const codeContent = isLang ? lines.slice(1).join('\n') : lines.join('\n')

            return (
              <pre
                key={idx}
                className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[12px] overflow-x-auto my-2.5 border border-slate-800 shadow-xs custom-scrollbar"
              >
                <code>{codeContent}</code>
              </pre>
            )
          }
          return <FormattedMarkdownText key={idx} text={block} />
        })}
      </div>
    )
  }

  // 2. Standard Paragraph & Section Parsing
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: { text: string; num?: string }[] = []
  let isNumberedList = false

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return
    if (isNumberedList) {
      elements.push(
        <ol key={`${keyPrefix}-ol`} className="my-2 space-y-1.5 pl-4 list-decimal text-[13px] leading-[1.6]">
          {listItems.map((item, i) => (
            <li key={i} className="pl-0.5 leading-[1.6]">
              {parseInlineMarkdown(item.text)}
            </li>
          ))}
        </ol>
      )
    } else {
      elements.push(
        <ul key={`${keyPrefix}-ul`} className="my-2 space-y-1.5 pl-4 list-disc text-[13px] leading-[1.6]">
          {listItems.map((item, i) => (
            <li key={i} className="pl-0.5 leading-[1.6]">
              {parseInlineMarkdown(item.text)}
            </li>
          ))}
        </ul>
      )
    }
    listItems = []
    isNumberedList = false
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim()

    // Empty line -> flush list and add paragraph gap
    if (!trimmed) {
      flushList(`line-${i}`)
      elements.push(<div key={`gap-${i}`} className="h-1.5" />)
      return
    }

    // Heading Detection (#, ##, ###, or standalone section titles)
    const isMarkdownHeading = /^#{1,3}\s+/.test(trimmed)
    const isNamedHeading =
      /^(Summary|Recommendations|Strengths|Weaknesses|Pricing|Competitors|SWOT Analysis|Market Opportunity|Validation Score|Key Insights|Answer|Next Step):?$/i.test(
        trimmed
      )

    if (isMarkdownHeading || isNamedHeading) {
      flushList(`heading-${i}`)
      const headingText = trimmed.replace(/^#{1,3}\s+/, '').replace(/:$/, '')
      elements.push(
        <h4
          key={`h-${i}`}
          className="text-[13px] font-semibold text-[#111827] dark:text-white mt-4 mb-1.5 leading-snug tracking-tight"
        >
          {headingText}
        </h4>
      )
      return
    }

    // Blockquote line (> text)
    if (trimmed.startsWith('> ')) {
      flushList(`quote-${i}`)
      const quoteText = trimmed.replace(/^>\s*/, '')
      elements.push(
        <blockquote
          key={`q-${i}`}
          className="border-l-4 border-[#5A67FF]/40 pl-3 py-1 my-2 text-[#4B5563] dark:text-slate-300 italic bg-slate-50/60 dark:bg-slate-800/40 rounded-r-lg"
        >
          {parseInlineMarkdown(quoteText)}
        </blockquote>
      )
      return
    }

    // Numbered list item (e.g. 1. , 2. )
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/)
    if (numberedMatch) {
      if (listItems.length > 0 && !isNumberedList) flushList(`num-switch-${i}`)
      isNumberedList = true
      listItems.push({ text: numberedMatch[2], num: numberedMatch[1] })
      return
    }

    // Bullet list item (- , * , • )
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/)
    if (bulletMatch) {
      if (listItems.length > 0 && isNumberedList) flushList(`bullet-switch-${i}`)
      isNumberedList = false
      listItems.push({ text: bulletMatch[1] })
      return
    }

    // Regular Paragraph line
    flushList(`p-before-${i}`)
    elements.push(
      <p key={`p-${i}`} className="mb-2 last:mb-0 leading-[1.6]">
        {parseInlineMarkdown(trimmed)}
      </p>
    )
  })

  flushList('final')

  return (
    <div className="text-[13px] font-normal leading-[1.6] tracking-normal font-sans text-[#1F2937] dark:text-slate-100 break-words">
      {elements}
    </div>
  )
}

/** Helper component to stream assistant responses chunk-by-chunk for ChatGPT-style reveal */
const StreamingAssistantMessage: React.FC<{
  fullText: string
  isLatest: boolean
  scrollRef?: React.RefObject<HTMLDivElement | null>
}> = React.memo(({ fullText, isLatest, scrollRef }) => {
  const [displayedText, setDisplayedText] = React.useState(isLatest ? '' : fullText)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  React.useEffect(() => {
    // Non-latest (past turns) display instantly
    if (!isLatest) {
      setDisplayedText(fullText)
      return
    }

    setDisplayedText('')
    let currentIndex = 0
    const chunkSize = 25 // ~20-35 chars per tick
    const intervalMs = 45 // ~40-60ms tick

    intervalRef.current = setInterval(() => {
      currentIndex += chunkSize
      if (currentIndex >= fullText.length) {
        setDisplayedText(fullText)
        if (intervalRef.current) clearInterval(intervalRef.current)
      } else {
        setDisplayedText(fullText.slice(0, currentIndex))
      }

      // Smooth auto scroll following typing
      if (scrollRef && scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }
    }, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fullText, isLatest, scrollRef])

  return <FormattedMarkdownText text={displayedText} />
})

/**
 * ChatBody Component
 * Minimal, modern SaaS chat interface matching exact reference image:
 * - 20px vertical spacing between messages
 * - User bubble max-width 72%, gradient #6C63FF -> #5A67FF, 26px radius, 18px 22px padding, soft shadow
 * - Bot bubble max-width 72%, pastel gradient #F6F2FF -> #E8F5FF, 26px radius, 18px 22px padding, dark text
 * - 40px circular bot avatar top-left aligned with first line of text (no user avatar)
 * - 16px font-size, 500 font-weight, 1.6 line-height typography
 * - Non-overlapping 11px #9CA3AF timestamps directly below bubbles
 * - 6px upward translate + fade-in animation (250ms ease-out)
 */
export const ChatBody: React.FC<ChatBodyProps> = React.memo(({
  messages,
  onSelectChip,
  isLoadingPreview = false,
  scrollRef,
}) => {
  // Find latest user message to handle regenerate action
  const lastUserMsg = React.useMemo(() => {
    return [...messages].reverse().find((m) => m.sender === 'user')
  }, [messages])

  // Smooth auto-scroll to bottom whenever messages update or loading state toggles
  useEffect(() => {
    if (scrollRef && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [messages, isLoadingPreview, scrollRef])

  return (
    <div
      ref={scrollRef}
      aria-live="polite"
      style={{ overflowY: 'auto' }}
      className="flex-1 px-4 pt-4 pb-4 bg-white dark:bg-slate-900 custom-scrollbar"
    >
      <div
        style={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: messages.length === 0 ? 'center' : 'flex-end',
          overflow: 'visible',
        }}
        className="space-y-[14px]"
      >
        {/* ── EMPTY STATE WELCOME SCREEN (BEFORE FIRST MESSAGE) ── */}
      {messages.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex flex-col items-center justify-start py-6 px-2 text-center select-none"
        >
          {/* Welcome Illustration */}
          <div className="w-24 h-24 mb-3 flex items-center justify-center flex-shrink-0">
            <motion.img
              src={helloImg}
              alt="BetaBuddy Avatar"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-24 h-24 object-contain"
            />
          </div>

          {/* Welcome Heading */}
          <h3 className="text-[20px] font-bold tracking-tight text-[#111827] dark:text-white font-sans mb-1 leading-tight">
            Welcome to BetaBuddy
          </h3>

          {/* Subtitle */}
          <p className="text-[13px] text-[#6B7280] dark:text-slate-300 max-w-[300px] mx-auto leading-relaxed mb-4 font-normal">
            Your AI Startup Validation Assistant
          </p>

          {/* 4 Feature Cards (2 Columns) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '10px',
              width: '100%',
              maxWidth: '340px',
              marginBottom: '16px',
            }}
          >
            {[
              { title: 'Startup Validation', icon: '📊' },
              { title: 'Competitor Analysis', icon: '🏆' },
              { title: 'Pricing Strategy', icon: '💰' },
              { title: 'Market Opportunity', icon: '📈' },
            ].map((card, idx) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.04 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectChip(card.title)}
                style={{ minWidth: 0 }}
                className="p-2.5 rounded-[14px] bg-white dark:bg-slate-800 border border-[#EEF2F7] dark:border-slate-700 shadow-2xs flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-[180ms] hover:border-[#D6DAFF]"
              >
                <span className="text-lg mb-1 leading-none">{card.icon}</span>
                <span className="text-[11.5px] font-semibold text-[#111827] dark:text-slate-100 leading-snug">
                  {card.title}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Try Asking Section */}
          <div className="w-full max-w-[340px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B7280] dark:text-slate-400 mb-2 text-center">
              Try asking:
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {[
                'Validate my startup idea',
                'Who are my competitors?',
                'Recommend a pricing model',
                'Is my idea scalable?',
              ].map((question, idx) => (
                <motion.button
                  key={question}
                  type="button"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelectChip(question)}
                  style={{ minWidth: 0, maxWidth: '100%' }}
                  className="h-7 px-3 rounded-full text-[11.5px] font-medium text-[#374151] dark:text-slate-200 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 shadow-2xs hover:bg-[#EEF2FF] hover:border-[#5A67FF] hover:text-[#5A67FF] transition-all duration-200 cursor-pointer"
                >
                  {question}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

        {/* ── DATE SEPARATOR WITH THIN SIDE LINES ── */}
        {messages.length > 0 && (
          <div className="flex items-center gap-4 my-4 w-full select-none">
            <div className="h-[1px] bg-[#E5E7EB] dark:bg-slate-800 flex-1" />
            <span className="text-[12px] font-medium text-[#9CA3AF] flex-shrink-0">Today</span>
            <div className="h-[1px] bg-[#E5E7EB] dark:bg-slate-800 flex-1" />
          </div>
        )}

        {/* ── MESSAGE BUBBLES — MATCHING REFERENCE IMAGE ── */}
        {messages.map((msg, index) => {
          const isUser = msg.sender === 'user'
          const isLatestAssistant = !isUser && index === messages.length - 1
          const isError =
            !isUser &&
            (msg.text.toLowerCase().includes('failed') ||
              msg.text.toLowerCase().includes('error') ||
              msg.text.toLowerCase().includes('unable to'))

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '20px',
                overflow: 'visible',
              }}
              className={`group ${isUser ? 'items-end' : 'items-start'}`}
            >
              {/* Message Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  width: '100%',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  overflow: 'visible',
                  minWidth: 0,
                }}
              >
                {!isUser && (
                  /* Bot Avatar: 32px circle */
                  <div
                    style={{
                      flexShrink: 0,
                      width: '32px',
                      height: '32px',
                      overflow: 'hidden',
                    }}
                    className="rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-0.5 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.06)] mt-0.5 select-none"
                  >
                    <img
                      src={replyReadyImg}
                      alt="BetaBuddy Avatar"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Bubble Wrapper */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    maxWidth: isUser ? '80%' : 'calc(100% - 42px)',
                    flexShrink: 1,
                    position: 'relative',
                    overflow: 'visible',
                  }}
                  className="group/bubble"
                >
                  {isError ? (
                    /* System Warning Notification */
                    <div
                      style={{
                        display: 'block',
                        width: '100%',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        padding: '12px 14px',
                        lineHeight: '1.6',
                      }}
                      className="bg-[#FEF3C7] dark:bg-amber-950/40 border border-[#FDE68A] dark:border-amber-800/60 text-[#92400E] dark:text-amber-200 rounded-[18px] shadow-[0_6px_20px_rgba(0,0,0,0.05)] text-[13px] font-normal font-sans"
                    >
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#D97706] flex-shrink-0 mt-0.5" />
                        <div className="flex-1 break-words min-w-0">
                          <p className="font-semibold text-[13px] mb-0.5">System Notification</p>
                          <p className="text-[13px]">{msg.text}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Bubble */
                    <div
                      style={{
                        display: 'block',
                        width: '100%',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        padding: isUser ? '10px 14px' : '12px 14px',
                        lineHeight: '1.6',
                      }}
                      className={`font-normal font-sans tracking-normal border-none transition-all duration-200 ${
                        isUser
                          ? 'bg-[linear-gradient(135deg,#6C63FF,#5A67FF)] text-white rounded-[18px] rounded-br-sm shadow-[0_6px_20px_rgba(90,103,255,0.15)]'
                          : 'bg-[linear-gradient(135deg,#F6F2FF,#E8F5FF)] dark:bg-slate-800 text-[#1E293B] dark:text-slate-100 rounded-[18px] rounded-bl-sm shadow-[0_6px_20px_rgba(0,0,0,0.04)]'
                      }`}
                    >
                      {isUser ? (
                        <div
                          style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                          }}
                          className="text-white text-[13px] font-normal leading-[1.6]"
                        >
                          {msg.text}
                        </div>
                      ) : (
                        <div
                          style={{
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          <StreamingAssistantMessage
                            fullText={msg.text}
                            isLatest={isLatestAssistant}
                            scrollRef={scrollRef}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Copy Button for Assistant Messages */}
                  {!isUser && !isError && (
                    <div className="absolute top-2 right-2 z-10">
                      <AssistantCopyButton text={msg.text} />
                    </div>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <span
                className={`text-[11px] text-[#9CA3AF] dark:text-slate-400 mt-1 font-normal select-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                  isUser ? 'mr-1 text-right' : 'ml-[42px] text-left'
                }`}
              >
                {msg.timestamp}
              </span>

              {/* Regenerate Button */}
              {isLatestAssistant && !isLoadingPreview && lastUserMsg && (
                <div className="mt-1.5 ml-[42px]">
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onSelectChip(lastUserMsg.text)}
                    className="h-7 px-3 rounded-full text-[11.5px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 shadow-2xs hover:bg-[#EEF2FF] hover:border-[#5A67FF] hover:text-[#5A67FF] transition-all duration-200 flex items-center gap-1.5 cursor-pointer select-none"
                  >
                    <RotateCcw className="w-3 h-3 text-[#5A67FF]" />
                    <span>Regenerate response</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          )
        })}

        {/* ── AI THINKING / TYPING STATE ── */}
        <AnimatePresence mode="wait">
          {isLoadingPreview && (
            <motion.div
              key="thinking-indicator"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full flex flex-col items-start mb-[20px]"
            >
              <div className="flex items-start gap-2.5">
                {/* 32px Bot Avatar */}
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-0.5 flex-shrink-0 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.06)] mt-0.5 select-none overflow-hidden">
                  <img
                    src={replyReadyImg}
                    alt="BetaBuddy Avatar"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Thinking Bubble */}
                <div className="bg-[linear-gradient(135deg,#F6F2FF,#E8F5FF)] dark:bg-slate-800 text-[#6B7280] dark:text-slate-300 rounded-[18px] rounded-bl-sm shadow-[0_6px_20px_rgba(0,0,0,0.04)] px-4 py-3 text-[13px] font-sans font-normal leading-[1.6]">
                  <p className="text-[13px] text-[#6B7280] dark:text-slate-300 font-normal">
                    BetaBuddy is thinking...
                  </p>

                  {/* Animated Dots */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <motion.span
                      animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: 0 }}
                      className="w-1.5 h-1.5 rounded-full bg-[#5A67FF] inline-block"
                    />
                    <motion.span
                      animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: 0.23 }}
                      className="w-1.5 h-1.5 rounded-full bg-[#5A67FF] inline-block"
                    />
                    <motion.span
                      animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: 0.46 }}
                      className="w-1.5 h-1.5 rounded-full bg-[#5A67FF] inline-block"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

ChatBody.displayName = 'ChatBody'
