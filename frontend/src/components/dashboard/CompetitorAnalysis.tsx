/**
 * CompetitorAnalysis.tsx
 * Section 4 — Competitor list, comparison table, strengths, weaknesses.
 */
import { motion } from 'framer-motion'
import { ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react'
import type { Competitor } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'

interface Props {
  competitors: Competitor[]
}

/* ─── Single competitor card ─── */
function CompetitorCard({ comp, index }: { comp: Competitor; index: number }) {
  return (
    <motion.div
      {...fadeUp(0.08 + index * 0.06)}
      id={`competitor-${index}`}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
        padding: '24px',
        fontFamily: FONT,
      }}
    >
      {/* Name + link */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '12px' }}>
        <h3
          style={{
            fontFamily: FONT,
            fontSize: '16px',
            fontWeight: 700,
            color: C.primary,
            letterSpacing: '-0.02em',
          }}
        >
          {comp.name}
        </h3>
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
              color: C.accent,
              textDecoration: 'none',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Visit <ExternalLink size={11} strokeWidth={2.5} />
          </a>
        )}
      </div>

      {/* Description */}
      <p style={{ fontSize: '13.5px', color: C.secondary, lineHeight: '1.65', marginBottom: '20px' }}>
        {comp.description}
      </p>

      {/* Strengths / Weaknesses */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Strengths */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <ThumbsUp size={13} color="#16a34a" strokeWidth={2.5} />
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Strengths
            </p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {comp.strengths.map((s, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                <span style={{ color: '#16a34a', fontSize: '14px', lineHeight: '1.4', flexShrink: 0 }}>+</span>
                <span style={{ fontSize: '13px', color: C.secondary, lineHeight: '1.5' }}>{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <ThumbsDown size={13} color="#dc2626" strokeWidth={2.5} />
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Weaknesses
            </p>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {comp.weaknesses.map((w, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                <span style={{ color: '#dc2626', fontSize: '14px', lineHeight: '1.4', flexShrink: 0 }}>−</span>
                <span style={{ fontSize: '13px', color: C.secondary, lineHeight: '1.5' }}>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Comparison summary table ─── */
function ComparisonTable({ competitors }: { competitors: Competitor[] }) {
  if (competitors.length === 0) return null

  return (
    <motion.div
      {...fadeUp(0.3)}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        fontFamily: FONT,
      }}
    >
      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: C.primary, letterSpacing: '-0.01em' }}>
          Competitor Overview
        </p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#fafafe' }}>
              <th style={{ textAlign: 'left', padding: '12px 24px', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '10.5px', width: '30%', borderBottom: `1px solid ${C.border}` }}>
                Competitor
              </th>
              <th style={{ textAlign: 'left', padding: '12px 24px', fontWeight: 700, color: C.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '10.5px', borderBottom: `1px solid ${C.border}` }}>
                Description
              </th>
              <th style={{ textAlign: 'center', padding: '12px 24px', fontWeight: 700, color: '#16a34a', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '10.5px', borderBottom: `1px solid ${C.border}` }}>
                Strengths
              </th>
              <th style={{ textAlign: 'center', padding: '12px 24px', fontWeight: 700, color: '#dc2626', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: '10.5px', borderBottom: `1px solid ${C.border}` }}>
                Weaknesses
              </th>
            </tr>
          </thead>
          <tbody>
            {competitors.map((comp, i) => (
              <tr
                key={i}
                style={{ borderBottom: i < competitors.length - 1 ? `1px solid ${C.border}` : 'none' }}
              >
                <td style={{ padding: '14px 24px', fontWeight: 700, color: C.primary, letterSpacing: '-0.01em' }}>
                  {comp.name}
                </td>
                <td style={{ padding: '14px 24px', color: C.secondary, lineHeight: 1.5 }}>
                  {comp.description.length > 80 ? comp.description.slice(0, 80) + '…' : comp.description}
                </td>
                <td style={{ padding: '14px 24px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>
                  {comp.strengths.length}
                </td>
                <td style={{ padding: '14px 24px', textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>
                  {comp.weaknesses.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   COMPETITOR ANALYSIS
═══════════════════════════════════════════════════════ */
export function CompetitorAnalysis({ competitors }: Props) {
  return (
    <section id="competitor-analysis" style={{ fontFamily: FONT }}>
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
          Competitor Analysis
        </p>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 'clamp(20px, 2.4vw, 26px)',
            fontWeight: 800,
            color: C.primary,
            letterSpacing: '-0.04em',
            lineHeight: 1.2,
            marginBottom: '4px',
          }}
        >
          {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} identified
        </h2>
      </motion.div>

      {/* Comparison table */}
      <div style={{ marginBottom: '20px' }}>
        <ComparisonTable competitors={competitors} />
      </div>

      {/* Competitor cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {competitors.map((comp, i) => (
          <CompetitorCard key={comp.name} comp={comp} index={i} />
        ))}
      </div>
    </section>
  )
}

export default CompetitorAnalysis
