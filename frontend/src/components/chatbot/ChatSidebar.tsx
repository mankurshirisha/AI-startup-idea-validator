import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MessageSquare, Pencil, Trash2, Check, X } from 'lucide-react'
import type { ChatMessageItem } from './ChatBody'

export interface SavedConversation {
  id: string
  title: string
  messages: ChatMessageItem[]
  updatedAt: number
}

interface ChatSidebarProps {
  isOpen: boolean
  onCloseMobile: () => void
  conversations: SavedConversation[]
  activeChatId: string | null
  onSelectChat: (id: string) => void
  onNewChat: () => void
  onRenameChat: (id: string, newTitle: string) => void
  onDeleteChat: (id: string) => void
}

/** Memoized Conversation Row Component */
const ConversationRow: React.FC<{
  chat: SavedConversation
  isActive: boolean
  onSelect: () => void
  onRename: (newTitle: string) => void
  onDelete: () => void
}> = React.memo(({ chat, isActive, onSelect, onRename, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(chat.title)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const handleSaveRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== chat.title) {
      onRename(trimmed)
    } else {
      setEditTitle(chat.title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveRename()
    } else if (e.key === 'Escape') {
      setEditTitle(chat.title)
      setIsEditing(false)
    }
  }

  const latestMsg = chat.messages[chat.messages.length - 1]
  const timeStr = React.useMemo(() => {
    const d = new Date(chat.updatedAt)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [chat.updatedAt])

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        rowGap: '4px',
        columnGap: '8px',
        padding: '10px 12px',
        borderRadius: '12px',
        marginBottom: '4px',
        height: 'auto',
      }}
      className={`group relative cursor-pointer transition-all duration-200 select-none ${
        isActive
          ? 'bg-[#EEF2FF] dark:bg-slate-800 text-[#111827] dark:text-white border-l-4 border-l-[#5A67FF]'
          : 'hover:bg-[#F9FAFB] dark:hover:bg-slate-800/80 text-[#111827] dark:text-slate-200'
      }`}
    >
      {/* Row 1, Col 1: Title (font-size: 16px, font-weight: 600, color: #111827) */}
      <div style={{ gridColumn: '1 / 2' }} className="min-w-0 flex items-center gap-2">
        <MessageSquare
          className={`w-4 h-4 flex-shrink-0 ${
            isActive ? 'text-[#5A67FF]' : 'text-slate-400'
          }`}
        />
        {isEditing ? (
          <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-0.5 text-[14px] bg-white dark:bg-slate-900 border border-[#5A67FF] rounded text-[#111827] dark:text-white focus:outline-none font-medium"
            />
            <button
              type="button"
              onClick={handleSaveRename}
              className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditTitle(chat.title)
                setIsEditing(false)
              }}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <h4 className="text-[13.5px] font-medium text-[#111827] dark:text-white truncate leading-snug">
            {chat.title}
          </h4>
        )}
      </div>

      {/* Row 1, Col 2: Timestamp */}
      {!isEditing && (
        <span
          style={{ gridColumn: '2 / 3', alignSelf: 'start', whiteSpace: 'nowrap' }}
          className="text-[11px] text-[#9CA3AF] font-normal"
        >
          {timeStr}
        </span>
      )}

      {/* Row 2: Preview */}
      {!isEditing && latestMsg && (
        <p
          style={{ gridColumn: '1 / -1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          className="text-[12px] font-normal text-[#6B7280] dark:text-slate-400 leading-normal"
        >
          {latestMsg.text}
        </p>
      )}

      {/* Action icons on hover */}
      {!isEditing && (
        <div
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity bg-white/95 dark:bg-slate-800/95 p-1 rounded-lg shadow-2xs z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Rename conversation"
            onClick={() => setIsEditing(true)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Delete conversation"
            onClick={() => setShowConfirmDelete(true)}
            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {showConfirmDelete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-20 bg-white/97 dark:bg-slate-900/97 backdrop-blur-xs px-3 py-2.5 rounded-[12px] flex items-center justify-between border border-rose-200 dark:border-rose-900/50"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[12px] font-semibold text-rose-600 dark:text-rose-400 leading-none">
              Delete chat?
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onDelete}
                className="px-2.5 py-1 bg-rose-600 text-white text-[11px] font-semibold rounded-lg hover:bg-rose-700 cursor-pointer leading-none"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[11px] font-medium rounded-lg hover:bg-slate-200 cursor-pointer leading-none"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

export const ChatSidebar: React.FC<ChatSidebarProps> = React.memo(({
  isOpen,
  onCloseMobile,
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMobile}
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-xs z-20"
          />

          {/* Sidebar Drawer */}
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-[82px] bottom-0 left-0 z-30 w-[280px] bg-white dark:bg-slate-900 border-r border-[#F1F5F9] dark:border-slate-800 flex flex-col flex-shrink-0 select-none shadow-xl"
          >
            {/* Top Bar with + New Chat Button */}
            <div className="p-4 border-b border-[#F1F5F9] dark:border-slate-800 flex items-center gap-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNewChat}
                className="flex-1 h-11 px-4 rounded-full bg-[linear-gradient(135deg,#6C63FF,#5A67FF)] text-white text-sm font-medium shadow-[0_4px_14px_rgba(90,103,255,0.25)] hover:shadow-[0_6px_20px_rgba(90,103,255,0.35)] flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </motion.button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 p-3 overflow-y-auto space-y-1 custom-scrollbar">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-8">
                  <MessageSquare className="w-7 h-7 text-slate-300 dark:text-slate-600 mb-2.5" />
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                    No conversations yet.
                  </p>
                  <button
                    type="button"
                    onClick={onNewChat}
                    className="mt-3 text-[12px] font-semibold text-[#5A67FF] hover:underline cursor-pointer"
                  >
                    + Start a new chat
                  </button>
                </div>
              ) : (
                conversations.map((chat) => (
                  <ConversationRow
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === activeChatId}
                    onSelect={() => {
                      onSelectChat(chat.id)
                      onCloseMobile()
                    }}
                    onRename={(newTitle) => onRenameChat(chat.id, newTitle)}
                    onDelete={() => onDeleteChat(chat.id)}
                  />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})

ChatSidebar.displayName = 'ChatSidebar'
