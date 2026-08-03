/**
 * Recommendations.tsx
 * Section 6 — Actionable Recommendations categorized into 6 specific buckets
 * with Execution Timelines (Immediate, Short Term, Medium Term, Long Term).
 * Zero emojis.
 */
import { motion } from 'framer-motion'
import type { ValidationResult, CategorizedRecommendation } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'
import type { BadgeVariant } from './Badge'
import { Briefcase, Zap, Rocket, Target, Clock, Layers, Award } from 'lucide-react'

interface Props {
  recommendations: string[]
  data?: ValidationResult
}

const CATEGORY_CONFIG: Record<
  string,
  {
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
    color: string
    bg: string
    border: string
    timeline: string
  }
> = {
  'Immediate Actions': { icon: Zap, color: '#d97706', bg: '#fef3c7', border: '#fde047', timeline: 'Immediate (0–3 Months)' },
  'Product Improvements': { icon: Rocket, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', timeline: 'Short Term (3–6 Months)' },
  'Business Strategy': { icon: Target, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', timeline: 'Medium Term (6–12 Months)' },
  'Go-to-Market Strategy': { icon: Layers, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', timeline: 'Short Term (3–6 Months)' },
  'Fundraising Readiness': { icon: Briefcase, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', timeline: 'Medium Term (6–12 Months)' },
  'Long-Term Growth': { icon: Award, color: '#dc2626', bg: '#fff1f2', border: '#fecdd3', timeline: 'Long Term (12+ Months)' },
}

function getPriorityBadge(priority: 'High' | 'Medium' | 'Strategic'): { label: string; variant: BadgeVariant } {
  switch (priority) {
    case 'High':
      return { label: 'High Priority', variant: 'danger' }
    case 'Strategic':
      return { label: 'Strategic Moat', variant: 'info' }
    default:
      return { label: 'Medium Priority', variant: 'warning' }
  }
}

export function Recommendations({ recommendations, data }: Props) {
  const categorized: CategorizedRecommendation[] = data?.categorizedRecommendations ?? [
    {
      category: 'Immediate Actions',
      priority: 'High',
      impact: 'High Impact',
      text: recommendations[0] || 'Launch a targeted waitlist landing page with an interactive ROI calculator to validate signups.',
      reasoning: 'Builds immediate early user interest and validates demand prior to full product launch.',
    },
    {
      category: 'Product Improvements',
      priority: 'High',
      impact: 'High Impact',
      text: recommendations[1] || 'Implement 1-click onboarding templates to minimize initial user setup friction.',
      reasoning: 'Reduces time-to-value for new users, directly increasing Day-1 retention rates.',
    },
    {
      category: 'Business Strategy',
      priority: 'Strategic',
      impact: 'Transformational',
      text: recommendations[2] || 'Offer tiered subscription plans with a free trial to lower acquisition barriers.',
      reasoning: 'Maximizes top-of-funnel conversions while establishing a clear upsell path for power users.',
    },
    {
      category: 'Go-to-Market Strategy',
      priority: 'High',
      impact: 'High Impact',
      text: 'Partner with industry micro-influencers and online communities for targeted launch exposure.',
      reasoning: 'Reaches high-intent target customers with trusted social proof at minimal CAC.',
    },
    {
      category: 'Fundraising Readiness',
      priority: 'Medium',
      impact: 'Transformational',
      text: 'Prepare a 10-slide pitch deck highlighting TAM expansion, retention metrics, and competitive moat.',
      reasoning: 'Positions the startup effectively for seed-stage angel and VC investor conversations.',
    },
    {
      category: 'Long-Term Growth',
      priority: 'Strategic',
      impact: 'Transformational',
      text: 'Build a proprietary dataset and fine-tuned AI pipeline to establish long-term defensibility.',
      reasoning: 'Ensures sustained competitive advantage and protects against commodity AI wrappers.',
    },
  ]

  return (
    <section id="recommendations" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={Briefcase}
        overline="Strategic Roadmap"
        title="Categorized Action Plan & Strategic Roadmap"
        description="Actionable recommendations categorized with execution timelines from immediate quick wins to long-term defensibility."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
        {categorized.map((item, i) => {
          const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG['Immediate Actions']
          const Icon = cfg.icon
          const pBadge = getPriorityBadge(item.priority)

          return (
            <motion.div
              key={item.category + i}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: RADIUS.sm,
                        backgroundColor: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} color={cfg.color} strokeWidth={2.2} />
                    </div>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: C.primary }}>
                      {item.category}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Badge variant={pBadge.variant} size="sm">
                      {pBadge.label}
                    </Badge>
                    {item.impact && (
                      <Badge variant="neutral" size="sm">
                        {item.impact}
                      </Badge>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: C.primary, fontWeight: 600, lineHeight: '1.55', margin: '0 0 8px' }}>
                  {item.text}
                </p>

                {item.reasoning && (
                  <p style={{ fontSize: '12px', color: C.secondary, lineHeight: '1.45', margin: 0, backgroundColor: '#f8f9fe', borderRadius: RADIUS.sm, padding: '8px 10px' }}>
                    <strong>Strategic Reasoning:</strong> {item.reasoning}
                  </p>
                )}
              </div>

              {/* Dynamic Recommendation Timeline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px', fontSize: '12px', fontWeight: 700, color: cfg.color }}>
                <Clock size={13} strokeWidth={2.5} />
                <span>Timeline: {cfg.timeline}</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default Recommendations
