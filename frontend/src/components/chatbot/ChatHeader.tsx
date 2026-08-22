import React from 'react'
import { motion } from 'framer-motion'
import { X, History } from 'lucide-react'

import replyReadyImg from '@/assets/betabuddy/reply_ready.png'

interface ChatHeaderProps {
  onClose: () => void
  onToggleSidebar?: () => void
  isSidebarOpen?: boolean
}

/**
 * ChatHeader Component
 * Clean, white header with ~82px height:
 * - 48x48 circular avatar with white background and soft shadow
 * - "BetaBuddy" (18px bold #111827) + Green status dot (8x8 #22C55E) + "Online" (14px font-500 #22C55E)
 * - Subtitle: "Startup Validation Assistant" (14px font-400 #6B7280)
 * - Sidebar History toggle button & Close X button
 */
export const ChatHeader: React.FC<ChatHeaderProps> = React.memo(({ onClose, onToggleSidebar, isSidebarOpen }) => {
  return (
    <div className="flex items-center justify-between h-[82px] px-6 py-[18px] bg-white dark:bg-slate-900 border-b border-[#F1F5F9] dark:border-slate-800 select-none flex-shrink-0 z-10">
      <div className="flex items-center gap-3.5">
        {/* Sidebar Toggle Button */}
        {onToggleSidebar && (
          <motion.button
            type="button"
            aria-label="Toggle Conversation History"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl border transition-colors cursor-pointer focus:outline-none ${
              isSidebarOpen
                ? 'bg-[#EEF2FF] border-[#5A67FF]/30 text-[#5A67FF]'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[#6B7280] hover:text-[#111827] dark:hover:text-white'
            }`}
            title="Conversation History"
          >
            <History className="w-5 h-5" />
          </motion.button>
        )}

        {/* 48x48 Circular Avatar with White Background & Soft Shadow */}
        <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-1 flex-shrink-0 flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden">
          <img
            src={replyReadyImg}
            alt="BetaBuddy Avatar"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex flex-col justify-center">
          {/* First line: BetaBuddy • Online */}
          <div className="flex items-center gap-2">
            <h3 className="text-[18px] font-bold text-[#111827] dark:text-white leading-tight">
              BetaBuddy
            </h3>
            <div className="flex items-center gap-1.5 ml-0.5">
              <span className="w-[8px] h-[8px] rounded-full bg-[#22C55E] inline-block flex-shrink-0" />
              <span className="text-[14px] font-medium text-[#22C55E] leading-tight">
                Online
              </span>
            </div>
          </div>

          {/* Second line: Startup Validation Assistant */}
          <p className="text-[14px] font-normal text-[#6B7280] dark:text-slate-400 leading-tight mt-0.5">
            Startup Validation Assistant
          </p>
        </div>
      </div>

      {/* Right side: 24x24 Close X Icon with #F3F4F6 hover */}
      <motion.button
        type="button"
        aria-label="Close BetaBuddy"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClose}
        className="p-2 rounded-full text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none"
      >
        <X className="w-6 h-6" />
      </motion.button>
    </div>
  )
})

ChatHeader.displayName = 'ChatHeader'
