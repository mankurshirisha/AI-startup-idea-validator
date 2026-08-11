import React from 'react'
import { motion } from 'framer-motion'
import { BetaBuddyMascot } from './BetaBuddyMascot'

interface TypingIndicatorProps {
  visible?: boolean
  statusText?: string
}

/**
 * TypingIndicator Component
 * Renders BetaBuddy in the `analyzing` mascot state while processing the user's request.
 * Displays analyzing.png with breathing/floating animation and typing dots.
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = React.memo(({
  visible = true,
  statusText = 'Analyzing dashboard information...',
}) => {
  if (!visible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.2 }}
      className="flex items-end gap-2 my-2"
    >
      <div className="flex-shrink-0 mb-1">
        {/* State requirement: analyzing.png during request processing */}
        <BetaBuddyMascot state="analyzing" size={28} />
      </div>
      <div className="bg-[#f0f2fd] border border-[#e4e6f8] text-slate-700 px-3.5 py-2.5 rounded-2xl rounded-bl-xs shadow-xs flex flex-col gap-1">
        {statusText && (
          <span className="text-[10px] font-semibold text-indigo-700 tracking-tight">
            {statusText}
          </span>
        )}
        <div className="flex items-center gap-1.5 py-0.5">
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.1 }}
            className="w-2 h-2 rounded-full bg-indigo-500 inline-block"
          />
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.2 }}
            className="w-2 h-2 rounded-full bg-indigo-500 inline-block"
          />
          <motion.span
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.3 }}
            className="w-2 h-2 rounded-full bg-indigo-500 inline-block"
          />
        </div>
      </div>
    </motion.div>
  )
})

TypingIndicator.displayName = 'TypingIndicator'
