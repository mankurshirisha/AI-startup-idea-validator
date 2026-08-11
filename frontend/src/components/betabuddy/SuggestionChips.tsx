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
    <div className="mt-3 flex flex-wrap gap-2">
      {SUGGESTION_CHIPS.map((chip, idx) => {
        const Icon = chip.icon
        return (
          <motion.button
            key={chip.label}
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
            whileHover={{ scale: 1.02, backgroundColor: '#eeeffd' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectChip(chip.label)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-indigo-950 bg-[#f4f5fe] border border-[#e2e4f9] shadow-2xs transition-colors hover:border-indigo-300 text-left cursor-pointer"
          >
            <Icon className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
            <span>{chip.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
})

SuggestionChips.displayName = 'SuggestionChips'
