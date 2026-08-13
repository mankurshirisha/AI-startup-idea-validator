import React, { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, X } from 'lucide-react'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  disabled?: boolean
}

const MAX_CHARS = 500

/**
 * ChatInput Component (UI v2)
 * Features auto-expanding textarea, Enter to send, Shift+Enter for newlines,
 * character counter appearing after 350 chars (max 500), and send micro-interactions.
 */
export const ChatInput: React.FC<ChatInputProps> = React.memo(({
  value,
  onChange,
  onSubmit,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasText = Boolean(value.trim())
  const charLength = value.length

  // Auto-resize textarea up to 5 lines
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, 120) // max 120px (~5 lines)
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
    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
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
            className="w-full pl-3.5 pr-8 py-2 rounded-2xl text-xs bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium resize-none max-h-[120px] custom-scrollbar disabled:opacity-50"
          />

          {/* Character counter (Appears after 350 characters) */}
          {charLength > 350 && (
            <span className="absolute right-3 bottom-2 text-[10px] font-mono font-semibold text-amber-500 dark:text-amber-400 pointer-events-none">
              {charLength}/{MAX_CHARS}
            </span>
          )}

          {/* Clear Button */}
          {value && !disabled && charLength <= 350 && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Send Button Micro-interactions — Vertically Centered */}
        <motion.button
          type="submit"
          disabled={!hasText || disabled}
          whileHover={{ scale: hasText ? 1.05 : 1 }}
          whileTap={{ scale: hasText ? 0.95 : 1 }}
          className="p-2.5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </form>
    </div>
  )
})

ChatInput.displayName = 'ChatInput'
