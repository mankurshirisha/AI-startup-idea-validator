/**
 * SWOTAnalysis.tsx
 * Section 6 — SWOT Analysis with progressive disclosure.
 * Shows top points by default with "View Details" toggle to reveal all points.
 * Displays overall risk level badge and actionable SWOT recommendations from the standalone SWOT Risk Agent.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ValidationResult, SWOTData } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'
import type { BadgeVariant } from './Badge'
import { Target, CheckCircle2, AlertTriangle, TrendingUp, ShieldAlert, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

interface Props {
  data: ValidationResult
}

export function SWOTAnalysis({ data }: Props) {
  const [expanded, setExpanded] = useState(false)

  const swot: SWOTData = data.swot ?? {
    strengths: ['Specialized vertical focus', 'AI automation speed', 'High gross margins'],
    weaknesses: ['Brand awareness gap', 'API dependency', 'CAC optimization needed'],
    opportunities: ['International expansion', 'Proprietary AI moat', 'Ecosystem partnerships'],
    threats: ['Incumbent feature expansion', 'AI model commoditization', 'Data privacy compliance'],
  }

  const overallRisk = data.overallRiskLevel
  const riskVariant: BadgeVariant =
    overallRisk === 'Low' ? 'success' : overallRisk === 'High' ? 'danger' : 'warning'

  const sections: Array<{
    title: string
    items: string[]
    icon: any
    color: string
    bg: string
    border: string
    tag: string
    variant: BadgeVariant
  }> = [
    {
      title: 'Strengths',
      items: swot.strengths,
      icon: CheckCircle2,
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      tag: 'Internal Advantage',
      variant: 'success',
    },
    {
      title: 'Weaknesses',
      items: swot.weaknesses,
      icon: AlertTriangle,
      color: '#b45309',
      bg: '#fffbeb',
      border: '#fde68a',
      tag: 'Internal Caution',
      variant: 'warning',
    },
    {
      title: 'Opportunities',
      items: swot.opportunities,
      icon: TrendingUp,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
      tag: 'External Growth',
      variant: 'info',
    },
    {
      title: 'Threats',
      items: swot.threats,
      icon: ShieldAlert,
      color: '#dc2626',
      bg: '#fff1f2',
      border: '#fecdd3',
      tag: 'External Risk',
      variant: 'danger',
    },
  ]

  return (
    <section id="swot-analysis" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={Target}
        overline="Strategic Evaluation"
        title="SWOT Analysis"
        description="Internal advantages & weaknesses paired with external market growth opportunities & threats."
        badge={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {overallRisk && (
              <Badge variant={riskVariant} size="sm">
                Risk: {overallRisk}
              </Badge>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#f4f4fc',
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.pill,
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 700,
                color: C.accent,
                cursor: 'pointer',
              }}
            >
              <span>{expanded ? 'Hide Details' : 'View Full SWOT Details'}</span>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {sections.map((sec, i) => {
          const Icon = sec.icon
          const visibleItems = expanded ? sec.items : sec.items.slice(0, 2)

          return (
            <motion.div
              key={sec.title}
              {...fadeUp(0.06 + i * 0.04)}
              whileHover={{ y: -1 }}
              style={{
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.xl,
                padding: '20px 22px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: RADIUS.md,
                      backgroundColor: sec.bg,
                      border: `1px solid ${sec.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={16} color={sec.color} strokeWidth={2.2} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
                    {sec.title}
                  </h3>
                </div>
                <Badge variant={sec.variant} size="sm">
                  {sec.tag}
                </Badge>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {visibleItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: C.secondary, lineHeight: '1.45' }}>
                    <span style={{ color: sec.color, fontWeight: 800, lineHeight: '1.2' }}>•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {!expanded && sec.items.length > 2 && (
                <div style={{ marginTop: '10px', fontSize: '11.5px', color: C.muted, fontWeight: 600 }}>
                  +{sec.items.length - 2} more points...
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* ── SWOT Strategic Recommendations ── */}
      {data.swotRecommendations && data.swotRecommendations.length > 0 && (
        <motion.div
          {...fadeUp(0.24)}
          style={{
            marginTop: '20px',
            backgroundColor: '#f8f9fe',
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding: '18px 22px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: RADIUS.md,
                backgroundColor: '#3b3bdb12',
                border: '1px solid #3b3bdb25',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={14} color={C.accent} strokeWidth={2.2} />
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: C.primary, margin: 0 }}>
              SWOT Strategic Recommendations
            </h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {data.swotRecommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  backgroundColor: '#ffffff',
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.lg,
                  padding: '12px 14px',
                  fontSize: '12.5px',
                  color: C.secondary,
                  lineHeight: '1.45',
                }}
              >
                <span
                  style={{
                    backgroundColor: C.accent,
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  {idx + 1}
                </span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </section>
  )
}

export default SWOTAnalysis
