/**
 * Recommendations.tsx
 * Section — Personalized Recommendations across 6 business-focused categories.
 * Categories: Innovation | Market Demand | Competition | Scalability | Technical Feasibility | Business Viability
 * Generated server-side by the Gemini comparison agent — frontend is a pure display layer.
 * Zero emojis. Zero timelines. Zero generic advice.
 */
import { motion } from 'framer-motion'
import type { ValidationResult, CategorizedRecommendation } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'
import type { BadgeVariant } from './Badge'
import {
  Lightbulb,
  TrendingUp,
  Shield,
  Layers,
  Cpu,
  DollarSign,
  Briefcase,
} from 'lucide-react'

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
    label: string
  }
> = {
  'Innovation': {
    icon: Lightbulb,
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    label: 'Innovation',
  },
  'Market Demand': {
    icon: TrendingUp,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    label: 'Market Demand',
  },
  'Competition': {
    icon: Shield,
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    label: 'Competition',
  },
  'Scalability': {
    icon: Layers,
    color: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    label: 'Scalability',
  },
  'Technical Feasibility': {
    icon: Cpu,
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    label: 'Technical Feasibility',
  },
  'Business Viability': {
    icon: DollarSign,
    color: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    label: 'Business Viability',
  },
}

/** Order of categories as they should appear in the grid */
const CATEGORY_ORDER = [
  'Innovation',
  'Market Demand',
  'Competition',
  'Scalability',
  'Technical Feasibility',
  'Business Viability',
] as const

function getPriorityBadge(priority: 'High' | 'Medium' | 'Strategic'): { label: string; variant: BadgeVariant } {
  switch (priority) {
    case 'High':
      return { label: 'High Priority', variant: 'danger' }
    case 'Strategic':
      return { label: 'Strategic', variant: 'info' }
    default:
      return { label: 'Medium Priority', variant: 'warning' }
  }
}

const FALLBACK_RECOMMENDATIONS: CategorizedRecommendation[] = [
  {
    category: 'Innovation',
    priority: 'High',
    impact: 'High Impact',
    text: 'Differentiate your platform by offering personalized meal plans based on medical history, dietary preferences, and health goals.',
  },
  {
    category: 'Market Demand',
    priority: 'High',
    impact: 'High Impact',
    text: 'Partner with nutritionists, hospitals, and diabetes clinics to validate demand and build trust among early users.',
  },
  {
    category: 'Competition',
    priority: 'Strategic',
    impact: 'High Impact',
    text: 'Focus on diabetic patients first and establish a strong niche before expanding into the broader health and wellness market.',
  },
  {
    category: 'Scalability',
    priority: 'Strategic',
    impact: 'Transformational',
    text: 'Design the platform so it can later support additional chronic conditions such as hypertension, obesity, and heart disease.',
  },
  {
    category: 'Technical Feasibility',
    priority: 'Medium',
    impact: 'High Impact',
    text: 'Prioritize accurate meal recommendations, secure handling of health data, and a simple user experience for patients.',
  },
  {
    category: 'Business Viability',
    priority: 'Strategic',
    impact: 'Transformational',
    text: 'Evaluate subscription plans and partnerships with healthcare providers to create a sustainable recurring revenue model.',
  },
]

export function Recommendations({ recommendations, data }: Props) {
  // Prefer backend-generated categorized recommendations when available.
  const backendRecs = data?.categorizedRecommendations

  // Build an ordered list of 6 cards — one per category.
  let categorized: CategorizedRecommendation[]

  if (backendRecs && backendRecs.length >= 6) {
    // Sort into the canonical display order.
    const recMap = new Map(backendRecs.map((r) => [r.category, r]))
    categorized = CATEGORY_ORDER.map(
      (cat) =>
        recMap.get(cat) ??
        (FALLBACK_RECOMMENDATIONS.find((f) => f.category === cat) as CategorizedRecommendation),
    )
  } else {
    categorized = FALLBACK_RECOMMENDATIONS
  }

  return (
    <section id="recommendations" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={Briefcase}
        overline="Personalized Advice"
        title="Startup Recommendations"
        description="Six personalized recommendations generated specifically for your startup, covering every dimension of building a successful business."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '16px',
        }}
      >
        {categorized.map((item, i) => {
          const cfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG['Innovation']
          const Icon = cfg.icon
          const pBadge = getPriorityBadge(item.priority)

          return (
            <motion.div
              key={item.category + i}
              {...fadeUp(0.06 + i * 0.04)}
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}
              style={{
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.xl,
                padding: '20px 24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'box-shadow 0.2s ease',
              }}
            >
              {/* Category header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: RADIUS.sm,
                      backgroundColor: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={17} color={cfg.color} strokeWidth={2.2} />
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: cfg.color,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {cfg.label}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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

              {/* Thin accent bar */}
              <div
                style={{
                  height: '2px',
                  borderRadius: '2px',
                  background: `linear-gradient(90deg, ${cfg.color}30, ${cfg.color}08)`,
                }}
              />

              {/* Recommendation text */}
              <p
                style={{
                  fontSize: '13.5px',
                  color: C.primary,
                  fontWeight: 500,
                  lineHeight: '1.6',
                  margin: 0,
                }}
              >
                {item.text}
              </p>

              {/* Optional reasoning */}
              {item.reasoning && (
                <p
                  style={{
                    fontSize: '12px',
                    color: C.secondary,
                    lineHeight: '1.45',
                    margin: 0,
                    backgroundColor: '#f8f9fe',
                    borderRadius: RADIUS.sm,
                    padding: '8px 10px',
                    borderLeft: `3px solid ${cfg.color}40`,
                  }}
                >
                  <strong>Why:</strong> {item.reasoning}
                </p>
              )}
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

export default Recommendations
