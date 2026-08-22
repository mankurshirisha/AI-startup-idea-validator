import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatHeader } from './ChatHeader'
import { ChatBody, type ChatMessageItem } from './ChatBody'
import { ChatInput } from './ChatInput'
import { ChatSidebar, type SavedConversation } from './ChatSidebar'

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
  // Sidebar Props
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  conversations: SavedConversation[]
  activeChatId: string | null
  onSelectChat: (id: string) => void
  onNewChat: () => void
  onRenameChat: (id: string, newTitle: string) => void
  onDeleteChat: (id: string) => void
}

/**
 * ChatWindow Component
 * Notion AI / Linear style entrance animation (scale 0.96 -> 1, slide up, fade in 300ms spring).
 * Responsive layout with integrated ChatGPT-style Conversation History Sidebar (~280px).
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
  isSidebarOpen,
  onToggleSidebar,
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
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
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{
            duration: 0.2,
            ease: 'easeOut',
          }}
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            width: '420px',
            height: 'min(760px, calc(100vh - 48px))',
            maxHeight: 'calc(100vh - 48px)',
            maxWidth: 'calc(100vw - 32px)',
            zIndex: 9999,
          }}
          className="flex flex-col rounded-[28px] bg-white dark:bg-slate-900 border border-[#F1F5F9] dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden font-sans"
        >
          {/* Header (Fixed at top) */}
          <ChatHeader
            onClose={onClose}
            onToggleSidebar={onToggleSidebar}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Left History Sidebar (Absolute overlay drawer inside 400px popup) */}
          <ChatSidebar
            isOpen={isSidebarOpen}
            onCloseMobile={onToggleSidebar}
            conversations={conversations}
            activeChatId={activeChatId}
            onSelectChat={onSelectChat}
            onNewChat={onNewChat}
            onRenameChat={onRenameChat}
            onDeleteChat={onDeleteChat}
          />

          {/* Body (Scrollable message area) */}
          <ChatBody
            messages={messages}
            onSelectChip={onSelectChip}
            isLoadingPreview={isLoadingPreview}
            scrollRef={scrollRef}
          />

          {/* Input (Fixed at bottom) */}
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
