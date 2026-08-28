/**
 * DashboardHeader.tsx
 * Top-of-page header for the results dashboard.
 * Shows: startup idea title · validation score pill · date · Export PDF button.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Calendar, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { ValidationResult } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { generatePdfReport } from '@/utils/generatePdfReport'

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
  const [isGenerating, setIsGenerating] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleGenerateReport = async () => {
    if (isGenerating) return
    setIsGenerating(true)
    setFeedback(null)
    try {
      await generatePdfReport(data)
      setFeedback({ type: 'success', message: 'Report downloaded successfully' })
      setTimeout(() => setFeedback(null), 4000)
    } catch (err) {
      console.error('Failed to generate PDF report:', err)
      setFeedback({ type: 'error', message: 'Failed to generate PDF. Please try again.' })
      setTimeout(() => setFeedback(null), 5000)
    } finally {
      setIsGenerating(false)
    }
  }

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, position: 'relative' }}>
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

        {/* Feedback tooltip / status */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: RADIUS.md,
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                zIndex: 40,
                whiteSpace: 'nowrap',
              }}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 size={13} strokeWidth={2.5} />
              ) : (
                <AlertCircle size={13} strokeWidth={2.5} />
              )}
              <span>{feedback.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing Export PDF / Generate Report button */}
        <button
          id="export-pdf-btn"
          onClick={handleGenerateReport}
          disabled={isGenerating}
          title="Download complete executive PDF validation report"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '10px 20px',
            backgroundColor: isGenerating ? '#f1f5f9' : '#fafafa',
            border: `1.5px solid ${C.border}`,
            borderRadius: RADIUS.md,
            fontFamily: FONT,
            fontSize: '13.5px',
            fontWeight: 600,
            color: isGenerating ? C.muted : C.primary,
            cursor: isGenerating ? 'wait' : 'pointer',
            opacity: 1,
            letterSpacing: '-0.01em',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.backgroundColor = '#f4f4f8'
              e.currentTarget.style.borderColor = C.accent
              e.currentTarget.style.color = C.accent
            }
          }}
          onMouseLeave={(e) => {
            if (!isGenerating) {
              e.currentTarget.style.backgroundColor = '#fafafa'
              e.currentTarget.style.borderColor = C.border
              e.currentTarget.style.color = C.primary
            }
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 size={14} strokeWidth={2.5} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Download size={14} strokeWidth={2} />
              <span>Generate Report</span>
            </>
          )}
        </button>
      </div>
    </motion.header>
  )
}

export default DashboardHeader

