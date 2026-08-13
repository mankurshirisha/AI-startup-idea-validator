import React from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  ShieldAlert,
  BarChart3,
  Users,
  CheckCircle2,
  FileText,
} from 'lucide-react'

export const SUGGESTION_CHIPS = [
  { label: 'Explain my SWOT', icon: Sparkles },
  { label: 'Who is my biggest competitor?', icon: Users },
  { label: 'Summarize my report', icon: FileText },
  { label: 'Explain my risks', icon: ShieldAlert },
  { label: 'Show recommendations', icon: CheckCircle2 },
  { label: 'Explain my market opportunity', icon: BarChart3 },
] as const

interface SuggestionChipsProps {
  onSelectChip: (text: string) => void
}

/**
 * SuggestionChips Component
 * Displays six clickable prompt chips.
 * RULE: Clicking a chip ONLY populates the text input field.
 * It does NOT send any message or call any API.
 */
export const SuggestionChips: React.FC<SuggestionChipsProps> = React.memo(({ onSelectChip }) => {
  return (
    <div className="mt-3.5 flex flex-wrap gap-2">
      {SUGGESTION_CHIPS.map((chip, idx) => {
        const Icon = chip.icon
        return (
          <motion.button
            key={chip.label}
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
            whileHover={{ y: -1.5, scale: 1.02, backgroundColor: 'rgba(238, 242, 255, 0.95)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelectChip(chip.label)}
            className="h-8 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all cursor-pointer whitespace-nowrap overflow-hidden"
          >
            <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="truncate">{chip.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
})

SuggestionChips.displayName = 'SuggestionChips'
