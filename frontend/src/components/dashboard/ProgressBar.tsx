/**
 * ProgressBar.tsx
 * Standardized progress bar for SaaS Analytics platform.
 */
import { motion } from 'framer-motion'
import { RADIUS } from './tokens'

interface ProgressBarProps {
  value: number // 0 to 100
  color?: string
  height?: number
  delay?: number
  style?: React.CSSProperties
}

export function ProgressBar({
  value,
  color = '#3b3bdb',
  height = 7,
  delay = 0.1,
  style,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        backgroundColor: '#eef2ff',
        borderRadius: RADIUS.pill,
        overflow: 'hidden',
        ...style,
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.9, delay, ease: 'easeOut' }}
        style={{
          height: '100%',
          backgroundColor: color,
          borderRadius: RADIUS.pill,
        }}
      />
    </div>
  )
}

export default ProgressBar
