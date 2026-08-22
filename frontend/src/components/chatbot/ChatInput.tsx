import React, { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Paperclip, Send } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  disabled?: boolean
}

const MAX_CHARS = 500

/**
 * ChatInput Component
 * Premium SaaS chat input area:
 * - 64px min height input bar with 32px border-radius, white background, 2px #F1F5F9 border, 0 8px 24px soft shadow
 * - 40x40px attachment button on left with #5A67FF indigo icon and #EEF2FF hover
 * - 48x48px circular send button with #6C63FF -> #5A67FF gradient, soft glow shadow, hover scale 1.05, tap scale 0.97
 * - Auto-expanding textarea (up to 4 lines, 100px max height) with Inter 16px 400 text
 * - 24px padding around input container
 */
export const ChatInput: React.FC<ChatInputProps> = React.memo(({
  value,
  onChange,
  onSubmit,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasText = Boolean(value.trim())

  // Auto-resize textarea up to 4 lines (~100px max-height)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, 100) // max 100px (~4 lines)
    el.style.height = `${newHeight}px`
  }, [value])

  // Keydown handler: Enter sends unless Shift is held
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (hasText && !disabled) {
        onSubmit(e as any)
      }
    }
  }

  // Handle Input Change capped at MAX_CHARS (500)
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (val.length <= MAX_CHARS) {
      onChange(val)
    }
  }

  return (
    <div className="px-4 pb-4 pt-2 bg-white dark:bg-slate-900 flex-shrink-0 select-none">
      <form onSubmit={onSubmit} className="w-full">
        {/* 64px min-height Input Pill Container */}
        <div className="relative min-h-[64px] flex items-center justify-between gap-3 px-3 py-2 bg-white dark:bg-slate-900 border-2 border-[#F1F5F9] dark:border-slate-800 rounded-[32px] shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-all duration-200 focus-within:border-[#6C63FF]/40 dark:focus-within:border-indigo-500/40">
          {/* Left Attachment Button (40x40px) */}
          <button
            type="button"
            aria-label="Add attachment"
            className="w-10 h-10 rounded-full bg-transparent hover:bg-[#EEF2FF] dark:hover:bg-indigo-950/40 text-[#5A67FF] dark:text-indigo-400 flex items-center justify-center flex-shrink-0 transition-colors duration-200 cursor-pointer focus:outline-none"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Center Auto-Expanding Textarea (16px Inter font) */}
          <div className="flex-1 flex items-center min-h-[40px] py-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your startup validation..."
              disabled={disabled}
              maxLength={MAX_CHARS}
              aria-label="Ask BetaBuddy about your startup validation"
              className="w-full text-[16px] font-normal leading-[1.5] font-sans text-[#111827] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-slate-500 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus:placeholder:opacity-70 transition-opacity resize-none max-h-[100px] overflow-y-auto custom-scrollbar disabled:opacity-50"
            />
          </div>

          {/* Right Send Button (48x48px Perfect Circle with Gradient & Glow Shadow) */}
          <motion.button
            type="submit"
            disabled={!hasText || disabled}
            whileHover={{ scale: hasText && !disabled ? 1.04 : 1 }}
            whileTap={{ scale: hasText && !disabled ? 0.96 : 1 }}
            className={`w-12 h-12 rounded-full bg-[linear-gradient(135deg,#6C63FF,#5A67FF)] text-white flex items-center justify-center flex-shrink-0 cursor-pointer transition-all duration-[180ms] focus:outline-none ${
              hasText && !disabled
                ? 'shadow-[0_6px_20px_rgba(90,103,255,0.35)] opacity-100'
                : 'shadow-none opacity-45 cursor-not-allowed'
            }`}
            aria-label="Send message"
          >
            <Send className="w-5 h-5 text-white ml-0.5" />
          </motion.button>
        </div>
      </form>
    </div>
  )
})

ChatInput.displayName = 'ChatInput'
