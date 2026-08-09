import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { ArrowRight, Workflow, TrendingUp, Users, BarChart3, Globe, FileText, GitCompare } from 'lucide-react'

/* ─── Transition presets ─────────────────────────────── */
const ease = [0.25, 0.1, 0.25, 1] as const

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease },
})

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.7, delay, ease },
})

/* ─── Brand palette ──────────────────────────────────── */
const C = {
  bg:        '#FFFFFF',
  surface:   '#FFFFFF',
  primary:   '#1a1a2e',
  secondary: '#5a5a8a',
  accent:    '#3b3bdb',
  accentDk:  '#2828b8',
  wave:      '#3b3bdb',
  border:    '#e8e8f0',
  muted:     '#8888aa',
} as const

/* ─── Floating card data ─────────────────────────────── */
const floatingCards = [
  { id: 'market-size',    label: 'Market Size',       value: '$120M',  icon: Globe,       color: '#3b3bdb', delay: 0 },
  { id: 'growth-rate',    label: 'Growth Rate',       value: '28%',    icon: TrendingUp,  color: '#6c6cec', delay: 0.2 },
  { id: 'val-score',      label: 'Validation Score',  value: '91/100', icon: BarChart3,   color: '#3b3bdb', delay: 0.4 },
  { id: 'competitors',    label: 'Competitors',        value: '8',      icon: Users,       color: '#5a5adf', delay: 0.1 },
  { id: 'market-opp',     label: 'Market Opportunity', value: 'High',  icon: GitCompare,  color: '#3b3bdb', delay: 0.3 },
  { id: 'ai-insights',    label: 'Report Ready',       value: 'Yes',   icon: FileText,    color: '#6c6cec', delay: 0.5 },
] as const



/* ═══════════════════════════════════════════════════════
   FLOATING CARD COMPONENT
═══════════════════════════════════════════════════════ */
function FloatCard({
  card,
  style,
}: {
  card: typeof floatingCards[number]
  style?: React.CSSProperties
}) {
  const Icon = card.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: card.delay + 0.3, ease }}
      style={{
        position: 'absolute',
        background: '#ffffff',
        border: '1px solid #e4e4f0',
        borderRadius: '16px',
        padding: '14px 18px',
        boxShadow: '0 4px 28px rgba(59,59,219,0.10), 0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* Icon bubble */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: card.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={17} color="#ffffff" strokeWidth={2.2} />
      </div>

      {/* Text */}
      <div>
        <div
          style={{
            fontSize: '9.5px',
            fontWeight: 700,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: '#9090b0',
            lineHeight: 1,
            marginBottom: '5px',
          }}
        >
          {card.label}
        </div>
        <div
          style={{
            fontSize: card.id === 'val-score' ? '16px' : '18px',
            fontWeight: 800,
            color: card.id === 'val-score' ? '#3b3bdb' : '#1a1a2e',
            lineHeight: 1,
            letterSpacing: '-0.03em',
          }}
        >
          {card.value}
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN LANDING PAGE
═══════════════════════════════════════════════════════ */
export default function LandingPage() {

  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [idea, setIdea] = useState('')
  const [description, setDescription] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [customIndustry, setCustomIndustry] = useState('')
  const [targetCustomer, setTargetCustomer] = useState('')
  const [targetCountry, setTargetCountry] = useState('India')
  const [startupStage, setStartupStage] = useState('')
  const [businessModel, setBusinessModel] = useState('')
  const [keyFeatures, setKeyFeatures] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* Mouse parallax */
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 })
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 })
  const illustrationX = useTransform(springX, [-0.5, 0.5], [-8, 8])
  const illustrationY = useTransform(springY, [-0.5, 0.5], [-6, 6])

  const heroRef = useRef<HTMLElement>(null)
  const formRef = useRef<HTMLElement>(null)
  const formInView = useInView(formRef, { once: true, margin: '-80px' })

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = heroRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <div style={{ backgroundColor: C.bg, color: C.primary, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ══════════════════════════════════════
          NAVIGATION
      ══════════════════════════════════════ */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.85)',
          borderBottom: `1px solid ${C.border}`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 32px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <a
            href="/"
            id="nav-logo"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
          >
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '20px',
                fontWeight: 800,
                color: C.primary,
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              BeforeBeta
            </span>
          </a>

          {/* Action CTA */}
          <motion.a
            id="nav-cta"
            href="#validate"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: C.accent,
              color: '#FFFFFF',
              textDecoration: 'none',
              border: 'none',
              borderRadius: '100px',
              padding: '9px 20px',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            Start Validation
          </motion.a>
        </div>
      </header>

      {/* ══════════════════════════════════════
          HERO SECTION
          - Large headline on left
          - Illustration on right, overlapping wave
      ══════════════════════════════════════ */}
      <section
        id="hero"
        ref={heroRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          paddingTop: '140px',
          paddingBottom: '100px',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* ── Large organic wave shape (top-right, behind illustration) ── */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-80px',
            width: '58%',
            height: '110%',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          <svg
            viewBox="0 0 700 800"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: '100%' }}
            preserveAspectRatio="xMaxYMin meet"
          >
            {/* Solid royal blue / indigo organic wave — matches reference */}
            <path
              d="M700 0 L700 800 L120 800 Q0 700 60 550 Q110 430 30 310 Q-40 190 80 100 Q180 20 320 50 Q450 80 560 10 Z"
              fill="#3b3bdb"
            />
          </svg>
        </div>

        {/* ── Hero content ── */}
        <div
          className="hero-grid"
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 40px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Left: copy */}
          <div>
            {/* Overline */}
            <motion.p
              {...fadeUp(0)}
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.accent,
                marginBottom: '24px',
              }}
            >
              AI Startup Validation
            </motion.p>

            {/* H1 — large bold, matching reference weight */}
            <motion.h1
              {...fadeUp(0.08)}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 'clamp(44px, 5.4vw, 72px)',
                fontWeight: 800,
                lineHeight: '1.05',
                letterSpacing: '-0.04em',
                color: C.primary,
                marginBottom: '28px',
              }}
            >
              Validate Your<br />
              Startup Idea{' '}
              <span
                style={{
                  color: C.accent,
                  fontWeight: 800,
                }}
              >
                Before
              </span>
              <br />
              You Build.
            </motion.h1>

            {/* Sub-copy */}
            <motion.p
              {...fadeUp(0.18)}
              style={{
                fontSize: '16.5px',
                fontWeight: 400,
                lineHeight: '1.70',
                color: C.secondary,
                maxWidth: '400px',
                marginBottom: '44px',
              }}
            >
              Stop building in the dark. BeforeBeta maps your idea against
              real market signals, competitor landscapes, and opportunity gaps —
              in seconds.
            </motion.p>

            {/* CTA buttons row — matches reference layout */}
            <motion.div
              {...fadeUp(0.26)}
              style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}
            >
              <motion.a
                id="hero-cta"
                href="#validate"
                whileHover={{ scale: 1.03, y: -2, boxShadow: '0 10px 32px rgba(59,59,219,0.35)' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: C.accent,
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  borderRadius: '12px',
                  padding: '14px 28px',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  border: 'none',
                }}
              >
                Get started
                <ArrowRight size={16} strokeWidth={2.5} />
              </motion.a>

              <motion.a
                id="hero-watch"
                href="#features"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'transparent',
                  color: C.primary,
                  textDecoration: 'none',
                  border: '1.5px solid #d0d0e8',
                  borderRadius: '12px',
                  padding: '13px 24px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                }}
              >
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#3b3bdb15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Workflow size={14} color="#3b3bdb" strokeWidth={2.2} />
                </span>
                View AI Workflow
              </motion.a>
            </motion.div>
          </div>

          {/* Right: Illustration + floating cards */}
          <motion.div
            className="hidden lg:flex"
            style={{
              position: 'relative',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '520px',
              x: illustrationX,
              y: illustrationY,
            }}
            {...fadeIn(0.2)}
          >
            {/* Floating oscillation wrapper */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 5,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatType: 'loop',
              }}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '500px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Circular illustration — NOT cropped, centered over wave */}
              <img
                src="/hero-illustration.jpg"
                alt="A founder at a laptop with an AI assistant surfacing market insights, validation scores, and startup data"
                style={{
                  width: '100%',
                  maxWidth: '480px',
                  height: 'auto',
                  display: 'block',
                  borderRadius: '50%',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  position: 'relative',
                  zIndex: 3,
                  filter: 'drop-shadow(0 16px 48px rgba(59,59,219,0.20))',
                }}
                draggable={false}
              />

              {/* ── Floating cards positioned around illustration ── */}

              {/* Market Size — top left */}
              <FloatCard
                card={floatingCards[0]}
                style={{ top: '12%', left: '-22%', zIndex: 10 }}
              />

              {/* Growth Rate — top right */}
              <FloatCard
                card={floatingCards[1]}
                style={{ top: '8%', right: '-18%', zIndex: 10 }}
              />

              {/* Validation Score — center left */}
              <FloatCard
                card={floatingCards[2]}
                style={{ top: '42%', left: '-26%', zIndex: 10 }}
              />

              {/* Competitors — far left */}
              <FloatCard
                card={floatingCards[3]}
                style={{ top: '68%', left: '-20%', zIndex: 10 }}
              />

              {/* Market Opportunity — right center */}
              <FloatCard
                card={floatingCards[4]}
                style={{ top: '55%', right: '-22%', zIndex: 10 }}
              />

              {/* AI Insights — bottom right */}
              <FloatCard
                card={floatingCards[5]}
                style={{ bottom: '10%', right: '-16%', zIndex: 10 }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>



      {/* ══════════════════════════════════════
          FEATURES SECTION
      ══════════════════════════════════════ */}
      <section
        id="features"
        style={{ padding: '100px 40px', backgroundColor: '#FFFFFF' }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section header */}
          <div style={{ marginBottom: '64px' }}>
            <p
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.accent,
                marginBottom: '16px',
              }}
            >
              How it works
            </p>
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 'clamp(32px, 4vw, 52px)',
                fontWeight: 800,
                lineHeight: '1.1',
                letterSpacing: '-0.04em',
                color: C.primary,
                maxWidth: '600px',
                marginBottom: '20px',
              }}
            >
              Four specialized agents.<br />One complete validation.
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: C.secondary,
                lineHeight: '1.7',
                maxWidth: '480px',
              }}
            >
              BeforeBeta runs a pipeline of four AI agents in sequence. Each agent
              handles a distinct part of the validation — from market research to
              competitive benchmarking.
            </p>
          </div>

          {/* Agent cards grid — 5 agents, single row on wide screens */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            {[
              {
                id: 'agent-web-search',
                step: '01',
                icon: Globe,
                title: 'Web Search Agent',
                desc: 'Searches trusted web sources for relevant market information about your startup idea.',
              },
              {
                id: 'agent-market-opp',
                step: '02',
                icon: TrendingUp,
                title: 'Market Opportunity Agent',
                desc: 'Analyzes market size, growth trends, and the opportunity available in your space.',
              },
              {
                id: 'agent-competitor',
                step: '03',
                icon: Users,
                title: 'Competitor Discovery Agent',
                desc: 'Finds similar products and identifies direct competitors in your target market.',
              },
              {
                id: 'agent-comparison',
                step: '04',
                icon: GitCompare,
                title: 'Comparison Agent',
                desc: 'Compares strengths, weaknesses, opportunities, and gaps against what already exists.',
              },
            ].map((agent) => {
              const Icon = agent.icon
              return (
                <motion.div
                  key={agent.id}
                  id={agent.id}
                  whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(59,59,219,0.10)' }}
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${C.border}`,
                    borderRadius: '20px',
                    padding: '28px 24px',
                    cursor: 'default',
                    transition: 'box-shadow 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0px',
                  }}
                >
                  {/* Step number + icon row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '20px',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '13px',
                        background: '#3b3bdb12',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={20} color={C.accent} strokeWidth={2} />
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#c0c0e0',
                        letterSpacing: '0.06em',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {agent.step}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '15.5px',
                      fontWeight: 700,
                      color: C.primary,
                      letterSpacing: '-0.02em',
                      marginBottom: '10px',
                      lineHeight: '1.25',
                    }}
                  >
                    {agent.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '13.5px',
                      color: C.secondary,
                      lineHeight: '1.65',
                    }}
                  >
                    {agent.desc}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          VALIDATE / INPUT SECTION
      ══════════════════════════════════════ */}
      <section
        id="validate"
        ref={formRef}
        style={{
          padding: '96px 40px 64px',
          backgroundColor: '#f8f8ff',
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          {/* Section heading */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={formInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, ease }}
            style={{ marginBottom: '52px' }}
          >
            <p
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.accent,
                marginBottom: '18px',
              }}
            >
              Get started
            </p>
            <h2
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 'clamp(32px, 4vw, 48px)',
                fontWeight: 800,
                lineHeight: '1.1',
                letterSpacing: '-0.04em',
                color: C.primary,
                marginBottom: '16px',
              }}
            >
              What's your startup idea?
            </h2>
            <p
              style={{
                fontSize: '15.5px',
                fontWeight: 400,
                lineHeight: '1.65',
                color: C.secondary,
                maxWidth: '400px',
              }}
            >
              Describe what you're building. Our AI validates it across market
              signals, competitive landscape, and opportunity gaps.
            </p>
          </motion.div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={formInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.12, ease }}
            style={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${C.border}`,
              borderRadius: '24px',
              padding: '40px',
              boxShadow: '0 8px 40px rgba(59,59,219,0.08)',
            }}
          >
            {/* ══════════════════════════════════════════
                SECTION 1: REQUIRED INFORMATION
            ══════════════════════════════════════════ */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: C.accent,
                    backgroundColor: '#3b3bdb12',
                    padding: '4px 10px',
                    borderRadius: '6px',
                  }}
                >
                  Required Information
                </span>
              </div>

              {/* 1. Idea input (Required) */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="startup-idea"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: C.primary,
                    letterSpacing: '-0.01em',
                    marginBottom: '8px',
                  }}
                >
                  Startup Idea *
                </label>
                <input
                  id="startup-idea"
                  type="text"
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onFocus={() => setFocusedField('idea')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="e.g. AI Meal Planner for Diabetic Patients"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14.5px',
                    color: C.primary,
                    backgroundColor: '#fafafe',
                    border: `1.5px solid ${focusedField === 'idea' ? C.accent : C.border}`,
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              </div>

              {/* 2. Description (Required) */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="startup-description"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: C.primary,
                    letterSpacing: '-0.01em',
                    marginBottom: '8px',
                  }}
                >
                  Description *
                </label>
                <textarea
                  id="startup-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onFocus={() => setFocusedField('desc')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="What problem are you solving? What makes your solution unique?"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14.5px',
                    color: C.primary,
                    backgroundColor: '#fafafe',
                    border: `1.5px solid ${focusedField === 'desc' ? C.accent : C.border}`,
                    borderRadius: '12px',
                    outline: 'none',
                    lineHeight: '1.6',
                    transition: 'border-color 0.2s ease',
                    fontFamily: "'DM Sans', sans-serif",
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* 2-Column Grid for Industry & Target Customer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                {/* 3. Industry / Domain (Required Searchable Dropdown) */}
                <div>
                  <label
                    htmlFor="startup-industry"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: C.primary,
                      letterSpacing: '-0.01em',
                      marginBottom: '8px',
                    }}
                  >
                    Industry / Domain *
                  </label>
                  <select
                    id="startup-industry"
                    value={selectedIndustry}
                    onChange={(e) => setSelectedIndustry(e.target.value)}
                    onFocus={() => setFocusedField('industry')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '14.5px',
                      color: selectedIndustry ? C.primary : C.muted,
                      backgroundColor: '#fafafe',
                      border: `1.5px solid ${focusedField === 'industry' ? C.accent : C.border}`,
                      borderRadius: '12px',
                      outline: 'none',
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <option value="" disabled hidden>
                      Select Industry
                    </option>
                    <option value="AI & Machine Learning">AI & Machine Learning</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="FinTech">FinTech</option>
                    <option value="EdTech">EdTech</option>
                    <option value="CleanTech">CleanTech</option>
                    <option value="AgriTech">AgriTech</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="FoodTech">FoodTech</option>
                    <option value="Travel">Travel</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="SaaS">SaaS</option>
                    <option value="Other">Other</option>
                  </select>

                  {/* Empty state hint if Industry is not selected */}
                  {!selectedIndustry && (
                    <p style={{ fontSize: '12px', color: C.accent, marginTop: '6px', fontWeight: 500 }}>
                      Choose an industry to receive more accurate market insights.
                    </p>
                  )}

                  {/* Render text input if 'Other' is selected */}
                  {selectedIndustry === 'Other' && (
                    <input
                      type="text"
                      value={customIndustry}
                      onChange={(e) => setCustomIndustry(e.target.value)}
                      onFocus={() => setFocusedField('customIndustry')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Specify custom industry..."
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '10px 14px',
                        fontSize: '14px',
                        color: C.primary,
                        backgroundColor: '#fafafe',
                        border: `1.5px solid ${focusedField === 'customIndustry' ? C.accent : C.border}`,
                        borderRadius: '10px',
                        outline: 'none',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    />
                  )}
                </div>

                {/* 4. Target Customer (Required) */}
                <div>
                  <label
                    htmlFor="startup-customer"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: C.primary,
                      letterSpacing: '-0.01em',
                      marginBottom: '8px',
                    }}
                  >
                    Target Customer *
                  </label>
                  <input
                    id="startup-customer"
                    type="text"
                    value={targetCustomer}
                    onChange={(e) => setTargetCustomer(e.target.value)}
                    onFocus={() => setFocusedField('customer')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="e.g. Students, Doctors, Small Businesses, Farmers, HR Teams"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '14.5px',
                      color: C.primary,
                      backgroundColor: '#fafafe',
                      border: `1.5px solid ${focusedField === 'customer' ? C.accent : C.border}`,
                      borderRadius: '12px',
                      outline: 'none',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </div>
              </div>

                {/* 5. Target Country (Required Dropdown) */}
                <div style={{ marginBottom: '16px' }}>
                  <label
                    htmlFor="target-country"
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: C.primary,
                      letterSpacing: '-0.01em',
                      marginBottom: '8px',
                    }}
                  >
                    Target Country *
                  </label>
                  <select
                    id="target-country"
                    value={targetCountry}
                    onChange={(e) => setTargetCountry(e.target.value)}
                    onFocus={() => setFocusedField('country')}
                    onBlur={() => setFocusedField(null)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '14.5px',
                      color: C.primary,
                      backgroundColor: '#fafafe',
                      border: `1.5px solid ${focusedField === 'country' ? C.accent : C.border}`,
                      borderRadius: '12px',
                      outline: 'none',
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <option value="India">India</option>
                    <option value="USA">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Germany">Germany</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Global">Global</option>
                  </select>
                </div>
              </div>

              {/* ══════════════════════════════════════════
                  SUBTLE SECTION DIVIDER
              ══════════════════════════════════════════ */}
              <div style={{ height: '1px', backgroundColor: '#e8e8f4', margin: '24px 0' }} />

              {/* ══════════════════════════════════════════
                  SECTION 2: ADDITIONAL DETAILS (OPTIONAL)
              ══════════════════════════════════════════ */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: C.secondary,
                      backgroundColor: '#f0f0f8',
                      padding: '4px 10px',
                      borderRadius: '6px',
                    }}
                  >
                    Additional Details (Optional)
                  </span>
                </div>

                {/* 2-Column Grid for Startup Stage & Business Model */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  {/* 6. Startup Stage */}
                  <div>
                    <label
                      htmlFor="startup-stage"
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '4px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: C.primary,
                        letterSpacing: '-0.01em',
                        marginBottom: '8px',
                      }}
                    >
                      Startup Stage
                      <span style={{ fontWeight: 400, color: C.muted, fontSize: '11px' }}>(optional)</span>
                    </label>
                    <select
                      id="startup-stage"
                      value={startupStage}
                      onChange={(e) => setStartupStage(e.target.value)}
                      onFocus={() => setFocusedField('stage')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '14.5px',
                        color: startupStage ? C.primary : C.muted,
                        backgroundColor: '#fafafe',
                        border: `1.5px solid ${focusedField === 'stage' ? C.accent : C.border}`,
                        borderRadius: '12px',
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <option value="" disabled hidden>
                        Select Startup Stage
                      </option>
                      <option value="Idea">Idea</option>
                      <option value="MVP">MVP</option>
                      <option value="Beta">Beta</option>
                      <option value="Launched">Launched</option>
                    </select>
                  </div>

                  {/* 7. Business Model */}
                  <div>
                    <label
                      htmlFor="business-model"
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '4px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: C.primary,
                        letterSpacing: '-0.01em',
                        marginBottom: '8px',
                      }}
                    >
                      Business Model
                      <span style={{ fontWeight: 400, color: C.muted, fontSize: '11px' }}>(optional)</span>
                    </label>
                    <select
                      id="business-model"
                      value={businessModel}
                      onChange={(e) => setBusinessModel(e.target.value)}
                      onFocus={() => setFocusedField('model')}
                      onBlur={() => setFocusedField(null)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '14.5px',
                        color: businessModel ? C.primary : C.muted,
                        backgroundColor: '#fafafe',
                        border: `1.5px solid ${focusedField === 'model' ? C.accent : C.border}`,
                        borderRadius: '12px',
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <option value="" disabled hidden>
                        Select Business Model
                      </option>
                      <option value="B2B">B2B</option>
                      <option value="B2C">B2C</option>
                      <option value="SaaS">SaaS</option>
                      <option value="Marketplace">Marketplace</option>
                      <option value="Subscription">Subscription</option>
                      <option value="Enterprise">Enterprise</option>
                      <option value="Freemium">Freemium</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* 8. Key Features */}
                <div>
                  <label
                    htmlFor="key-features"
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: '4px',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: C.primary,
                      letterSpacing: '-0.01em',
                      marginBottom: '8px',
                    }}
                  >
                    Key Features
                    <span style={{ fontWeight: 400, color: C.muted, fontSize: '11px' }}>(optional)</span>
                  </label>
                  <input
                    id="key-features"
                    type="text"
                    value={keyFeatures}
                    onChange={(e) => setKeyFeatures(e.target.value)}
                    onFocus={() => setFocusedField('features')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="e.g. AI chatbot, Voice assistant, OCR scanning, WhatsApp integration"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '14.5px',
                      color: C.primary,
                      backgroundColor: '#fafafe',
                      border: `1.5px solid ${focusedField === 'features' ? C.accent : C.border}`,
                      borderRadius: '12px',
                      outline: 'none',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  />
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              {(() => {
                const activeIndustry = selectedIndustry === 'Other' ? customIndustry : selectedIndustry
                
                const isFormValid =
                  idea.trim() !== '' &&
                  description.trim() !== '' &&
                  activeIndustry.trim() !== '' &&
                  targetCustomer.trim() !== '' &&
                  targetCountry.trim() !== ''

                return (
                  <motion.button
                    id="validate-btn"
                    onClick={() => {
                      if (!isFormValid) return
                      const featureList = keyFeatures
                        .split(',')
                        .map((f) => f.trim())
                        .filter(Boolean)

                      navigate('/loading', {
                        state: {
                          idea,
                          description,
                          industry: activeIndustry,
                          targetCustomer,
                          targetCountry,
                          startupStage,
                          businessModel,
                          keyFeatures: featureList,
                        },
                      })
                    }}
                    whileHover={isFormValid ? { scale: 1.01, y: -1 } : {}}
                    whileTap={isFormValid ? { scale: 0.98 } : {}}
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      backgroundColor: isFormValid ? C.accent : '#9090b0',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: isFormValid ? 'pointer' : 'not-allowed',
                      opacity: isFormValid ? 1 : 0.6,
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: '-0.01em',
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    Validate Startup Idea
                  </motion.button>
                )
              })()}

          </motion.div>

        </div>
      </section>


    </div>
  )
}
