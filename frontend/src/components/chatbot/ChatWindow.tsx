import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatHeader } from './ChatHeader'
import { ChatBody, type ChatMessageItem } from './ChatBody'
import { ChatInput } from './ChatInput'

interface ChatWindowProps {
  isOpen: boolean
  onClose: () => void
  messages: ChatMessageItem[]
  inputText: string
  onInputChange: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
  onSelectChip: (text: string) => void
  isLoadingPreview?: boolean
  scrollRef: React.RefObject<HTMLDivElement | null>
}

/**
 * ChatWindow Component
 * Notion AI / Linear style entrance animation (scale 0.96 -> 1, slide up, fade in 300ms spring).
 * Responsive layout: 380x620 desktop, 340px tablet, fullscreen mobile with safe-area support.
 * Pressing Escape closes the window.
 */
export const ChatWindow: React.FC<ChatWindowProps> = React.memo(({
  isOpen,
  onClose,
  messages,
  inputText,
  onInputChange,
  onSubmit,
  onSelectChip,
  isLoadingPreview = false,
  scrollRef,
}) => {
  // Listen for Escape key to close chat window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="betabuddy-chat-window"
          role="dialog"
          aria-label="BetaBuddy Assistant Window"
          aria-modal="true"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.96 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 24,
            duration: 0.3,
          }}
          className="fixed bottom-[92px] right-6 z-[9999] w-[380px] h-[620px] md:w-[340px] max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:bottom-0 max-sm:right-0 max-sm:rounded-none max-h-[calc(100vh-110px)] max-sm:max-h-full flex flex-col rounded-[24px] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25),0_0_0_1px_rgba(59,59,219,0.08)] overflow-hidden font-sans"
        >
          {/* Header */}
          <ChatHeader onClose={onClose} />

          {/* Body */}
          <ChatBody
            messages={messages}
            onSelectChip={onSelectChip}
            isLoadingPreview={isLoadingPreview}
            scrollRef={scrollRef}
          />

          {/* Input */}
          <ChatInput
            value={inputText}
            onChange={onInputChange}
            onSubmit={onSubmit}
            disabled={isLoadingPreview}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
})

ChatWindow.displayName = 'ChatWindow'
