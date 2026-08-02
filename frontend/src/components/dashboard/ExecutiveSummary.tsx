/**
 * ExecutiveSummary.tsx
 * Section 1 — Validation score ring + status badge + summary paragraph.
 */
import { motion } from 'framer-motion'
import type { ValidationResult } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'

interface Props {
  data: Pick<ValidationResult, 'validationScore' | 'status' | 'executiveSummary'>
}

/* ── Status badge colors ── */
const STATUS_STYLE: Record<ValidationResult['status'], { bg: string; color: string }> = {
  Strong:      { bg: '#dcfce7', color: '#16a34a' },
  Moderate:    { bg: '#dbeafe', color: C.accent    },
  'Needs Work':{ bg: '#fff7ed', color: '#ea580c' },
  Weak:        { bg: '#fee2e2', color: '#dc2626' },
}

/* ── SVG score ring ── */
function ScoreRing({ score, color }: { score: number; color: string }) {
  const R = 44
  const circ = 2 * Math.PI * R
  const offset = circ - (score / 100) * circ

  return (
    <svg width="112" height="112" viewBox="0 0 112 112" style={{ transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx="56" cy="56" r={R} fill="none" stroke="#e8e8f0" strokeWidth="8" />
      {/* Progress */}
      <motion.circle
        cx="56" cy="56" r={R}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
      />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════
   EXECUTIVE SUMMARY
═══════════════════════════════════════════════════════ */
export function ExecutiveSummary({ data }: Props) {
  const score = data.validationScore
  const badge = STATUS_STYLE[data.status] ?? STATUS_STYLE.Moderate
  const ringColor = score >= 75 ? '#22c55e' : score >= 50 ? C.accent : score >= 30 ? '#f97316' : '#ef4444'

  return (
    <motion.section
      id="executive-summary"
      {...fadeUp(0.05)}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.xl,
        padding: '36px',
        boxShadow: '0 4px 24px rgba(59,59,219,0.07)',
        display: 'flex',
        gap: '40px',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        fontFamily: FONT,
      }}
    >
      {/* Left: ring */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <ScoreRing score={score} color={ringColor} />
        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            style={{
              display: 'block',
              fontFamily: FONT,
              fontSize: '26px',
              fontWeight: 800,
              color: ringColor,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {score}
          </motion.span>
          <span style={{ fontSize: '10px', color: C.muted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            / 100
          </span>
        </div>
      </div>

      {/* Right: text */}
      <div style={{ flex: 1, minWidth: '220px' }}>
        {/* Section label */}
        <p
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: C.accent,
            marginBottom: '10px',
          }}
        >
          Executive Summary
        </p>

        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <h2
            style={{
              fontFamily: FONT,
              fontSize: 'clamp(22px, 2.6vw, 30px)',
              fontWeight: 800,
              color: C.primary,
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
            }}
          >
            Validation Result
          </h2>
          <span
            id="status-badge"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              background: badge.bg,
              color: badge.color,
              borderRadius: RADIUS.pill,
              padding: '4px 14px',
              letterSpacing: '0.03em',
            }}
          >
            {data.status}
          </span>
        </div>

        {/* Summary text */}
        <p
          style={{
            fontSize: '15px',
            color: C.secondary,
            lineHeight: '1.75',
            maxWidth: '600px',
          }}
        >
          {data.executiveSummary}
        </p>
      </div>
    </motion.section>
  )
}

export default ExecutiveSummary
