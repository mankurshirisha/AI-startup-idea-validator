/**
 * OverallScoreVerdict.tsx
 * Section 2 — Overall Score & Verdict
 * Prominent score ring & validation verdict as the primary focus.
 */
import { motion } from 'framer-motion'
import type { ValidationResult } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { Badge, BadgeVariant } from './Badge'
import { SectionHeader } from './SectionHeader'
import { Award, ShieldCheck, Sparkles, AlertCircle, ArrowRight } from 'lucide-react'

interface Props {
  data: ValidationResult
}

function getVerdictBadgeConfig(score: number, verdict?: string): { title: string; variant: BadgeVariant; icon: any } {
  if (score >= 85 || verdict === 'Excellent Opportunity') {
    return { title: 'Excellent Opportunity', variant: 'success', icon: ShieldCheck }
  }
  if (score >= 70 || verdict === 'Promising but Competitive') {
    return { title: 'Promising but Competitive', variant: 'primary', icon: Sparkles }
  }
  if (score >= 50 || verdict === 'Needs Refinement') {
    return { title: 'Needs Refinement', variant: 'warning', icon: AlertCircle }
  }
  return { title: 'High Risk', variant: 'danger', icon: AlertCircle }
}

function getRingColor(score: number): string {
  if (score >= 85) return '#16a34a'
  if (score >= 70) return C.accent
  if (score >= 50) return '#b45309'
  return '#dc2626'
}

function LargeScoreRing({ score, color }: { score: number; color: string }) {
  const R = 54
  const circ = 2 * Math.PI * R
  const offset = circ - (score / 100) * circ

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="#eef2ff" strokeWidth="10" />
      <motion.circle
        cx="70"
        cy="70"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.4, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
      />
    </svg>
  )
}

export function OverallScoreVerdict({ data }: Props) {
  const score = data.validationScore
  const verdictConfig = getVerdictBadgeConfig(score, data.verdict)
  const ringColor = getRingColor(score)
  const fv = data.finalVerdict

  return (
    <motion.section
      id="overall-score-verdict"
      {...fadeUp(0.06)}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.xl,
        padding: '32px 36px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        fontFamily: FONT,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: ringColor }} />

      <SectionHeader
        icon={Award}
        overline="Primary Evaluation"
        title="Overall Validation Score & Verdict"
        description="Core validation score output synthesized across AI agent research, market size, and competitive landscape."
      />

      <div style={{ display: 'flex', gap: '36px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Left: Score Gauge */}
        <div style={{ position: 'relative', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <LargeScoreRing score={score} color={ringColor} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              style={{ display: 'block', fontFamily: FONT, fontSize: '36px', fontWeight: 800, color: ringColor, letterSpacing: '-0.05em', lineHeight: 1 }}
            >
              {score}
            </motion.span>
            <span style={{ fontSize: '10px', color: C.muted, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              / 100 SCORE
            </span>
          </div>
        </div>

        {/* Right: Verdict Details */}
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <Badge variant={verdictConfig.variant} icon={verdictConfig.icon} size="md">
              Validation Verdict: {verdictConfig.title}
            </Badge>
            <Badge variant="neutral" size="sm">
              Status: {data.status}
            </Badge>
          </div>

          <p style={{ fontSize: '14px', color: C.secondary, lineHeight: '1.65', margin: '0 0 12px' }}>
            {fv?.rationale || `Based on AI agent evaluation, this idea achieves a validation score of ${score}/100.`}
          </p>

          {fv?.decision && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: ringColor }}>
              <span>Strategic Recommendation: {fv.decision}</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </div>
          )}
        </div>
      </div>
    </motion.section>
  )
}

export default OverallScoreVerdict
