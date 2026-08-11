import React from 'react'
import { motion } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'

import replyReadyImg from '@/assets/betabuddy/reply_ready.png'

interface ChatHeaderProps {
  onClose: () => void
}

/**
 * ChatHeader Component (UI v2)
 * Features frosted glass backdrop (`bg-slate-900/90 backdrop-blur-md`),
 * reply_ready.png mascot avatar with hover rotate effect, title, subtitle, and online status.
 */
export const ChatHeader: React.FC<ChatHeaderProps> = React.memo(({ onClose }) => {
  return (
    <div className="flex items-center justify-between px-4.5 py-3.5 bg-slate-900/90 backdrop-blur-md text-white border-b border-slate-800/80 select-none flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        {/* Avatar Container with reply_ready.png & hover rotate micro-interaction */}
        <div className="relative group cursor-pointer">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-slate-800/90 border border-slate-700/80 p-0.5 overflow-hidden flex-shrink-0 shadow-xs group-hover:rotate-6 transition-transform duration-200">
            <img
              src={replyReadyImg}
              alt="BetaBuddy Avatar"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900"></span>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-white tracking-tight leading-none">
              BetaBuddy
            </h3>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Startup Validation Assistant
          </p>
        </div>
      </div>

      <motion.button
        type="button"
        aria-label="Minimize BetaBuddy"
        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="p-1.5 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-600"
      >
        <X className="w-5 h-5" />
      </motion.button>
    </div>
  )
})

ChatHeader.displayName = 'ChatHeader'
