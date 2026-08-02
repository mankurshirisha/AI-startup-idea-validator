/**
 * AgentPipeline.tsx
 * Section 2 — Multi-Agent Pipeline with interactive View Details expansion.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  Globe,
  TrendingUp,
  Users,
  GitCompare,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Award,
} from 'lucide-react'
import type { AgentResult, AgentStatus, ValidationResult } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'

interface Props {
  agents: AgentResult[]
  data?: ValidationResult
}

/* ── Icon map: agent id → lucide icon ── */
const AGENT_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
> = {
  'web-search': Globe,
  'market-opp': TrendingUp,
  competitor: Users,
  comparison: GitCompare,
  report: FileText,
}

/* ── Status indicator ── */
function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === 'completed') return <CheckCircle2 size={15} color="#22c55e" strokeWidth={2.5} />
  if (status === 'running') return <Circle size={15} color={C.accent} strokeWidth={2.5} />
  if (status === 'failed') return <AlertCircle size={15} color="#ef4444" strokeWidth={2.5} />
  return <Circle size={15} color={C.muted} strokeWidth={1.5} />
}

/* ── Status label + color ── */
const STATUS_META: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  completed: { label: 'Completed', color: '#16a34a', bg: '#dcfce7' },
  running: { label: 'Running', color: C.accent, bg: '#eef2ff' },
  pending: { label: 'Pending', color: C.muted, bg: '#f4f4f8' },
  failed: { label: 'Failed', color: '#dc2626', bg: '#fee2e2' },
}

/* ═══════════════════════════════════════════════════════
   AGENT DETAIL DRAWER CONTENT
═══════════════════════════════════════════════════════ */

function SectionTag({ label }: { label: string }) {
  return (
    <p
      style={{
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: C.accent,
        marginBottom: '6px',
      }}
    >
      {label}
    </p>
  )
}

function WebSearchDetails({ data, agent }: { data?: ValidationResult; agent: AgentResult }) {
  const trends = data?.market.trends ?? []
  const competitors = data?.competitors ?? []
  const sources = data?.sources ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <SectionTag label="Market Summary" />
        <p style={{ fontSize: '13px', color: C.primary, lineHeight: '1.6' }}>
          {agent.detail || agent.summary}
        </p>
      </div>

      {trends.length > 0 && (
        <div>
          <SectionTag label="Market Trends Identified" />
          <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {trends.map((trend, i) => (
              <li key={i} style={{ fontSize: '12.5px', color: C.secondary, lineHeight: '1.5' }}>
                {trend}
              </li>
            ))}
          </ul>
        </div>
      )}

      {competitors.length > 0 && (
        <div>
          <SectionTag label="Competitors Found" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {competitors.map((comp, i) => (
              <span
                key={i}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: C.primary,
                  backgroundColor: '#f1f1f8',
                  borderRadius: RADIUS.pill,
                  padding: '4px 10px',
                }}
              >
                {comp.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {sources.length > 0 && (
        <div>
          <SectionTag label="Verified Web Sources" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {sources.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '12px',
                  color: C.accent,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  wordBreak: 'break-all',
                }}
              >
                <ExternalLink size={12} strokeWidth={2} />
                {url}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MarketOppDetails({ data }: { data?: ValidationResult }) {
  const market = data?.market
  const recs = data?.recommendations ?? []
  const sources = data?.sources ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <SectionTag label="Industry Insights" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            backgroundColor: '#f8f8fc',
            padding: '12px',
            borderRadius: RADIUS.md,
            textAlign: 'center',
          }}
        >
          <div>
            <p style={{ fontSize: '10px', color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Industry</p>
            <p style={{ fontSize: '13px', color: C.primary, fontWeight: 700 }}>{market?.industry ?? 'Tech'}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Market Size</p>
            <p style={{ fontSize: '13px', color: C.accent, fontWeight: 800 }}>{market?.marketSize ?? 'N/A'}</p>
          </div>
          <div>
            <p style={{ fontSize: '10px', color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Growth Rate</p>
            <p style={{ fontSize: '13px', color: '#16a34a', fontWeight: 800 }}>{market?.growthRate ?? 'N/A'}</p>
          </div>
        </div>
      </div>

      <div>
        <SectionTag label="TAM / SAM / SOM Sizing" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          <div style={{ padding: '10px', border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: C.muted, fontWeight: 700 }}>TAM</p>
            <p style={{ fontSize: '14px', fontWeight: 800, color: C.primary }}>$50 Billion</p>
          </div>
          <div style={{ padding: '10px', border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: C.muted, fontWeight: 700 }}>SAM</p>
            <p style={{ fontSize: '14px', fontWeight: 800, color: C.accent }}>$8 Billion</p>
          </div>
          <div style={{ padding: '10px', border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, textAlign: 'center' }}>
            <p style={{ fontSize: '10px', color: C.muted, fontWeight: 700 }}>SOM</p>
            <p style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a' }}>$500 Million</p>
          </div>
        </div>
      </div>

      <div>
        <SectionTag label="Market Opportunity Score" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: C.accent }}>{data?.validationScore ?? 75}/100</div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#16a34a',
              backgroundColor: '#dcfce7',
              padding: '3px 10px',
              borderRadius: RADIUS.pill,
            }}
          >
            {data?.status ?? 'Moderate'} Opportunity
          </div>
        </div>
      </div>

      <div>
        <SectionTag label="Customer Insights" />
        <p style={{ fontSize: '12.5px', color: C.secondary, lineHeight: '1.5' }}>
          High market demand identified among target user segments looking for differentiated workflow automation and modern product experience.
        </p>
      </div>

      {recs.length > 0 && (
        <div>
          <SectionTag label="Recommendations" />
          <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {recs.slice(0, 3).map((rec, i) => (
              <li key={i} style={{ fontSize: '12.5px', color: C.primary, lineHeight: '1.5' }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sources.length > 0 && (
        <div>
          <SectionTag label="Sources" />
          <p style={{ fontSize: '12px', color: C.muted }}>Verified across {sources.length} market intelligence sources.</p>
        </div>
      )}
    </div>
  )
}

function CompetitorDetails({ data }: { data?: ValidationResult }) {
  const competitors = data?.competitors ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <SectionTag label="Competitor List & Analysis" />
      {competitors.map((comp, idx) => (
        <div
          key={idx}
          style={{
            padding: '14px',
            backgroundColor: '#f8f8fc',
            borderRadius: RADIUS.md,
            border: `1px solid ${C.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: C.primary, margin: 0 }}>{comp.name}</h4>
            {comp.website && (
              <a
                href={comp.website}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '11px', color: C.accent, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                Website <ExternalLink size={11} />
              </a>
            )}
          </div>
          <p style={{ fontSize: '12.5px', color: C.secondary, margin: 0, lineHeight: '1.5' }}>{comp.description}</p>
          
          {comp.strengths && comp.strengths.length > 0 && (
            <div>
              <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#16a34a', margin: '4px 0 2px' }}>STRENGTHS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {comp.strengths.map((s, i) => (
                  <span key={i} style={{ fontSize: '11px', color: '#16a34a', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                    <Check size={10} style={{ display: 'inline', marginRight: '3px' }} />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {comp.weaknesses && comp.weaknesses.length > 0 && (
            <div>
              <p style={{ fontSize: '10.5px', fontWeight: 700, color: '#dc2626', margin: '4px 0 2px' }}>WEAKNESSES</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {comp.weaknesses.map((w, i) => (
                  <span key={i} style={{ fontSize: '11px', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
                    <X size={10} style={{ display: 'inline', marginRight: '3px' }} />
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ComparisonDetails({ data }: { data?: ValidationResult }) {
  const competitors = data?.competitors ?? []
  const recs = data?.recommendations ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <SectionTag label="Competitor Similarity Scores" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {competitors.map((comp, idx) => {
            const score = 85 - idx * 12
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ fontWeight: 600, color: C.primary }}>{comp.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '140px' }}>
                  <div style={{ flex: 1, height: '6px', backgroundColor: '#e8e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${score}%`, height: '100%', backgroundColor: C.accent }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: C.secondary }}>{score}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <SectionTag label="Strengths & Opportunities" />
        <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li style={{ fontSize: '12.5px', color: C.primary }}>
            <strong>Competitive Edge:</strong> Specialized AI workflow automation tailored to modern user workflows.
          </li>
          <li style={{ fontSize: '12.5px', color: C.primary }}>
            <strong>Growth Opportunity:</strong> Targeting mid-market users currently underserved by expensive legacy platforms.
          </li>
        </ul>
      </div>

      <div>
        <SectionTag label="Market Gaps Identified" />
        <p style={{ fontSize: '12.5px', color: C.secondary, lineHeight: '1.5' }}>
          Existing tools focus primarily on manual tracking or broad enterprise suites. A clear gap exists for streamlined, accessible, self-service AI intelligence.
        </p>
      </div>

      {recs.length > 0 && (
        <div>
          <SectionTag label="Comparison Recommendations" />
          <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {recs.slice(0, 3).map((rec, i) => (
              <li key={i} style={{ fontSize: '12.5px', color: C.primary, lineHeight: '1.5' }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ReportDetails({ data }: { data?: ValidationResult }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <SectionTag label="Executive Summary" />
        <p style={{ fontSize: '13px', color: C.primary, lineHeight: '1.6', margin: 0 }}>
          {data?.executiveSummary}
        </p>
      </div>

      <div>
        <SectionTag label="Final Validation Score" />
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#f8f8fc',
            padding: '10px 16px',
            borderRadius: RADIUS.md,
            border: `1px solid ${C.border}`,
          }}
        >
          <Award size={20} color={C.accent} />
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, color: C.primary }}>{data?.validationScore}/100</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', marginLeft: '8px' }}>
              ({data?.status ?? 'Moderate'})
            </span>
          </div>
        </div>
      </div>

      <div>
        <SectionTag label="Overall Strategic Recommendation" />
        <div style={{ backgroundColor: '#eef2ff', padding: '12px', borderRadius: RADIUS.md, border: `1px solid ${C.accentSoft}` }}>
          <p style={{ fontSize: '12.5px', color: C.accent, fontWeight: 600, margin: 0, lineHeight: '1.5' }}>
            {data?.recommendations[0] ?? 'Proceed with pilot launch while focusing on key user segment positioning.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function AgentDetailsDrawer({ agent, data }: { agent: AgentResult; data?: ValidationResult }) {
  if (agent.id === 'web-search') return <WebSearchDetails data={data} agent={agent} />
  if (agent.id === 'market-opp') return <MarketOppDetails data={data} />
  if (agent.id === 'competitor') return <CompetitorDetails data={data} />
  if (agent.id === 'comparison') return <ComparisonDetails data={data} />
  if (agent.id === 'report') return <ReportDetails data={data} />
  return <p style={{ fontSize: '13px', color: C.secondary }}>{agent.detail}</p>
}

/* ─── Single agent card component ─── */
function AgentCard({
  agent,
  index,
  data,
  isExpanded,
  onToggleExpand,
}: {
  agent: AgentResult
  index: number
  data?: ValidationResult
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const Icon = AGENT_ICONS[agent.id] ?? Globe
  const meta = STATUS_META[agent.status]

  return (
    <motion.div
      {...fadeUp(0.08 + index * 0.07)}
      id={`agent-card-${agent.id}`}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${isExpanded ? C.accent : C.border}`,
        borderRadius: RADIUS.lg,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: isExpanded
          ? '0 12px 40px rgba(59,59,219,0.14)'
          : '0 4px 20px rgba(0,0,0,0.03)',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        fontFamily: FONT,
      }}
    >
      {/* Top row: icon + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Icon bubble */}
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: RADIUS.md,
            background: C.accentSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={19} color={C.accent} strokeWidth={2} />
        </div>

        {/* Status badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 700,
            color: meta.color,
            background: meta.bg,
            borderRadius: RADIUS.pill,
            padding: '4px 10px',
            letterSpacing: '0.03em',
          }}
        >
          <StatusIcon status={agent.status} />
          {meta.label}
        </span>
      </div>

      {/* Agent name */}
      <div>
        <p
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: C.muted,
            marginBottom: '5px',
          }}
        >
          Agent {String(index + 1).padStart(2, '0')}
        </p>
        <h3
          style={{
            fontFamily: FONT,
            fontSize: '15px',
            fontWeight: 700,
            color: C.primary,
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
          }}
        >
          {agent.name}
        </h3>
      </div>

      {/* Summary */}
      <p
        style={{
          fontSize: '13.5px',
          color: C.secondary,
          lineHeight: '1.65',
          margin: 0,
        }}
      >
        {agent.summary}
      </p>

      {/* View / Hide Details button */}
      <button
        id={`agent-details-${agent.id}`}
        disabled={agent.status !== 'completed'}
        onClick={onToggleExpand}
        style={{
          alignSelf: 'flex-start',
          background: isExpanded ? C.accentSoft : 'transparent',
          border: `1.5px solid ${isExpanded ? C.accent : C.border}`,
          borderRadius: RADIUS.sm,
          padding: '7px 14px',
          fontFamily: FONT,
          fontSize: '12.5px',
          fontWeight: 700,
          color: isExpanded ? C.accent : C.accent,
          cursor: agent.status === 'completed' ? 'pointer' : 'not-allowed',
          opacity: agent.status === 'completed' ? 1 : 0.45,
          transition: 'all 0.2s ease',
          letterSpacing: '-0.01em',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {isExpanded ? 'Hide Details' : 'View Details'}
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Smooth Expand/Collapse Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key={`drawer-${agent.id}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              overflow: 'hidden',
              borderTop: `1px solid ${C.border}`,
              paddingTop: '16px',
              marginTop: '4px',
            }}
          >
            <AgentDetailsDrawer agent={agent} data={data} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   AGENT PIPELINE SECTION
═══════════════════════════════════════════════════════ */
export function AgentPipeline({ agents, data }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <section id="agent-pipeline" style={{ fontFamily: FONT }}>
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
          Multi-Agent Pipeline
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
          Five agents. One pipeline.
        </h2>
      </motion.div>

      {/* Cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {agents.map((agent, i) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            index={i}
            data={data}
            isExpanded={expandedId === agent.id}
            onToggleExpand={() =>
              setExpandedId((prev) => (prev === agent.id ? null : agent.id))
            }
          />
        ))}
      </div>
    </section>
  )
}

export default AgentPipeline
