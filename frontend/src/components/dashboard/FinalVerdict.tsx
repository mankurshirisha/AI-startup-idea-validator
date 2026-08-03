/**
 * FinalVerdict.tsx
 * Section — Final Executive Verdict & Proceed Decision
 * Uses existing design system & reusable UI components. Zero emojis.
 */
import { motion } from 'framer-motion'
import type { ValidationResult, FinalVerdictData } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'
import type { BadgeVariant } from './Badge'
import { Award, CheckCircle2, ArrowRight } from 'lucide-react'

interface Props {
  data: ValidationResult
}

function getVerdictBadge(decision: FinalVerdictData['decision']): { variant: BadgeVariant; icon: any } {
  switch (decision) {
    case 'Should Proceed':
      return { variant: 'success', icon: CheckCircle2 }
    case 'Proceed with Improvements':
      return { variant: 'primary', icon: Award }
    case 'Needs Significant Refinement':
      return { variant: 'warning', icon: Award }
    default:
      return { variant: 'danger', icon: Award }
  }
}

export function FinalVerdict({ data }: Props) {
  const fv: FinalVerdictData = data.finalVerdict ?? {
    decision:
      data.validationScore >= 85
        ? 'Should Proceed'
        : data.validationScore >= 70
        ? 'Proceed with Improvements'
        : data.validationScore >= 50
        ? 'Needs Significant Refinement'
        : 'Not Recommended Yet',
    rationale:
      `Based on multi-agent validation, "${data.idea}" shows a validation score of ${data.validationScore}/100. ` +
      `The market opportunity in ${data.market.industry || 'the domain'} is substantial (${data.market.marketSize}), and user demand signals are active. ` +
      `We recommend executing the prioritized roadmap—focusing first on MVP waitlist validation, product onboarding speed, and clear feature positioning.`,
  }

  const badgeConfig = getVerdictBadge(fv.decision)

  return (
    <section id="final-verdict" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={Award}
        overline="Executive Conclusion"
        title="Final Validation Verdict"
        description="Comprehensive summary judgment synthesizing market size, competition, and feasibility."
      />

      <motion.div
        {...fadeUp(0.08)}
        whileHover={{ y: -2 }}
        style={{
          backgroundColor: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.xl,
          padding: '32px',
          boxShadow: '0 4px 20px rgba(59,59,219,0.04)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>
              Final Strategic Decision
            </p>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: C.primary, margin: 0, letterSpacing: '-0.02em' }}>
              {fv.decision}
            </h3>
          </div>

          <Badge variant={badgeConfig.variant} icon={badgeConfig.icon} size="md">
            Verdict: {fv.decision}
          </Badge>
        </div>

        <p style={{ fontSize: '14.5px', color: C.secondary, lineHeight: '1.7', margin: 0, maxWidth: '800px' }}>
          {fv.rationale}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '20px', fontSize: '13px', fontWeight: 700, color: C.accent }}>
          <span>Next Recommended Step: Execute Immediate Actions Roadmap</span>
          <ArrowRight size={14} strokeWidth={2.5} />
        </div>
      </motion.div>
    </section>
  )
}

export default FinalVerdict
