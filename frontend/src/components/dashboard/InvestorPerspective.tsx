/**
 * InvestorPerspective.tsx
 * Section 7 — Investor Perspective cleanly structured without expand/collapse toggle.
 * Zero emojis.
 */
import { motion } from 'framer-motion'
import type { ValidationResult, InvestorPerspectiveData } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'
import { Briefcase, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react'

interface Props {
  data: ValidationResult
}

export function InvestorPerspective({ data }: Props) {
  const inv: InvestorPerspectiveData = data.investorPerspective ?? {
    interested: data.validationScore >= 65,
    verdictLabel: data.validationScore >= 75 ? 'Strong Seed-Stage Investor Appetite' : 'Conditional Investor Appetite',
    evidence: [
      `Operates in a growing ${data.market.industry || 'technology'} market valued at ${data.market.marketSize} (${data.market.growthRate} CAGR).`,
      'High software gross margins with scalable SaaS unit economics.',
      'Clear positioning opportunity against established market incumbents.',
    ],
    concerns: [
      'What is the long-term defensible moat against bigger tech players adding AI features?',
      'How quickly can the team achieve sustainable LTV/CAC ratios?',
      'Is there risk of API model dependency or unexpected cost spikes?',
    ],
  }

  return (
    <section id="investor-perspective" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={Briefcase}
        overline="VC & Investor Sentiment"
        title="Investor Perspective & Fundraising Feasibility"
        description="Evaluates early-stage venture capital interest, supporting evidence, and key diligence concerns."
        badge={
          <Badge variant={inv.interested ? 'success' : 'warning'} icon={TrendingUp}>
            {inv.verdictLabel}
          </Badge>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Evidence */}
        <motion.div
          {...fadeUp(0.08)}
          whileHover={{ y: -1 }}
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding: '22px 24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <CheckCircle2 size={16} color="#16a34a" strokeWidth={2.5} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
              Supporting Evidence for Investor Interest
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inv.evidence.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: C.secondary, lineHeight: '1.5' }}>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Diligence Concerns */}
        <motion.div
          {...fadeUp(0.12)}
          whileHover={{ y: -1 }}
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.xl,
            padding: '22px 24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertCircle size={16} color="#b45309" strokeWidth={2.5} />
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
              Key Diligence Questions & VC Concerns
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {inv.concerns.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: C.secondary, lineHeight: '1.5' }}>
                <span style={{ color: '#b45309', fontWeight: 800 }}>•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default InvestorPerspective
