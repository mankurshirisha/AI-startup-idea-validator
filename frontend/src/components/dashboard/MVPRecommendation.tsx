/**
 * MVPRecommendation.tsx
 * MVP Feature Recommendation Section for the Executive Results Dashboard.
 * Displays MVP summary, overall strategy, prioritized initial MVP features (with market fit, customer value, resource effort, reason),
 * and deferred post-MVP features.
 */
import { motion } from 'framer-motion'
import type { ValidationResult } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'
import type { BadgeVariant } from './Badge'
import { Rocket, Layers, Clock, CheckCircle2, ChevronRight, Zap } from 'lucide-react'

interface Props {
  data: ValidationResult
}

export function MVPRecommendation({ data }: Props) {
  const mvp = data.mvp ?? {
    summary: 'Focus the initial MVP on essential core features that validate key customer pain points.',
    overallStrategy: 'Prioritize initial features with strong market fit while deferring secondary capabilities.',
    features: [
      {
        feature: 'Core Workflow Automation',
        priority: 'High',
        marketFit: 'High',
        customerValue: 'High',
        resourceEffort: 'Medium',
        reason: 'Essential for validating core startup problem-solution fit.',
        mvpPhase: 'Initial MVP',
      },
    ],
    deferredFeatures: ['Advanced Enterprise Analytics', 'Custom API Integrations'],
  }

  const initialFeatures = (mvp.features || []).filter(
    (f) => !f.mvpPhase || f.mvpPhase.toLowerCase().includes('initial') || f.mvpPhase === 'Initial MVP'
  )
  const deferredList = Array.from(
    new Set([
      ...(mvp.deferredFeatures || []),
      ...(mvp.features || [])
        .filter((f) => f.mvpPhase && (f.mvpPhase.toLowerCase().includes('post') || f.mvpPhase.toLowerCase().includes('deferred')))
        .map((f) => f.feature),
    ])
  )

  const priorityVariant = (p: string): BadgeVariant => {
    const l = p.toLowerCase()
    if (l === 'high') return 'danger'
    if (l === 'medium') return 'warning'
    return 'info'
  }

  const levelColor = (level?: string) => {
    const l = (level || '').toLowerCase()
    if (l === 'high') return '#16a34a'
    if (l === 'medium') return '#d97706'
    if (l === 'low') return '#64748b'
    return '#3b3bdb'
  }

  return (
    <section id="mvp-recommendation" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={Rocket}
        overline="Product Roadmap"
        title="MVP Feature Recommendations"
        description="Prioritized feature set for initial market validation alongside deferred post-MVP release roadmap."
        badge={
          <Badge variant="primary" size="sm">
            {initialFeatures.length} Core MVP Features
          </Badge>
        }
      />

      {/* ── 1. Strategy & Summary Hero Card ── */}
      <motion.div
        {...fadeUp(0.05)}
        style={{
          backgroundColor: '#f8f9fe',
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.xl,
          padding: '24px 28px',
          marginBottom: '20px',
          boxShadow: '0 2px 12px rgba(59,59,219,0.04)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Zap size={16} color={C.accent} strokeWidth={2.2} />
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                MVP Summary
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: C.secondary, lineHeight: '1.55', margin: 0 }}>
              {mvp.summary}
            </p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Layers size={16} color={C.accent} strokeWidth={2.2} />
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                Overall Strategy
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: C.secondary, lineHeight: '1.55', margin: 0 }}>
              {mvp.overallStrategy}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Recommended Initial MVP Features Grid ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: '4px 0 8px 2px' }}>
          Recommended Initial MVP Features
        </h3>

        {initialFeatures.map((item, idx) => (
          <motion.div
            key={idx}
            {...fadeUp(0.08 + idx * 0.04)}
            whileHover={{ y: -1 }}
            style={{
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS.xl,
              padding: '20px 24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Top Row: Feature Name + Priority Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#3b3bdb12',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={15} color={C.accent} strokeWidth={2.5} />
                </div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: C.primary, margin: 0 }}>
                  {item.feature}
                </h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant={priorityVariant(item.priority)} size="sm">
                  Priority: {item.priority}
                </Badge>
                <span style={{ fontSize: '11px', fontWeight: 700, color: C.accent, backgroundColor: '#3b3bdb0d', padding: '3px 10px', borderRadius: '100px' }}>
                  Initial MVP
                </span>
              </div>
            </div>

            {/* Metrics Chips: Market Fit, Customer Value, Resource Effort */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '10px 14px', backgroundColor: '#f8f9fe', borderRadius: RADIUS.lg, border: `1px solid ${C.border}` }}>
              {item.marketFit && (
                <div style={{ fontSize: '12px', color: C.secondary }}>
                  <span style={{ fontWeight: 700, color: C.primary }}>Market Fit: </span>
                  <span style={{ fontWeight: 800, color: levelColor(item.marketFit) }}>{item.marketFit}</span>
                </div>
              )}
              {item.customerValue && (
                <div style={{ fontSize: '12px', color: C.secondary }}>
                  <span style={{ fontWeight: 700, color: C.primary }}>Customer Value: </span>
                  <span style={{ fontWeight: 800, color: levelColor(item.customerValue) }}>{item.customerValue}</span>
                </div>
              )}
              {item.resourceEffort && (
                <div style={{ fontSize: '12px', color: C.secondary }}>
                  <span style={{ fontWeight: 700, color: C.primary }}>Resource Effort: </span>
                  <span style={{ fontWeight: 800, color: levelColor(item.resourceEffort) }}>{item.resourceEffort}</span>
                </div>
              )}
            </div>

            {/* Rationale / Reason */}
            <div style={{ fontSize: '13px', color: C.secondary, lineHeight: '1.5' }}>
              <span style={{ fontWeight: 700, color: C.primary }}>Reason: </span>
              {item.reason}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── 3. Deferred / Post-MVP Features Card ── */}
      {deferredList.length > 0 && (
        <motion.div
          {...fadeUp(0.25)}
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding: '22px 26px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: RADIUS.md,
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={16} color="#b45309" strokeWidth={2.2} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
                Deferred / Post-MVP Features
              </h3>
              <p style={{ fontSize: '12px', color: C.secondary, margin: 0 }}>
                Features postponed to future iterations after initial market validation
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
            {deferredList.map((feat, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f8f9fe',
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.lg,
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: C.secondary,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChevronRight size={14} color={C.muted} />
                  <span style={{ fontWeight: 600, color: C.primary }}>{feat}</span>
                </div>
                <Badge variant="neutral" size="sm">
                  Post-MVP
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </section>
  )
}

export default MVPRecommendation
