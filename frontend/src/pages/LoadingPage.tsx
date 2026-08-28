/**
 * LoadingPage.tsx
 * BeforeBeta — AI Validation Loading Page
 *
 * Design system: identical to LandingPage
 *   • Font:        DM Sans 800 / 700 / 400
 *   • Background:  #FFFFFF
 *   • Accent blue: #3b3bdb
 *   • Orange:      #FCA311
 *   • Cards:       white, 1px #e8e8f0 border, soft shadow
 *   • Border-radius: 20-24px for cards, 12px for inputs/buttons
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2, Circle } from 'lucide-react'
import { BarLoader } from '@/components/ui/BarLoader'
import { mapBackendToValidationResult } from '@/lib/validationService'
import type { BackendValidationResponse } from '@/lib/validationService'
import type { ValidationResult } from '@/types/dashboard'
import { getApiBaseUrl } from '@/lib/api'

/* ─── Design tokens — must stay in sync with index.css ─── */
const C = {
  bg:        '#FFFFFF',
  primary:   '#1a1a2e',
  secondary: '#5a5a8a',
  accent:    '#3b3bdb',
  orange:    '#FCA311',
  muted:     '#9090b0',
  border:    '#e8e8f0',
  card:      '#FFFFFF',
} as const

const ease = [0.25, 0.1, 0.25, 1] as const

/* ─── Transition helper ───────────────────────────────── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease },
})

/* ─── AI agent pipeline ───────────────────────────────── */
type AgentStatus = 'done' | 'running' | 'waiting'

interface Agent {
  id: string
  label: string
  description: string
}

const AGENTS: Agent[] = [
  {
    id: 'web-search',
    label: 'Web Search Agent',
    description: 'Fetching live data from trusted market sources',
  },
  {
    id: 'market-opp',
    label: 'Market Opportunity Agent',
    description: 'Sizing the addressable market and growth trajectory',
  },
  {
    id: 'competitor',
    label: 'Competitor Discovery Agent',
    description: 'Mapping competitive landscape and positioning gaps',
  },
  {
    id: 'comparison',
    label: 'Comparison Agent',
    description: 'Benchmarking against industry benchmarks and alternatives',
  },
  {
    id: 'swot-risk',
    label: 'SWOT & Risk Analysis Agent',
    description: 'Evaluating internal strengths & weaknesses alongside external risks',
  },
  {
    id: 'mvp-feature',
    label: 'MVP Feature Recommendation Agent',
    description: 'Prioritizing core MVP feature set and post-launch roadmap',
  },
  {
    id: 'go-to-market',
    label: 'Go-to-Market Strategy Agent',
    description: 'Structuring customer acquisition channels, positioning, and launch plan',
  },
]

  /* ── Backend stage → AGENTS array index & active labels ── */
  const STAGE_LABELS: Record<string, string> = {
    web_search:    'Analyzing startup idea & search signals...',
    market_opp:    'Analyzing market opportunity & addressable size...',
    competitor:    'Researching competitors & market gaps...',
    comparison:    'Comparing competitors & feature benchmarks...',
    swot_risk:     'Analyzing SWOT & business risks...',
    mvp_feature:   'Identifying MVP feature roadmap...',
    go_to_market:  'Building Go-to-Market strategy...',
    done:          'Preparing final dashboard...',
  }

  const STAGE_TO_IDX: Record<string, number> = {
    web_search:    0,
    market_opp:    1,
    competitor:     2,
    comparison:     3,
    swot_risk:      4,
    mvp_feature:    5,
    go_to_market:   6,
  }




/* ─── Agent status icon ───────────────────────────────── */
function AgentIcon({ status }: { status: AgentStatus }) {
  if (status === 'done') {
    return (
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#3b3bdb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <CheckCircle2 size={13} color="#fff" strokeWidth={2.5} />
      </div>
    )
  }

  if (status === 'running') {
    return (
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#3b3bdb',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#fff',
          }}
        />
      </motion.div>
    )
  }

  // waiting
  return (
    <Circle
      size={22}
      color="#d0d0e8"
      strokeWidth={1.5}
      style={{ flexShrink: 0 }}
    />
  )
}

/* ═══════════════════════════════════════════════════════
   LOADING PAGE
═══════════════════════════════════════════════════════ */
export default function LoadingPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Idea context passed from the landing page form (via state)
  const locState = location.state as {
    idea?: string
    description?: string
    industry?: string
    targetCustomer?: string
    targetCountry?: string
    startupStage?: string
    businessModel?: string
    keyFeatures?: string[]
  } | null

  // Direct access guard: redirect to home if accessed directly without submission context
  useEffect(() => {
    if (!locState || !locState.idea || locState.idea.trim().length < 2) {
      navigate('/', { replace: true })
    }
  }, [locState, navigate])

  const idea = locState?.idea ?? 'Your Startup Idea'
  const description = locState?.description ?? ''
  const industry = locState?.industry ?? ''
  const targetCustomer = locState?.targetCustomer ?? ''
  const targetCountry = locState?.targetCountry ?? 'Global'
  const startupStage = locState?.startupStage ?? 'Idea'
  const businessModel = locState?.businessModel ?? 'B2B'
  const keyFeatures = locState?.keyFeatures ?? []

  /* ── Agent pipeline progress ── */
  const [runningAgents, setRunningAgents] = useState<Set<number>>(new Set([0]))
  const [completedAgents, setCompletedAgents] = useState<Set<number>>(new Set())
  const [allDone, setAllDone] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [activeStageMsg, setActiveStageMsg] = useState<string | null>(null)

  /* ── Backend Integration State ── */
  const [apiResult, setApiResult] = useState<ValidationResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isRetrying] = useState(0)

  /* ── Rotating status message ── */
  const [msgIdx, setMsgIdx] = useState(0)
  const [msgVisible, setMsgVisible] = useState(true)

  /* ── SSE pipeline: drives agent cards from real backend events ── */
  useEffect(() => {
    if (!locState || !locState.idea) return

    let aborted = false
    const controller = new AbortController()
    setErrorMsg(null)

    // Derive base URL using normalized API base helper
    const baseUrl = getApiBaseUrl()

    ;(async () => {
      try {
        const res = await fetch(`${baseUrl}/startup-validator-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startupIdea: idea,
            description: description || idea,
            industry,
            targetCustomer,
            targetCountry,
            startupStage,
            businessModel,
            keyFeatures,
          }),
          signal: controller.signal,
        })


        if (!res.ok || !res.body) {
          throw new Error(
            `Server returned ${res.status}. Please try again.`,
          )
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done || aborted) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue

            let event: Record<string, unknown>
            try {
              event = JSON.parse(raw) as Record<string, unknown>
            } catch {
              continue
            }

            if (aborted) return

            const stage = event.stage as string

            if (stage === 'error') {
              setErrorMsg(
                (event.detail as string) || 'Validation failed. Please try again.',
              )
              return
            }

            if (stage === 'done') {
              const mapped = mapBackendToValidationResult(
                event.result as BackendValidationResponse,
                idea,
                description,
              )
              setApiResult(mapped)
              setAllDone(true)
              setRunningAgents(new Set())
              setCompletedAgents(new Set(AGENTS.map((_, i) => i)))
              setActiveStageMsg(STAGE_LABELS['done'])
              return
            }

            if (STAGE_LABELS[stage]) {
              setActiveStageMsg(STAGE_LABELS[stage])
            }

            const idx = STAGE_TO_IDX[stage]
            if (idx === undefined) continue

            if (event.status === 'running') {
              setRunningAgents((prev) => new Set([...prev, idx]))
            } else if (event.status === 'done') {
              setRunningAgents((prev) => {
                const next = new Set(prev)
                next.delete(idx)
                return next
              })
              setCompletedAgents((prev) => new Set([...prev, idx]))
            }
          }
        }
      } catch (err: unknown) {
        if (aborted) return
        if (err instanceof Error && err.name === 'AbortError') return
        const msg =
          err instanceof Error
            ? err.message
            : 'Validation service failed. Please try again.'
        setErrorMsg(msg)
      }
    })()

    return () => {
      aborted = true
      controller.abort()
    }
  }, [idea, description, isRetrying, locState])

  const personalizedMessages = [
    `Researching the ${industry || 'target'} market in ${targetCountry}...`,
    `Finding competitors serving ${targetCustomer || 'target users'} in ${targetCountry}...`,
    `Estimating addressable market opportunity for ${businessModel || 'your'} business...`,
    `Comparing your startup with existing ${industry || 'market'} solutions...`,
    `Evaluating product-market fit for ${targetCustomer || 'your customers'} in ${targetCountry}...`,
    `Generating personalized validation report for ${targetCountry}...`,
  ]

  /* ── Rotate status message every 3.5s ── */
  useEffect(() => {
    const rotate = setInterval(() => {
      setMsgVisible(false)
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % personalizedMessages.length)
        setMsgVisible(true)
      }, 350)
    }, 3500)
    return () => clearInterval(rotate)
  }, [personalizedMessages.length])


  /* ── Navigate to results once allDone AND apiResult ready ── */
  useEffect(() => {
    if (errorMsg) return
    if (!allDone) return
    if (!apiResult) return

    setTransitioning(true)
    const t = setTimeout(() => {
      navigate('/results', {
        replace: true, // Replace transient /loading history entry
        state: {
          data: apiResult,
          idea,
          description,
          industry,
          targetCustomer,
          targetCountry,
          startupStage,
          businessModel,
          keyFeatures,
        },
      })
    }, 300)
    return () => clearTimeout(t)
  }, [allDone, apiResult, errorMsg, navigate, idea, description])

  /* ── Determine status of each agent ── */
  const getStatus = (idx: number): AgentStatus => {
    if (completedAgents.has(idx) || allDone) return 'done'
    if (runningAgents.has(idx)) return 'running'
    // Logical dependency rules: if a later stage is active or completed, earlier dependent stages are done
    for (let later = idx + 1; later < AGENTS.length; later++) {
      if (runningAgents.has(later) || completedAgents.has(later)) {
        return 'done'
      }
    }
    return 'waiting'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── Minimal top nav ── */}
      <header
        style={{
          padding: '0 40px',
          height: '68px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${C.border}`,
          backgroundColor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <a
          href="/"
          id="loading-nav-logo"
          style={{ textDecoration: 'none' }}
        >
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '20px',
              fontWeight: 800,
              color: C.primary,
              letterSpacing: '-0.04em',
            }}
          >
            BeforeBeta
          </span>
        </a>
      </header>

      {/* ── Main content ── */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px 80px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0px',
          }}
        >
          {/* ── Main heading ── */}
          <motion.h1
            {...fadeUp(0.1)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 'clamp(26px, 3.8vw, 36px)',
              fontWeight: 800,
              lineHeight: '1.1',
              letterSpacing: '-0.04em',
              color: C.primary,
              textAlign: 'center',
              marginBottom: '12px',
            }}
          >
            {errorMsg ? (
              <span style={{ color: '#dc2626' }}>Validation Interrupted</span>
            ) : allDone ? (
              <span style={{ color: C.accent }}>Validation Complete</span>
            ) : (
              'Validating Startup Idea'
            )}
          </motion.h1>

          {/* ── Sub-copy ── */}
          <motion.p
            {...fadeUp(0.16)}
            style={{
              fontSize: '15px',
              fontWeight: 400,
              lineHeight: '1.6',
              color: C.secondary,
              textAlign: 'center',
              maxWidth: '420px',
              marginBottom: '36px',
            }}
          >
            {allDone
              ? 'Preparing your validation dashboard...'
              : 'Executing multi-agent market research and competitive analysis.'}
          </motion.p>

          {/* ── Bar Loader ── */}
          {!allDone && (
            <motion.div
              {...fadeUp(0.22)}
              style={{ marginBottom: '40px' }}
            >
              <BarLoader width={280} height={5} blockWidth={90} />
            </motion.div>
          )}

          {/* ── All-done checkmark ── */}
          {allDone && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
              style={{ marginBottom: '40px' }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: C.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={28} color="#fff" strokeWidth={2.5} />
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════
              STARTUP OVERVIEW SUMMARY CARD
          ══════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            style={{
              width: '100%',
              backgroundColor: '#f8f9fe',
              border: `1px solid ${C.border}`,
              borderRadius: '20px',
              padding: '20px 24px',
              marginBottom: '24px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 800, color: C.primary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Startup Overview
              </h3>
              <span style={{ fontSize: '11px', fontWeight: 700, color: C.accent, backgroundColor: '#3b3bdb12', padding: '3px 10px', borderRadius: '100px' }}>
                Validation In Progress
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', fontSize: '13px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontWeight: 700, color: C.secondary }}>Idea: </span>
                <span style={{ fontWeight: 600, color: C.primary }}>{idea}</span>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: C.secondary }}>Industry: </span>
                <span style={{ fontWeight: 600, color: C.primary }}>{industry || 'Technology'}</span>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: C.secondary }}>Target Customer: </span>
                <span style={{ fontWeight: 600, color: C.primary }}>{targetCustomer || 'General Users'}</span>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: C.secondary }}>Target Market: </span>
                <span style={{ fontWeight: 600, color: C.primary }}>{targetCountry}</span>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: C.secondary }}>Stage: </span>
                <span style={{ fontWeight: 600, color: C.primary }}>{startupStage || 'Idea Stage'}</span>
              </div>

              <div>
                <span style={{ fontWeight: 700, color: C.secondary }}>Business Model: </span>
                <span style={{ fontWeight: 600, color: C.primary }}>{businessModel || 'B2B / B2C'}</span>
              </div>

              {keyFeatures.length > 0 && (
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ fontWeight: 700, color: C.secondary }}>Key Features: </span>
                  <span style={{ fontWeight: 600, color: C.primary }}>{keyFeatures.join(', ')}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* ══════════════════════════════════════
              PROGRESS CARD
          ══════════════════════════════════════ */}
          <motion.div
            {...fadeUp(0.28)}
            style={{
              width: '100%',
              backgroundColor: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 8px 40px rgba(59,59,219,0.08)',
              marginBottom: '28px',
            }}
          >
            {/* Card header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                paddingBottom: '20px',
                borderBottom: `1px solid ${C.border}`,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: C.accent,
                    marginBottom: '4px',
                  }}
                >
                  Analysis Pipeline
                </p>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: C.primary,
                    letterSpacing: '-0.02em',
                    margin: 0,
                  }}
                >
                  Executing Multi-Agent Analysis
                </h2>
              </div>

              {/* Completed count badge */}
              <div
                style={{
                  background: '#3b3bdb0f',
                  border: '1px solid #3b3bdb22',
                  borderRadius: '100px',
                  padding: '4px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: C.accent,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {allDone
                    ? `${AGENTS.length} of ${AGENTS.length} Done`
                    : `${completedAgents.size} of ${AGENTS.length} Complete`}
                </span>
              </div>
            </div>

            {/* Agent list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {AGENTS.map((agent, idx) => {
                const status = getStatus(idx)
                return (
                  <motion.div
                    key={agent.id}
                    id={`agent-${agent.id}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.08, duration: 0.4, ease }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background:
                        status === 'running'
                          ? '#3b3bdb06'
                          : status === 'done'
                          ? '#3b3bdb04'
                          : 'transparent',
                      border:
                        status === 'running'
                          ? '1px solid #3b3bdb18'
                          : '1px solid transparent',
                      transition: 'background 0.3s ease, border-color 0.3s ease',
                    }}
                  >
                    <AgentIcon status={status} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '14px',
                          fontWeight: status === 'waiting' ? 500 : 700,
                          color:
                            status === 'waiting' ? C.muted : C.primary,
                          letterSpacing: '-0.01em',
                          lineHeight: 1.3,
                          transition: 'color 0.3s ease',
                        }}
                      >
                        {agent.label}
                      </p>
                      {status === 'running' && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3 }}
                          style={{
                            fontSize: '12px',
                            color: C.secondary,
                            marginTop: '2px',
                            lineHeight: 1.4,
                          }}
                        >
                          {agent.description}
                        </motion.p>
                      )}
                    </div>

                    {/* Right-side label */}
                    {status === 'done' && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: C.accent,
                          letterSpacing: '0.03em',
                          flexShrink: 0,
                        }}
                      >
                        Done
                      </motion.span>
                    )}
                    {status === 'running' && (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: C.orange,
                          letterSpacing: '0.03em',
                          flexShrink: 0,
                        }}
                      >
                        Running
                      </motion.span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* ── Dynamic status message ── */}
          {!allDone && (
            <motion.div
              {...fadeUp(0.36)}
              style={{
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <AnimatePresence mode="wait">
                {msgVisible && (
                  <motion.p
                    key={msgIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 500,
                      color: C.secondary,
                      textAlign: 'center',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {activeStageMsg || personalizedMessages[msgIdx]}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── Estimated time ── */}
          {!allDone && (
            <motion.div
              {...fadeUp(0.42)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: C.muted,
                }}
              >
                Estimated time
              </p>
              <p
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: C.secondary,
                  letterSpacing: '-0.02em',
                }}
              >
                30–90 seconds
              </p>
            </motion.div>
          )}

          {/* ── Idea chip ── */}
          {idea && (
            <motion.div
              {...fadeUp(0.48)}
              style={{
                marginTop: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#fafafe',
                border: `1px solid ${C.border}`,
                borderRadius: '100px',
                padding: '8px 18px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: C.muted,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                Validating:
              </span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: C.primary,
                  letterSpacing: '-0.01em',
                  maxWidth: '280px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {idea}
              </span>
            </motion.div>
          )}
        </div>
      </main>

      {/* ── Footer strip ── */}
      <footer
        style={{
          borderTop: `1px solid ${C.border}`,
          padding: '20px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        <p
          style={{
            fontSize: '12px',
            color: C.muted,
            textAlign: 'center',
          }}
        >
          Your data is processed securely and never stored.
        </p>
      </footer>

      {/* ── Full-page exit overlay ── */}
      <AnimatePresence>
        {transitioning && (
          <motion.div
            key="exit-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: '#3b3bdb',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.0 }}
              style={{ textAlign: 'center' }}
            >
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.04em',
                  marginBottom: '8px',
                }}
              >
                BeforeBeta
              </p>
              <p
                style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 500,
                }}
              >
                Loading your results...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
