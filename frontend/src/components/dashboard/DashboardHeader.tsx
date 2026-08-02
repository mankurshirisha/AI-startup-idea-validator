/**
 * DashboardHeader.tsx
 * Top-of-page header for the results dashboard.
 * Shows: startup idea title · validation score pill · date · Export PDF button.
 */
import { motion } from 'framer-motion'
import { Download, Calendar } from 'lucide-react'
import type { ValidationResult } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'

interface Props {
  data: ValidationResult
}

/* ── Score color helper ── */
function scoreColor(score: number): string {
  if (score >= 75) return '#22c55e'   // green
  if (score >= 50) return C.accent    // blue
  if (score >= 30) return C.orange    // orange
  return '#ef4444'                    // red
}

/* ── Format ISO date ── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

/* ═══════════════════════════════════════════════════════
   HEADER
═══════════════════════════════════════════════════════ */
export function DashboardHeader({ data }: Props) {
  const color = scoreColor(data.validationScore)

  return (
    <motion.header
      {...fadeUp(0)}
      style={{
        backgroundColor: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: '24px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        flexWrap: 'wrap',
        fontFamily: FONT,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Left: idea + meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
        {/* Overline */}
        <p
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: C.muted,
          }}
        >
          Validation Report
        </p>

        {/* Idea title */}
        <h1
          style={{
            fontFamily: FONT,
            fontSize: 'clamp(18px, 2.2vw, 24px)',
            fontWeight: 800,
            color: C.primary,
            letterSpacing: '-0.03em',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.idea}
        </h1>

        {/* Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={12} color={C.muted} strokeWidth={2} />
          <span style={{ fontSize: '12.5px', color: C.muted, fontWeight: 500 }}>
            {formatDate(data.createdAt)}
          </span>
        </div>
      </div>

      {/* Right: score + export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        {/* Score pill */}
        <div
          id="header-score"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: `${color}12`,
            border: `1px solid ${color}30`,
            borderRadius: RADIUS.pill,
            padding: '8px 18px',
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: '22px',
              fontWeight: 800,
              color,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}
          >
            {data.validationScore}
          </span>
          <div>
            <p style={{ fontSize: '9.5px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', lineHeight: 1, marginBottom: '3px' }}>
              Score
            </p>
            <p style={{ fontSize: '12px', fontWeight: 700, color, lineHeight: 1 }}>
              {data.status}
            </p>
          </div>
        </div>

        {/* Export PDF — disabled until backend is wired */}
        <button
          id="export-pdf-btn"
          disabled
          title="PDF export will be available after backend integration"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '10px 20px',
            backgroundColor: 'transparent',
            border: `1.5px solid ${C.border}`,
            borderRadius: RADIUS.md,
            fontFamily: FONT,
            fontSize: '13.5px',
            fontWeight: 600,
            color: C.muted,
            cursor: 'not-allowed',
            opacity: 0.55,
            letterSpacing: '-0.01em',
          }}
        >
          <Download size={14} strokeWidth={2} />
          Export PDF
        </button>
      </div>
    </motion.header>
  )
}

export default DashboardHeader
