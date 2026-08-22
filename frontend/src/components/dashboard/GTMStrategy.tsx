/**
 * GTMStrategy.tsx
 * Go-to-Market Strategy Section for the Executive Results Dashboard.
 * Displays Target Customer, Positioning, Value Proposition, Marketing Channels,
 * Customer Acquisition Strategy, Pricing Strategy, Launch Plan, and Next Steps.
 */
import { motion } from 'framer-motion'
import type { ValidationResult } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import {
  Compass,
  Target,
  Sparkles,
  Share2,
  UserPlus,
  Tag,
  Rocket,
  ArrowRightCircle,
  CheckCircle2,
} from 'lucide-react'

interface Props {
  data: ValidationResult
}

export function GTMStrategy({ data }: Props) {
  const gtm = data.goToMarketStrategy ?? {
    targetCustomer: 'Early adopters and high-intent customer segments.',
    positioning: 'Position as a targeted solution delivering immediate productivity gains.',
    valueProposition: 'Deliver clear ROI, low onboarding friction, and specialized feature depth.',
    marketingChannels: ['Social Media Marketing', 'Content Marketing', 'Direct Outreach', 'Strategic Partnerships'],
    customerAcquisitionStrategy: [
      'Identify priority early adopters',
      'Launch a targeted pilot program',
      'Collect feedback and refine core onboarding',
      'Expand acquisition into adjacent customer tiers',
    ],
    pricingStrategy: 'Tiered value-based subscription model optimized for initial user adoption.',
    launchPlan: [
      'Soft launch to beta waitlist users',
      'Gather retention metrics and testimonial case studies',
      'Public product announcement and full commercial launch',
    ],
    nextSteps: [
      'Finalize core positioning and landing page messaging',
      'Set up initial outreach and content marketing channels',
      'Kick off first customer pilot cohort',
    ],
  }

  return (
    <section id="gtm-strategy" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={Compass}
        overline="Market Launch"
        title="Go-to-Market Strategy"
        description="Actionable customer acquisition roadmap, channel distribution plan, positioning, and early launch steps."
      />

      {/* ── 1. Top Highlights Grid: Target Customer, Positioning, Value Prop ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Target Customer */}
        <motion.div
          {...fadeUp(0.04)}
          whileHover={{ y: -2 }}
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: RADIUS.md,
                backgroundColor: '#3b3bdb12',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Target size={18} color={C.accent} strokeWidth={2.2} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
              Target Customer
            </h3>
          </div>
          <p style={{ fontSize: '14px', color: C.secondary, lineHeight: '1.6', margin: 0 }}>
            {gtm.targetCustomer}
          </p>
        </motion.div>

        {/* Positioning */}
        <motion.div
          {...fadeUp(0.08)}
          whileHover={{ y: -2 }}
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: RADIUS.md,
                backgroundColor: '#3b3bdb12',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Compass size={18} color={C.accent} strokeWidth={2.2} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
              Positioning
            </h3>
          </div>
          <p style={{ fontSize: '14px', color: C.secondary, lineHeight: '1.6', margin: 0 }}>
            {gtm.positioning}
          </p>
        </motion.div>

        {/* Value Proposition */}
        <motion.div
          {...fadeUp(0.12)}
          whileHover={{ y: -2 }}
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: RADIUS.md,
                backgroundColor: '#3b3bdb12',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={18} color={C.accent} strokeWidth={2.2} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
              Value Proposition
            </h3>
          </div>
          <p style={{ fontSize: '14px', color: C.secondary, lineHeight: '1.6', margin: 0 }}>
            {gtm.valueProposition}
          </p>
        </motion.div>
      </div>

      {/* ── 2. Strategy Breakdown Grid: Channels, Acquisition, Pricing, Launch ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        {/* Marketing Channels */}
        <motion.div
          {...fadeUp(0.16)}
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Share2 size={18} color={C.accent} strokeWidth={2.2} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
              Marketing Channels
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(gtm.marketingChannels || []).map((channel, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13.5px',
                  color: C.primary,
                  backgroundColor: '#f8f9fe',
                  padding: '10px 14px',
                  borderRadius: RADIUS.md,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: C.accent,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 600 }}>{channel}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Customer Acquisition Strategy */}
        <motion.div
          {...fadeUp(0.20)}
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding: '24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus size={18} color={C.accent} strokeWidth={2.2} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
              Customer Acquisition Strategy
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(gtm.customerAcquisitionStrategy || []).map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  fontSize: '13.5px',
                  color: C.secondary,
                  lineHeight: '1.5',
                }}
              >
                <span
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: '#3b3bdb12',
                    color: C.accent,
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Pricing Strategy */}
        {gtm.pricingStrategy && (
          <motion.div
            {...fadeUp(0.24)}
            style={{
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS.xl,
              padding: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Tag size={18} color={C.accent} strokeWidth={2.2} />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
                Pricing Strategy
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: C.secondary, lineHeight: '1.6', margin: 0 }}>
              {gtm.pricingStrategy}
            </p>
          </motion.div>
        )}

        {/* Launch Plan */}
        {gtm.launchPlan && gtm.launchPlan.length > 0 && (
          <motion.div
            {...fadeUp(0.28)}
            style={{
              backgroundColor: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS.xl,
              padding: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Rocket size={18} color={C.accent} strokeWidth={2.2} />
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
                Launch Plan
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {gtm.launchPlan.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    fontSize: '13.5px',
                    color: C.secondary,
                    lineHeight: '1.5',
                  }}
                >
                  <span
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#3b3bdb12',
                      color: C.accent,
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── 3. Next Steps Roadmap ── */}
      {gtm.nextSteps && gtm.nextSteps.length > 0 && (
        <motion.div
          {...fadeUp(0.32)}
          style={{
            backgroundColor: '#f8f9fe',
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ArrowRightCircle size={19} color={C.accent} strokeWidth={2.2} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
              Immediate Next Steps
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {gtm.nextSteps.map((step, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: RADIUS.lg,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  fontSize: '13.5px',
                  color: C.primary,
                  lineHeight: '1.5',
                }}
              >
                <CheckCircle2 size={16} color="#16a34a" strokeWidth={2.2} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>{step}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </section>
  )
}
