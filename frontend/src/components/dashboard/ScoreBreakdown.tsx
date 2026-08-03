/**
 * ScoreBreakdown.tsx
 * Section 2 — 6 Score Cards cleanly structured with equal height alignment.
 * Production UI Polish Pass. Zero emojis.
 */
import { motion } from 'framer-motion'
import type { ValidationResult, ScoreDimension } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { ProgressBar } from './ProgressBar'
import { BarChart3, Sparkles, TrendingUp, ShieldAlert, Zap, Cpu, DollarSign, Lightbulb } from 'lucide-react'

interface Props {
  data: ValidationResult
}

const DIMENSION_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>> = {
  innovation: Sparkles,
  'market-demand': TrendingUp,
  competition: ShieldAlert,
  scalability: Zap,
  'tech-feasibility': Cpu,
  'business-viability': DollarSign,
}

function getProgressColor(score: number): string {
  if (score >= 80) return '#16a34a'
  if (score >= 65) return C.accent
  if (score >= 50) return '#b45309'
  return '#dc2626'
}

export function ScoreBreakdown({ data }: Props) {
  const breakdown: ScoreDimension[] = data.scoreBreakdown ?? []

  return (
    <section id="score-breakdown" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={BarChart3}
        overline="Detailed Assessment"
        title="6-Dimensional Score Breakdown"
        description="Comprehensive score evaluation across strategic dimensions driving product viability."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
        {breakdown.map((item, i) => {
          const Icon = DIMENSION_ICONS[item.id] ?? Sparkles
          const barColor = getProgressColor(item.score)

          return (
            <motion.div
              key={item.id}
              {...fadeUp(0.06 + i * 0.04)}
              whileHover={{ y: -1 }}
              style={{
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.xl,
                padding: '20px 24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: RADIUS.md,
                        backgroundColor: C.accentSoft,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} color={C.accent} strokeWidth={2.2} />
                    </div>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0, letterSpacing: '-0.02em' }}>
                      {item.title}
                    </h3>
                  </div>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: barColor, letterSpacing: '-0.03em' }}>
                    {item.score}
                    <span style={{ fontSize: '11px', color: C.muted, fontWeight: 600 }}>/100</span>
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '12px' }}>
                  <ProgressBar value={item.score} color={barColor} height={6} delay={0.1 + i * 0.04} />
                </div>

                <p style={{ fontSize: '13px', color: C.secondary, lineHeight: '1.5', margin: '0 0 10px' }}>
                  {item.explanation}
                </p>

                {item.improvementSuggestion && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: C.accent, lineHeight: '1.4', backgroundColor: C.accentSoft, borderRadius: RADIUS.sm, padding: '6px 8px' }}>
                    <Lightbulb size={13} color={C.accent} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Recommendation:</strong> {item.improvementSuggestion}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default ScoreBreakdown
