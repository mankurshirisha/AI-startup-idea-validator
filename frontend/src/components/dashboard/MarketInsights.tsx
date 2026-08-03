/**
 * MarketInsights.tsx
 * Section 6 — Visual Cards for Market Trends, Customer Pain Points,
 * Growth Drivers, Market Risks, Government Regulations, & Investment Outlook.
 * Zero emojis.
 */
import { motion } from 'framer-motion'
import type { ValidationResult, MarketInsightsData } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { LineChart, TrendingUp, Flame, Rocket, AlertOctagon, Scale, Landmark } from 'lucide-react'

interface Props {
  data: ValidationResult
}

export function MarketInsights({ data }: Props) {
  const insights: MarketInsightsData = data.insights ?? {
    trends: data.market.trends,
    painPoints: [
      'Existing solutions are slow, expensive, and require manual data entry',
      'Lack of real-time intelligent recommendations tailored to specific workflows',
      'High friction during team collaboration and reporting exports',
    ],
    growthDrivers: [
      'Accelerating shift towards AI-first automated workflow solutions',
      'Growing enterprise willingness to pay for domain-specific AI tools',
      'High organic referral loops driven by measurable user time savings',
    ],
    risks: [
      'Customer churn risk if initial AI latency exceeds expectations',
      'Potential API cost scaling with rapid unmonetized user growth',
    ],
    regulations: [
      `Adherence to ${data.targetCountry || 'Global'} data privacy and SOC-2 standards`,
      'Strict user data residency, encryption, and AI governance protocols',
    ],
    investmentOutlook:
      'Venture capital activity in this sector remains strong. Investors favor platforms demonstrating clear ROI, high retention, and proprietary data network effects.',
  }

  const cards = [
    {
      id: 'trends',
      title: 'Market Trends',
      icon: TrendingUp,
      color: '#2563eb',
      bg: '#eff6ff',
      items: insights.trends.slice(0, 3),
    },
    {
      id: 'pain-points',
      title: 'Customer Pain Points',
      icon: Flame,
      color: '#ea580c',
      bg: '#fff7ed',
      items: insights.painPoints.slice(0, 3),
    },
    {
      id: 'growth-drivers',
      title: 'Growth Drivers',
      icon: Rocket,
      color: '#16a34a',
      bg: '#f0fdf4',
      items: insights.growthDrivers.slice(0, 3),
    },
    {
      id: 'risks',
      title: 'Market Risks',
      icon: AlertOctagon,
      color: '#dc2626',
      bg: '#fff1f2',
      items: insights.risks.slice(0, 2),
    },
    {
      id: 'regulations',
      title: 'Government Regulations',
      icon: Scale,
      color: '#7c3aed',
      bg: '#f5f3ff',
      items: insights.regulations.slice(0, 2),
    },
    {
      id: 'investment',
      title: 'Investment Outlook',
      icon: Landmark,
      color: '#0284c7',
      bg: '#f0f9ff',
      text: insights.investmentOutlook,
    },
  ]

  return (
    <section id="market-insights" style={{ fontFamily: FONT }}>
      {/* Standardized Section Header */}
      <SectionHeader
        icon={LineChart}
        overline="Intelligence Cards"
        title="Key Market Insights"
        description="Key market dynamics, customer friction, growth catalysts, and regulatory frameworks."
      />

      {/* Grid of Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '18px',
        }}
      >
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.id}
              {...fadeUp(0.06 + i * 0.04)}
              whileHover={{ y: -2 }}
              style={{
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.xl,
                padding: '24px',
                boxShadow: '0 4px 20px rgba(59,59,219,0.04)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: RADIUS.md,
                    backgroundColor: card.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={card.color} strokeWidth={2.2} />
                </div>
                <h3 style={{ fontSize: '15.5px', fontWeight: 800, color: C.primary, margin: 0 }}>
                  {card.title}
                </h3>
              </div>

              {/* Body */}
              {card.items ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {card.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        fontSize: '13px',
                        color: C.secondary,
                        lineHeight: '1.5',
                      }}
                    >
                      <span style={{ color: card.color, fontWeight: 800 }}>•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: C.secondary, lineHeight: '1.6', margin: 0 }}>
                  {card.text}
                </p>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default MarketInsights
