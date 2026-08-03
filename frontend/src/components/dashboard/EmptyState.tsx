/**
 * EmptyState.tsx
 * Standardized empty state card placeholder.
 */
import React from 'react'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { C, FONT, RADIUS, fadeUp } from './tokens'

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
  title?: string
  message: string
  style?: React.CSSProperties
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title = 'No Data Available',
  message,
  style,
}: EmptyStateProps) {
  return (
    <motion.div
      {...fadeUp(0.08)}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.xl,
        padding: '36px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT,
        ...style,
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: '#f4f4fc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
        }}
      >
        <Icon size={20} color={C.muted} strokeWidth={2} />
      </div>
      <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: C.primary, margin: '0 0 4px' }}>
        {title}
      </h4>
      <p style={{ fontSize: '13px', color: C.secondary, margin: 0, maxWidth: '400px', lineHeight: 1.5 }}>
        {message}
      </p>
    </motion.div>
  )
}

export default EmptyState
