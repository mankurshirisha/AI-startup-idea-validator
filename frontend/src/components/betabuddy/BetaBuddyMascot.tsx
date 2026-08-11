import React, { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Bot } from 'lucide-react'

import helloImg from '@/assets/betabuddy/hello.png'
import analyzingImg from '@/assets/betabuddy/analyzing.png'
import replyReadyImg from '@/assets/betabuddy/reply_ready.png'

export type MascotState = 'hello' | 'analyzing' | 'reply_ready'

interface BetaBuddyMascotProps {
  state?: MascotState
  size?: number // Mascot image dimension (e.g. 36px launcher, 32px header, 28px chat message)
  className?: string
  showStatusDot?: boolean
}

const MASCOT_MAP: Record<MascotState, string> = {
  hello: helloImg,
  analyzing: analyzingImg,
  reply_ready: replyReadyImg,
}

/**
 * BetaBuddyMascot Component
 * Renders the state-mapped BetaBuddy mascot assets:
 *  - hello.png: Floating launcher (36px), Header (32px), Welcome screen, Idle state
 *  - analyzing.png: Active request / analyzing state (animated floating & pulse)
 *  - reply_ready.png: Completed response avatar beside messages & default after response
 *
 * Preserves PNG transparency, never stretches (object-fit: contain), uses circular container.
 * Respects prefers-reduced-motion.
 */
export const BetaBuddyMascot: React.FC<BetaBuddyMascotProps> = React.memo(({
  state = 'hello',
  size = 32,
  className = '',
  showStatusDot = false,
}) => {
  const [imgError, setImgError] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const currentImg = MASCOT_MAP[state] || helloImg

  // Motion variants according to mascot state requirement
  const getMotionProps = () => {
    if (shouldReduceMotion) {
      return {
        initial: { opacity: 1, scale: 1, y: 0 },
        animate: { opacity: 1, scale: 1, y: 0 },
      }
    }

    if (state === 'analyzing') {
      return {
        initial: { opacity: 0.9, scale: 0.96 },
        animate: {
          opacity: 1,
          y: [0, -4, 0],
          scale: [1, 1.04, 1],
        },
        transition: {
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }
    }

    if (state === 'reply_ready') {
      return {
        initial: { opacity: 0, scale: 0.88 },
        animate: { opacity: 1, scale: 1, y: 0 },
        transition: { duration: 0.25, ease: 'easeOut' },
      }
    }

    // Default 'hello' idle floating animation
    return {
      initial: { opacity: 1, y: 0 },
      animate: {
        y: [0, -3, 0],
      },
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    }
  }

  return (
    <div className={`relative flex items-center justify-center inline-flex ${className}`}>
      <motion.div
        {...getMotionProps()}
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center rounded-full bg-slate-100/90 dark:bg-slate-800/90 shadow-xs border border-indigo-100/80 dark:border-slate-700/60 overflow-hidden flex-shrink-0"
      >
        {!imgError ? (
          <img
            src={currentImg}
            alt={`BetaBuddy (${state})`}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            className="select-none pointer-events-none p-0.5"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-600 text-white">
            <Bot style={{ width: size * 0.6, height: size * 0.6 }} className="text-white" />
          </div>
        )}
      </motion.div>

      {showStatusDot && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 z-10">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border-2 border-white dark:border-slate-900"></span>
        </span>
      )}
    </div>
  )
})

BetaBuddyMascot.displayName = 'BetaBuddyMascot'
