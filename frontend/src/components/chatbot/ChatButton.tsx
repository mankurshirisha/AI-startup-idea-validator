import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

import helloImg from '@/assets/betabuddy/hello.png'

interface ChatButtonProps {
  isOpen: boolean
  onClick: () => void
}

/**
 * ChatButton Component (UI v2)
 * Floating button with soft breathing, hover glow, shadow expansion,
 * and minimize morph transition.
 */
export const ChatButton: React.FC<ChatButtonProps> = React.memo(({ isOpen, onClick }) => {
  return (
    <motion.button
      type="button"
      aria-label={isOpen ? 'Minimize BetaBuddy Assistant' : 'Open BetaBuddy Assistant'}
      aria-expanded={isOpen}
      aria-controls="betabuddy-chat-window"
      onClick={onClick}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      className="fixed bottom-6 right-6 z-[9999] w-[60px] h-[60px] rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)] hover:shadow-[0_0_25px_rgba(59,59,219,0.35),0_15px_35px_-10px_rgba(15,23,42,0.3)] flex items-center justify-center cursor-pointer transition-all duration-300 ring-4 ring-indigo-500/10 focus:ring-indigo-500/30 focus:outline-none overflow-hidden group select-none"
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="minimize-icon"
            initial={{ rotate: -90, opacity: 0, scale: 0.8 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="text-slate-700 dark:text-slate-200 flex items-center justify-center"
          >
            <ChevronDown className="w-6 h-6 stroke-[2.5]" />
          </motion.div>
        ) : (
          <motion.div
            key="hello-mascot"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative flex items-center justify-center w-full h-full p-2.5"
          >
            {/* Breathing Animation with hello.png ONLY */}
            <motion.img
              src={helloImg}
              alt="BetaBuddy"
              animate={{
                y: [0, -3, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Active Status Pulse Dot */}
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
})

ChatButton.displayName = 'ChatButton'
