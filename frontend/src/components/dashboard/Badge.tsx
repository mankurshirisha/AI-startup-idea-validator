/**
 * Badge.tsx
 * Standardized reusable badge component for SaaS Analytics platform.
 */
import React from 'react'
import { FONT, RADIUS } from './tokens'

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
  size?: 'sm' | 'md'
  style?: React.CSSProperties
  id?: string
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  primary: { bg: '#3b3bdb0f', color: '#3b3bdb', border: '#3b3bdb25' },
  success: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  warning: { bg: '#fef3c7', color: '#b45309', border: '#fde047' },
  danger:  { bg: '#fff1f2', color: '#dc2626', border: '#fecdd3' },
  info:    { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  neutral: { bg: '#f4f4fc', color: '#5a5a8a', border: '#e8e8f0' },
}

export function Badge({
  children,
  variant = 'neutral',
  icon: Icon,
  size = 'md',
  style,
  id,
}: BadgeProps) {
  const v = VARIANT_STYLES[variant]
  const isSm = size === 'sm'

  return (
    <span
      id={id}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? '4px' : '6px',
        backgroundColor: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        borderRadius: RADIUS.pill,
        padding: isSm ? '2px 8px' : '4px 12px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: 700,
        fontFamily: FONT,
        letterSpacing: '-0.01em',
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {Icon && <Icon size={isSm ? 11 : 13} strokeWidth={2.5} color={v.color} />}
      {children}
    </span>
  )
}

export default Badge
