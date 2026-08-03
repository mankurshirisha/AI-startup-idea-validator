/**
 * SWOTAnalysis.tsx
 * Section 6 — SWOT Analysis with progressive disclosure.
 * Shows top points by default with "View Details" toggle to reveal all points.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ValidationResult, SWOTData } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'
import type { BadgeVariant } from './Badge'
import { Target, CheckCircle2, AlertTriangle, TrendingUp, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react'

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
    </section>
  )
}

export default SWOTAnalysis
