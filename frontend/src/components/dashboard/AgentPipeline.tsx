/**
 * AgentPipeline.tsx
 * Section 2 — One card per AI agent, showing status + summary + View Details.
 */
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, AlertCircle, Globe, TrendingUp, Users, GitCompare, FileText } from 'lucide-react'
import type { AgentResult, AgentStatus } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'

interface Props {
  agents: AgentResult[]
}

/* ── Icon map: agent id → lucide icon ── */
const AGENT_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>> = {
  'web-search':  Globe,
  'market-opp':  TrendingUp,
  'competitor':  Users,
  'comparison':  GitCompare,
  'report':      FileText,
}

/* ── Status indicator ── */
function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === 'completed') return <CheckCircle2 size={15} color="#22c55e" strokeWidth={2.5} />
  if (status === 'running')   return <Circle       size={15} color={C.accent}  strokeWidth={2.5} />
  if (status === 'failed')    return <AlertCircle  size={15} color="#ef4444"  strokeWidth={2.5} />
  return                             <Circle       size={15} color={C.muted}   strokeWidth={1.5} />
}

/* ── Status label + color ── */
const STATUS_META: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  completed: { label: 'Completed', color: '#16a34a', bg: '#dcfce7' },
  running:   { label: 'Running',   color: C.accent,  bg: '#eef2ff' },
  pending:   { label: 'Pending',   color: C.muted,   bg: '#f4f4f8' },
  failed:    { label: 'Failed',    color: '#dc2626',  bg: '#fee2e2' },
}

/* ─── Single agent card ─── */
function AgentCard({ agent, index }: { agent: AgentResult; index: number }) {
  const Icon = AGENT_ICONS[agent.id] ?? Globe
  const meta = STATUS_META[agent.status]

  return (
    <motion.div
      {...fadeUp(0.08 + index * 0.07)}
      id={`agent-card-${agent.id}`}
      whileHover={{ y: -3, boxShadow: '0 10px 36px rgba(59,59,219,0.11)' }}
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: RADIUS.lg,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'box-shadow 0.2s ease',
        cursor: 'default',
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
          flex: 1,
        }}
      >
        {agent.summary}
      </p>

      {/* View Details button */}
      <button
        id={`agent-details-${agent.id}`}
        disabled={agent.status !== 'completed'}
        style={{
          alignSelf: 'flex-start',
          background: 'transparent',
          border: `1.5px solid ${agent.status === 'completed' ? C.border : C.border}`,
          borderRadius: RADIUS.sm,
          padding: '7px 14px',
          fontFamily: FONT,
          fontSize: '12.5px',
          fontWeight: 600,
          color: agent.status === 'completed' ? C.accent : C.muted,
          cursor: agent.status === 'completed' ? 'pointer' : 'not-allowed',
          opacity: agent.status === 'completed' ? 1 : 0.45,
          transition: 'border-color 0.15s ease, color 0.15s ease',
          letterSpacing: '-0.01em',
        }}
        onMouseEnter={(e) => {
          if (agent.status === 'completed') {
            e.currentTarget.style.borderColor = C.accent
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = C.border
        }}
      >
        View Details
      </button>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   AGENT PIPELINE SECTION
═══════════════════════════════════════════════════════ */
export function AgentPipeline({ agents }: Props) {
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        {agents.map((agent, i) => (
          <AgentCard key={agent.id} agent={agent} index={i} />
        ))}
      </div>
    </section>
  )
}

export default AgentPipeline
