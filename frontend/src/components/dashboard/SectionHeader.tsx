/**
 * SectionHeader.tsx
 * Standardized section header pattern for all dashboard sections.
 */
import React from 'react'
import { motion } from 'framer-motion'
import { C, FONT, RADIUS, fadeUp } from './tokens'

interface SectionHeaderProps {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
  overline?: string
  title: string
  description?: string
  badge?: React.ReactNode
  style?: React.CSSProperties
}

export function SectionHeader({
  icon: Icon,
  overline,
  title,
  description,
  badge,
  style,
}: SectionHeaderProps) {
  return (
    <motion.div {...fadeUp(0.04)} style={{ marginBottom: '22px', fontFamily: FONT, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: RADIUS.md,
              backgroundColor: C.accentSoft,
              border: `1px solid #3b3bdb18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={17} color={C.accent} strokeWidth={2.2} />
          </div>
          <div>
            {overline && (
              <p
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: C.accent,
                  margin: '0 0 2px',
                }}
              >
                {overline}
              </p>
            )}
            <h2
              style={{
                fontSize: 'clamp(19px, 2.2vw, 24px)',
                fontWeight: 800,
                color: C.primary,
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {title}
            </h2>
          </div>
        </div>

        {badge && <div>{badge}</div>}
      </div>

      {description && (
        <p
          style={{
            fontSize: '13.5px',
            color: C.secondary,
            lineHeight: '1.6',
            margin: 0,
            maxWidth: '720px',
          }}
        >
          {description}
        </p>
      )}
    </motion.div>
  )
}

export default SectionHeader
