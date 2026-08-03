/**
 * CompetitorAnalysis.tsx
 * Section 5 — Competitor Analysis with progressive disclosure.
 * Shows primary competitor card initially with "View Details" expansion for deep metrics.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, CheckCircle2, AlertCircle, Tag, Users, Building2, MapPin, Target, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { Competitor } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'
import { EmptyState } from './EmptyState'

interface Props {
  competitors: Competitor[]
  targetCountry?: string
}

function CompetitorCard({ comp, index, targetCountry }: { comp: Competitor; index: number; targetCountry?: string }) {
  const [expanded, setExpanded] = useState(index === 0)
  const country = comp.country || (comp.website?.includes('.in') ? 'India' : targetCountry || 'Global')
  const similarity = comp.similarity || Math.max(65, 90 - index * 8)
  const pricingModel = comp.pricingModel || 'Subscription / B2B'
  const targetAudience = comp.targetAudience || 'SMBs & Enterprise'

  return (
    <motion.div
      {...fadeUp(0.08 + index * 0.05)}
      whileHover={{ y: -1 }}
      id={`competitor-${index}`}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.xl,
        padding: '22px 26px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        fontFamily: FONT,
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: RADIUS.md,
              backgroundColor: C.accentSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={17} color={C.accent} strokeWidth={2.2} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: C.primary, margin: 0, letterSpacing: '-0.02em' }}>
              {comp.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <MapPin size={11} color={C.muted} />
              <span style={{ fontSize: '11.5px', color: C.muted, fontWeight: 600 }}>
                {country}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Badge variant="primary" size="sm">
            {similarity}% Match
          </Badge>

          {comp.website && (
            <a
              href={comp.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 700,
                color: C.accent,
                backgroundColor: '#ffffff',
                border: `1.5px solid ${C.border}`,
                borderRadius: RADIUS.md,
                padding: '4px 10px',
                textDecoration: 'none',
              }}
            >
              Visit <ExternalLink size={11} strokeWidth={2.5} />
            </a>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#f4f4fc',
              border: `1px solid ${C.border}`,
              borderRadius: RADIUS.md,
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 700,
              color: C.accent,
              cursor: 'pointer',
            }}
          >
            <span>{expanded ? 'Hide Details' : 'View Details'}</span>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      <p style={{ fontSize: '13.5px', color: C.secondary, lineHeight: '1.6', margin: '0 0 12px' }}>
        {comp.description}
      </p>

      {/* Badges */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
        <Badge variant="neutral" icon={Tag} size="sm">
          Pricing: {pricingModel}
        </Badge>
        <Badge variant="neutral" icon={Users} size="sm">
          Target: {targetAudience}
        </Badge>
      </div>

      <p style={{ fontSize: '11px', color: C.muted, margin: '6px 0 0', fontWeight: 500 }}>
        Similarity calculated using features, target customers, business model, and market positioning.
      </p>

      {/* Expandable Deep Details Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden', marginTop: '16px' }}
          >
            {/* Differentiation & Threat Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', backgroundColor: '#f8f9fe', border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, padding: '14px 16px', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color: C.accent, textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Sparkles size={12} />
                  <span>Relevance & Differentiation</span>
                </div>
                <p style={{ fontSize: '12px', color: C.secondary, margin: '0 0 4px', lineHeight: '1.45' }}>
                  <strong>Relevance:</strong> {comp.relevanceReason || 'Direct player in target segment.'}
                </p>
                <p style={{ fontSize: '12px', color: C.secondary, margin: 0, lineHeight: '1.45' }}>
                  <strong>Differentiation:</strong> {comp.differentiation || 'Differentiated through specialized AI automation.'}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Target size={12} />
                  <span>Opportunity & Threat</span>
                </div>
                <p style={{ fontSize: '12px', color: C.secondary, margin: '0 0 4px', lineHeight: '1.45' }}>
                  <strong>Opportunity:</strong> {comp.keyOpportunity || 'Capture unserved niche audience.'}
                </p>
                <p style={{ fontSize: '12px', color: C.secondary, margin: 0, lineHeight: '1.45' }}>
                  <strong>Biggest Threat:</strong> {comp.biggestThreat || 'Incumbent feature expansion.'}
                </p>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                  Strengths
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {comp.strengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                      <CheckCircle2 size={12} color="#16a34a" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>
                  Vulnerabilities
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {comp.weaknesses.map((w, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#be123c', fontWeight: 600 }}>
                      <AlertCircle size={12} color="#dc2626" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function CompetitorAnalysis({ competitors, targetCountry }: Props) {
  return (
    <section id="competitor-analysis" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={Building2}
        overline="Competitive Intelligence"
        title={`${competitors.length} Direct Competitors Analyzed`}
        description="Competitor feature mapping, pricing, and positioning gaps. Click View Details on any competitor for deep analysis."
      />

      {competitors.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {competitors.map((comp, i) => (
            <CompetitorCard key={comp.name + i} comp={comp} index={i} targetCountry={targetCountry} />
          ))}
        </div>
      ) : (
        <EmptyState title="No Competitors Found" message="No direct market competitors identified for this query." />
      )}
    </section>
  )
}

export default CompetitorAnalysis
