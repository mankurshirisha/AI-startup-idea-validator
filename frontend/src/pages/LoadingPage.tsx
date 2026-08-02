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

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2, Circle, Loader2, AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react'
import { BarLoader } from '@/components/ui/BarLoader'
import { validateStartupIdea } from '@/lib/validationService'
import type { ValidationResult } from '@/types/dashboard'

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
  duration: number  // ms this step takes to "complete"
}

const AGENTS: Agent[] = [
  {
    id: 'web-search',
    label: 'Web Search Agent',
    description: 'Fetching live data from trusted market sources',
    duration: 3500,
  },
  {
    id: 'market-opp',
    label: 'Market Opportunity Agent',
    description: 'Sizing the addressable market and growth trajectory',
    duration: 4000,
  },
  {
    id: 'competitor',
    label: 'Competitor Discovery Agent',
    description: 'Mapping competitive landscape and positioning gaps',
    duration: 4000,
  },
  {
    id: 'comparison',
    label: 'Comparison Agent',
    description: 'Benchmarking against industry benchmarks and alternatives',
    duration: 3500,
  },
  {
    id: 'report',
    label: 'Report Generator',
    description: 'Compiling executive summary and actionable insights',
    duration: 3000,
  },
]

/* ─── Status messages (rotate while loading) ─────────── */
const STATUS_MESSAGES = [
  'Searching trusted market sources...',
  'Analyzing industry trends...',
  'Discovering key competitors...',
  'Calculating market opportunity...',
  'Comparing your startup to alternatives...',
  'Generating executive summary...',
  'Preparing your final report...',
]

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
  const locState = location.state as { idea?: string; description?: string } | null
  const idea = locState?.idea ?? 'Your Startup Idea'
  const description = locState?.description ?? ''

  /* ── Agent pipeline progress ── */
  const [activeAgentIdx, setActiveAgentIdx] = useState(0)
  const [completedAgents, setCompletedAgents] = useState<Set<number>>(new Set())
  const [allDone, setAllDone] = useState(false)
  const [transitioning, setTransitioning] = useState(false)

  /* ── Backend Integration State ── */
  const [apiResult, setApiResult] = useState<ValidationResult | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(0)

  /* ── Rotating status message ── */
  const [msgIdx, setMsgIdx] = useState(0)
  const [msgVisible, setMsgVisible] = useState(true)

  const pipelineRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Trigger Backend Validation ── */
  useEffect(() => {
    let active = true
    setErrorMsg(null)

    validateStartupIdea({ startupIdea: idea, description })
      .then((result) => {
        if (!active) return
        setApiResult(result)
      })
      .catch((err) => {
        if (!active) return
        setErrorMsg(err.message || 'Validation service failed. Please try again.')
      })

    return () => {
      active = false
    }
  }, [idea, description, isRetrying])

  /* ── Run visual agent pipeline progress ── */
  useEffect(() => {
    let cancelled = false
    let idx = 0

    const runNext = () => {
      if (cancelled || idx >= AGENTS.length) return
      const agent = AGENTS[idx]

      pipelineRef.current = setTimeout(() => {
        if (cancelled) return
        setCompletedAgents((prev) => new Set([...prev, idx]))
        idx++
        if (idx < AGENTS.length) {
          setActiveAgentIdx(idx)
          runNext()
        } else {
          // Visual pipeline complete
          if (!cancelled) {
            setAllDone(true)
          }
        }
      }, agent.duration)
    }

    runNext()
    return () => {
      cancelled = true
      if (pipelineRef.current) clearTimeout(pipelineRef.current)
    }
  }, [isRetrying])

  /* ── Rotate status message every 3.5s ── */
  useEffect(() => {
    const rotate = setInterval(() => {
      setMsgVisible(false)
      setTimeout(() => {
        setMsgIdx((i) => (i + 1) % STATUS_MESSAGES.length)
        setMsgVisible(true)
      }, 350)
    }, 3500)
    return () => clearInterval(rotate)
  }, [])

  /* ── Navigate to results once allDone AND apiResult ready ── */
  useEffect(() => {
    if (errorMsg) return
    if (!allDone) return

    // If visual pipeline finished but API is still processing, mark all agents complete once API responds
    if (!apiResult) return

    setTransitioning(true)
    const t = setTimeout(() => {
      navigate('/results', {
        state: {
          data: apiResult,
          idea,
          description,
        },
      })
    }, 1800)
    return () => clearTimeout(t)
  }, [allDone, apiResult, errorMsg, navigate, idea, description])

  /* ── Determine status of each agent ── */
  const getStatus = (idx: number): AgentStatus => {
    if (completedAgents.has(idx) || allDone) return 'done'
    if (idx === activeAgentIdx && !completedAgents.has(idx)) return 'running'
    return 'waiting'
  }

  const totalMs = AGENTS.reduce((s, a) => s + a.duration, 0)
  const estimateSec = Math.round(totalMs / 1000)

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
          {/* ── Small AI badge ── */}
          <motion.div {...fadeUp(0)} style={{ marginBottom: '32px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#3b3bdb0f',
                border: '1px solid #3b3bdb22',
                borderRadius: '100px',
                padding: '6px 16px',
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={13} color={C.accent} strokeWidth={2.5} />
              </motion.div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: C.accent,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                AI Analysis Running
              </span>
            </div>
          </motion.div>

          {/* ── Logo / Brand ── */}
          <motion.div {...fadeUp(0.06)} style={{ marginBottom: '12px' }}>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '18px',
                fontWeight: 800,
                color: C.primary,
                letterSpacing: '-0.04em',
              }}
            >
              BeforeBeta
            </span>
          </motion.div>

          {/* ── Error Notification Card ── */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1.5px solid #fee2e2',
                borderRadius: '20px',
                padding: '28px',
                boxShadow: '0 8px 30px rgba(239,68,68,0.08)',
                marginBottom: '36px',
                textAlign: 'center',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <AlertTriangle size={24} color="#dc2626" strokeWidth={2} />
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: C.primary,
                  marginBottom: '8px',
                  letterSpacing: '-0.02em',
                }}
              >
                Validation Encountered an Issue
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: C.secondary,
                  lineHeight: '1.6',
                  marginBottom: '24px',
                  maxWidth: '440px',
                  margin: '0 auto 24px',
                }}
              >
                {errorMsg}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    setErrorMsg(null)
                    setAllDone(false)
                    setCompletedAgents(new Set())
                    setActiveAgentIdx(0)
                    setIsRetrying((prev) => prev + 1)
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '11px 22px',
                    backgroundColor: C.accent,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <RotateCcw size={15} strokeWidth={2.2} />
                  Retry Validation
                </button>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '11px 22px',
                    backgroundColor: 'transparent',
                    color: C.primary,
                    border: `1.5px solid ${C.border}`,
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  <ArrowLeft size={15} strokeWidth={2.2} />
                  Back to Home
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Main heading ── */}
          <motion.h1
            {...fadeUp(0.1)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 800,
              lineHeight: '1.1',
              letterSpacing: '-0.04em',
              color: C.primary,
              textAlign: 'center',
              marginBottom: '16px',
            }}
          >
            {errorMsg ? (
              <span style={{ color: '#dc2626' }}>Validation Interrupted</span>
            ) : allDone ? (
              <span style={{ color: C.accent }}>✓ Validation Complete</span>
            ) : (
              'Validating Your Startup'
            )}
          </motion.h1>

          {/* ── Sub-copy ── */}
          <motion.p
            {...fadeUp(0.16)}
            style={{
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: '1.70',
              color: C.secondary,
              textAlign: 'center',
              maxWidth: '420px',
              marginBottom: '44px',
            }}
          >
            {allDone
              ? 'Preparing your dashboard...'
              : 'Our AI agents are analyzing your idea using live market intelligence.'}
          </motion.p>

          {/* ── Bar Loader ── */}
          {!allDone && (
            <motion.div
              {...fadeUp(0.22)}
              style={{ marginBottom: '48px' }}
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
              style={{ marginBottom: '48px' }}
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
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '16px',
                    fontWeight: 700,
                    color: C.primary,
                    letterSpacing: '-0.02em',
                  }}
                >
                  5 AI Agents Working
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
                  {completedAgents.size}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: C.muted,
                    fontWeight: 500,
                  }}
                >
                  / {AGENTS.length}
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
                    {STATUS_MESSAGES[msgIdx]}
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
                {Math.round(estimateSec / 5) * 5 - 5}–{Math.round(estimateSec / 5) * 5} seconds
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
