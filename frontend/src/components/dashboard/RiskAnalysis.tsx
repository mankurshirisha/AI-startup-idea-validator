/**
 * RiskAnalysis.tsx
 * Section 9 — Risk Analysis Matrix with progressive disclosure.
 * Shows compact risk category level badges initially with "View Details" inline expansion.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ValidationResult, RiskItem } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'
import type { BadgeVariant } from './Badge'
import { ShieldAlert, Globe, Cpu, Rocket, DollarSign, Scale, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  data: ValidationResult
}

const RISK_ICONS: Record<string, any> = {
  'Market Risk': Globe,
  'Technical Risk': Cpu,
  'Execution Risk': Rocket,
  'Financial Risk': DollarSign,
  'Regulatory Risk': Scale,
}

function getRiskBadge(level: 'Low' | 'Medium' | 'High'): { label: string; variant: BadgeVariant } {
  switch (level) {
    case 'High':
      return { label: 'High Risk', variant: 'danger' }
    case 'Medium':
      return { label: 'Medium Risk', variant: 'warning' }
    default:
      return { label: 'Low Risk', variant: 'success' }
  }
}

export function RiskAnalysis({ data }: Props) {
  const [expanded, setExpanded] = useState(false)

  const risks: RiskItem[] = data.riskAnalysis ?? [
    {
      type: 'Market Risk',
      level: data.competitors.length > 3 ? 'Medium' : 'Low',
      explanation: `Market demand is verified, though competitive crowding in ${data.market.industry} requires sharp messaging.`,
    },
    {
      type: 'Technical Risk',
      level: 'Low',
      explanation: 'Built on established cloud infrastructure and proven LLM API capabilities.',
    },
    {
      type: 'Execution Risk',
      level: 'Medium',
      explanation: 'Requires disciplined GTM execution and continuous customer feedback iteration.',
    },
    {
      type: 'Financial Risk',
      level: data.validationScore >= 70 ? 'Low' : 'Medium',
      explanation: 'Requires careful management of API token costs relative to pricing subscription tiers.',
    },
    {
      type: 'Regulatory Risk',
      level: 'Low',
      explanation: 'Standard data privacy and SOC-2 compliance required for cloud operations.',
    },
  ]

  return (
    <section id="risk-analysis" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={ShieldAlert}
        overline="Risk Evaluation"
        title="Risk Analysis Matrix"
        description="Assesses critical risk categories across market crowding, technical complexity, and regulatory compliance."
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
            <span>{expanded ? 'Hide Risk Explanations' : 'View Risk Explanations'}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {risks.map((item, i) => {
          const Icon = RISK_ICONS[item.type] ?? ShieldAlert
          const badge = getRiskBadge(item.level)

          return (
            <motion.div
              key={item.type}
              {...fadeUp(0.06 + i * 0.04)}
              whileHover={{ y: -1 }}
              style={{
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.xl,
                padding: '18px 20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? '10px' : 0, flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: RADIUS.sm,
                        backgroundColor: C.accentSoft,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={14} color={C.accent} strokeWidth={2.2} />
                    </div>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: C.primary }}>
                      {item.type}
                    </span>
                  </div>

                  <Badge variant={badge.variant} size="sm">
                    {badge.label}
                  </Badge>
                </div>

                <AnimatePresence>
                  {expanded && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ fontSize: '12.5px', color: C.secondary, lineHeight: '1.5', margin: 0, borderTop: `1px solid ${C.border}`, paddingTop: '8px' }}
                    >
                      {item.explanation}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default RiskAnalysis
