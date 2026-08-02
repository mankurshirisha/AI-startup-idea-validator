/**
 * MarketOpportunity.tsx
 * Section 3 — Market size, growth rate, industry, and trends.
 */
import { motion } from 'framer-motion'
import { TrendingUp, Globe, Layers, Zap } from 'lucide-react'
import type { MarketData } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'

interface Props {
  market: MarketData
}

/* ── Single stat tile ── */
function StatTile({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
  label: string
  value: string
  delay: number
}) {
  return (
    <motion.div
      {...fadeUp(delay)}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: RADIUS.md,
          background: C.accentSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={C.accent} strokeWidth={2} />
      </div>
      <div>
        <p style={{ fontSize: '10.5px', fontWeight: 700, color: C.muted, letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '4px' }}>
          {label}
        </p>
        <p style={{ fontSize: '18px', fontWeight: 800, color: C.primary, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {value}
        </p>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   MARKET OPPORTUNITY
═══════════════════════════════════════════════════════ */
export function MarketOpportunity({ market }: Props) {
  return (
    <section id="market-opportunity" style={{ fontFamily: FONT }}>
      {/* Section header */}
      <motion.div {...fadeUp(0.04)} style={{ marginBottom: '24px' }}>
        <p
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: C.accent,
            marginBottom: '8px',
          }}
        >
          Market Opportunity
        </p>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 'clamp(20px, 2.4vw, 26px)',
            fontWeight: 800,
            color: C.primary,
            letterSpacing: '-0.04em',
            lineHeight: 1.2,
          }}
        >
          Market analysis
        </h2>
      </motion.div>

      {/* 4 stat tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatTile icon={Globe}      label="Market Size"  value={market.marketSize}  delay={0.08} />
        <StatTile icon={TrendingUp} label="Growth Rate"  value={market.growthRate}  delay={0.13} />
        <StatTile icon={Layers}     label="Industry"     value={market.industry}     delay={0.18} />
        <StatTile
          icon={Zap}
          label="Key Trends"
          value={`${market.trends.length} identified`}
          delay={0.23}
        />
      </div>

      {/* Trends list */}
      {market.trends.length > 0 && (
        <motion.div
          {...fadeUp(0.28)}
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: RADIUS.lg,
            padding: '24px',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: C.primary,
              letterSpacing: '-0.01em',
              marginBottom: '16px',
            }}
          >
            Identified Trends
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {market.trends.map((trend, i) => (
              <li
                key={i}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}
              >
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: C.accentSoft,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  <TrendingUp size={10} color={C.accent} strokeWidth={2.5} />
                </span>
                <span style={{ fontSize: '14px', color: C.secondary, lineHeight: '1.6' }}>
                  {trend}
                </span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </section>
  )
}

export default MarketOpportunity
