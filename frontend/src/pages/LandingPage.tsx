import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { ArrowRight, Play, TrendingUp, Users, BarChart3, Globe, FileText, GitCompare } from 'lucide-react'

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
  const [focusedField, setFocusedField] = useState<'idea' | 'desc' | null>(null)

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
          backgroundColor: scrolled ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
          borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'background-color 0.3s ease, border-color 0.3s ease',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 40px',
            height: '70px',
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

          {/* Nav links — centered */}
          <nav
            id="nav-links"
            style={{ display: 'flex', alignItems: 'center', gap: '40px' }}
            className="hidden md:flex"
          >
            {(['Features', 'Workflow', 'Report Preview', 'About'] as const).map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
                style={{
                  fontSize: '14.5px',
                  fontWeight: 500,
                  color: C.primary,
                  textDecoration: 'none',
                  opacity: 0.6,
                  transition: 'opacity 0.2s ease',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA button — rounded white style matching reference */}
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
              padding: '10px 22px',
              fontSize: '14px',
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
                  }}
                >
                  <Play size={11} fill="#3b3bdb" color="#3b3bdb" strokeWidth={0} style={{ marginLeft: '2px' }} />
                </span>
                Watch video
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
              Five specialized agents.<br />One complete validation.
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: C.secondary,
                lineHeight: '1.7',
                maxWidth: '480px',
              }}
            >
              BeforeBeta runs a pipeline of five AI agents in sequence. Each agent
              handles a distinct part of the validation — from market research to
              the final report.
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
              {
                id: 'agent-report',
                step: '05',
                icon: FileText,
                title: 'Report Generator Agent',
                desc: 'Compiles all findings into a structured startup validation report.',
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
          padding: '96px 40px 120px',
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
            {/* Idea input */}
            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="startup-idea"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: C.primary,
                  letterSpacing: '-0.01em',
                  marginBottom: '10px',
                }}
              >
                Startup Idea
              </label>
              <input
                id="startup-idea"
                type="text"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onFocus={() => setFocusedField('idea')}
                onBlur={() => setFocusedField(null)}
                placeholder="e.g. A marketplace for vintage furniture rentals"
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  fontSize: '15px',
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

            {/* Description textarea */}
            <div style={{ marginBottom: '32px' }}>
              <label
                htmlFor="startup-description"
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: C.primary,
                  letterSpacing: '-0.01em',
                  marginBottom: '10px',
                }}
              >
                Description
                <span
                  style={{
                    fontWeight: 400,
                    color: C.muted,
                    fontSize: '12px',
                  }}
                >
                  optional
                </span>
              </label>
              <textarea
                id="startup-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onFocus={() => setFocusedField('desc')}
                onBlur={() => setFocusedField(null)}
                placeholder="What problem are you solving? Who is your target customer? What makes your solution unique?"
                rows={5}
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  fontSize: '15px',
                  color: C.primary,
                  backgroundColor: '#fafafe',
                  border: `1.5px solid ${focusedField === 'desc' ? C.accent : C.border}`,
                  borderRadius: '12px',
                  outline: 'none',
                  lineHeight: '1.65',
                  transition: 'border-color 0.2s ease',
                  fontFamily: "'DM Sans', sans-serif",
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Validate button */}
            <motion.button
              id="validate-btn"
              onClick={() => {
                if (!idea.trim()) return
                navigate('/loading', { state: { idea, description } })
              }}
              whileHover={{ scale: 1.015, y: -2, boxShadow: '0 10px 32px rgba(59,59,219,0.30)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%',
                padding: '15px 24px',
                backgroundColor: idea.trim() ? C.accent : '#9090b0',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15.5px',
                fontWeight: 700,
                cursor: idea.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '-0.02em',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'background-color 0.2s ease',
              }}
            >
              Validate My Startup
              <ArrowRight size={16} strokeWidth={2.5} />
            </motion.button>

            {/* Disclaimer */}
            <p
              style={{
                textAlign: 'center',
                fontSize: '12px',
                color: C.muted,
                marginTop: '16px',
              }}
            >
              Free to try · No credit card required · Results in under 60 seconds
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer
        style={{
          borderTop: `1px solid ${C.border}`,
          backgroundColor: '#FFFFFF',
          padding: '60px 40px 40px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Top row */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-16"
            style={{ marginBottom: '48px' }}
          >
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
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
              </div>
              <p
                style={{
                  fontSize: '14px',
                  color: C.secondary,
                  lineHeight: '1.7',
                  maxWidth: '220px',
                }}
              >
                AI-powered startup validation for founders who build with intention.
              </p>
            </div>

            {/* Link columns */}
            {(
              [
                { heading: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
                { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
                { heading: 'Legal',   links: ['Privacy', 'Terms', 'Cookies', 'Security'] },
              ] as const
            ).map(({ heading, links }) => (
              <div key={heading}>
                <h4
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: C.primary,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '18px',
                  }}
                >
                  {heading}
                </h4>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '11px',
                  }}
                >
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        style={{
                          fontSize: '14px',
                          color: C.secondary,
                          opacity: 0.6,
                          textDecoration: 'none',
                          transition: 'opacity 0.2s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: '24px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <p style={{ fontSize: '13px', color: C.muted }}>
              © {new Date().getFullYear()} BeforeBeta. All rights reserved.
            </p>
            <p style={{ fontSize: '13px', color: C.muted }}>
              Made for founders, by founders.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
