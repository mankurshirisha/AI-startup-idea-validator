/**
 * ExecutiveSummary.tsx
 * Hero Section — Executive Summary Banner with Score Gauge, Verdict Badge,
 * Verdict Rationale Explanation, & Metadata Badges.
 * Zero emojis.
 */
import { motion } from 'framer-motion'
import type { ValidationResult } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { Badge } from './Badge'
import type { BadgeVariant } from './Badge'
import { Sparkles, ShieldCheck, AlertCircle, MapPin, Building2, Rocket, Tag, Info } from 'lucide-react'

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

function getVerdictExplanation(score: number, idea: string, industry?: string): string {
  if (score >= 85) {
    return `This verdict reflects high market demand, strong software scalability, and low execution risk in the ${industry || 'target'} market. The primary advantage is clear product differentiation against existing solutions.`
  }
  if (score >= 70) {
    return `This verdict reflects strong market demand and software scalability, balanced against active competitor crowding in ${industry || 'the industry'}. Success depends on sharp positioning and fast onboarding.`
  }
  if (score >= 50) {
    return `This verdict indicates clear potential in target customer pain points, but identifies key risks in customer acquisition cost and incumbent feature overlap that require product refinement.`
  }
  return `This verdict highlights significant market risk and high incumbent dominance. The business model requires fundamental positioning changes before proceeding.`
}

function LargeScoreRing({ score, color }: { score: number; color: string }) {
  const R = 52
  const circ = 2 * Math.PI * R
  const offset = circ - (score / 100) * circ

  return (
    <svg width="132" height="132" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
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
        transition={{ duration: 1.2, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
      />
    </svg>
  )
}

export function ExecutiveSummary({ data }: Props) {
  const score = data.validationScore
  const verdictConfig = getVerdictBadgeConfig(score, data.verdict)
  const ringColor = getRingColor(score)
  const verdictExplanation = getVerdictExplanation(score, data.idea, data.industry || data.market?.industry)

  return (
    <motion.section
      id="executive-summary"
      {...fadeUp(0.04)}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.xl,
        padding: '28px 32px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        display: 'flex',
        gap: '32px',
        alignItems: 'center',
        flexWrap: 'wrap',
        fontFamily: FONT,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', backgroundColor: ringColor }} />

      {/* Left: Validation Score Ring & Caption */}
      <div style={{ position: 'relative', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <LargeScoreRing score={score} color={ringColor} />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.35 }}
              style={{
                fontFamily: FONT,
                fontSize: '36px',
                fontWeight: 800,
                color: ringColor,
                letterSpacing: '-0.05em',
                lineHeight: 1,
              }}
            >
              {score}
            </motion.span>
            <span style={{ fontSize: '12px', color: C.muted, fontWeight: 700, marginTop: '2px', lineHeight: 1 }}>
              /100
            </span>
          </div>
        </div>

        {/* Section title & helper caption below ring */}
        <div style={{ marginTop: '14px', textAlign: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: C.primary, margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Overall Score
          </h3>
          <p style={{ fontSize: '11px', color: C.muted, margin: 0, fontWeight: 500, lineHeight: 1.3 }}>
            Weighted average across 6 dimensions
          </p>
        </div>
      </div>

      {/* Right: Startup Name, Verdict, Verdict Explanation, Metadata & Executive Summary */}
      <div style={{ flex: 1, minWidth: '280px' }}>
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <Badge variant={verdictConfig.variant} icon={verdictConfig.icon} size="md">
            Verdict: {verdictConfig.title}
          </Badge>

          {data.industry && (
            <Badge variant="primary" icon={Building2} size="sm">
              {data.industry}
            </Badge>
          )}

          {data.targetCountry && (
            <Badge variant="neutral" icon={MapPin} size="sm">
              {data.targetCountry}
            </Badge>
          )}

          {data.startupStage && (
            <Badge variant="info" icon={Rocket} size="sm">
              {data.startupStage}
            </Badge>
          )}

          {data.businessModel && (
            <Badge variant="neutral" icon={Tag} size="sm">
              {data.businessModel}
            </Badge>
          )}
        </div>

        {/* Startup Name */}
        <h1
          style={{
            fontSize: 'clamp(20px, 2.4vw, 26px)',
            fontWeight: 800,
            color: C.primary,
            letterSpacing: '-0.03em',
            margin: '0 0 10px',
            lineHeight: '1.2',
            wordBreak: 'break-word',
          }}
        >
          {data.idea}
        </h1>

        {/* Verdict Explanation Box */}
        <div
          style={{
            backgroundColor: '#f8f9fe',
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.md,
            padding: '10px 14px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <Info size={15} color={C.accent} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '12.5px', color: C.primary, fontWeight: 600, lineHeight: '1.5', margin: 0 }}>
            <strong>Verdict Rationale:</strong> {verdictExplanation}
          </p>
        </div>

        {/* Concise Narrative */}
        <p
          style={{
            fontSize: '13.5px',
            color: C.secondary,
            lineHeight: '1.65',
            margin: 0,
            maxWidth: '720px',
          }}
        >
          {data.executiveSummary}
        </p>
      </div>
    </motion.section>
  )
}

export default ExecutiveSummary
