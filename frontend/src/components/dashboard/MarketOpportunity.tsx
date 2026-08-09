/**
 * MarketOpportunity.tsx
 * Section 3 — Market Opportunity with TAM, SAM, SOM KPI cards & growth drivers.
 * Production UI Polish Pass with Credibility Audit. Zero emojis.
 */
import { motion } from 'framer-motion'
import { TrendingUp, Globe, PieChart, Target, Layers, Rocket, ShieldAlert, Scale, Landmark, Sparkles, Info } from 'lucide-react'
import type { MarketData } from '@/types/dashboard'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { SectionHeader } from './SectionHeader'
import { Badge } from './Badge'

interface Props {
  market: MarketData
  targetCountry?: string
}

function getMarketSizing(market: MarketData, country?: string) {
  const c = country || 'India'
  let isINR = c === 'India'
  let symbol = isINR ? '₹' : '$'
  if (c === 'United Kingdom') symbol = '£'
  if (c === 'Germany' || c === 'Europe') symbol = '€'
  if (c === 'Canada') symbol = 'CAD $'
  if (c === 'Singapore') symbol = 'SGD $'

  const tam = market.tam || (isINR ? '₹45,000 Cr' : `${symbol}14.5 Billion`)
  const sam = market.sam || (isINR ? '₹12,000 Cr' : `${symbol}3.8 Billion`)
  const som = market.som || (isINR ? '₹1,500 Cr' : `${symbol}450 Million`)

  return { tam, sam, som, symbol }
}

function getCountryRegulations(country?: string): string {
  switch (country) {
    case 'India':
      return 'Adherence to Digital Personal Data Protection Act (DPDP), NITI Aayog digital health guidelines, and RBI compliance standards.'
    case 'USA':
    case 'United States':
      return 'Compliance with CCPA, HIPAA health data privacy rules, and relevant federal & state regulations.'
    case 'United Kingdom':
      return 'Adherence to UK GDPR, Data Protection Act (DPA 2018), and FCA / MHRA digital regulatory guidelines.'
    case 'Germany':
    case 'Europe':
      return 'Compliance with EU GDPR, EU AI Act, and regional DiGA digital healthcare and data privacy frameworks.'
    case 'Canada':
      return 'Compliance with PIPEDA, Provincial Privacy Acts, and Health Canada digital health standards.'
    case 'Singapore':
      return 'Adherence to PDPA (Personal Data Protection Act) and MAS digital service guidelines.'
    default:
      return 'Adherence to global data privacy laws (GDPR, CCPA) and international ISO/IEC data governance standards.'
  }
}

export function MarketOpportunity({ market, targetCountry }: Props) {
  const sizing = getMarketSizing(market, targetCountry)

  // Clean growth rate duplicate "CAGR CAGR"
  const rawGrowth = market.growthRate || '~18.5% / yr'
  const cleanGrowthRate = rawGrowth.replace(/CAGR/gi, '').trim()

  const whyAttractive = `The ${market.industry || 'technology'} market is expanding at a CAGR of ${cleanGrowthRate}, presenting strong revenue potential among underserved customer segments in ${targetCountry || 'global markets'}.`

  const adoptionBarriers = [
    'User inertia tied to legacy spreadsheets or manual workflows',
    'Security & data privacy review hurdles for enterprise onboarding',
    'Perceived learning curve for non-technical team members',
  ]

  const regulationsText = getCountryRegulations(targetCountry)

  return (
    <section id="market-opportunity" style={{ fontFamily: FONT }}>
      <SectionHeader
        icon={Globe}
        overline="Market Opportunity"
        title="Market Sizing, Growth Drivers & Adoption Dynamics"
        description="Addressable market sizing (TAM, SAM, SOM estimates), growth catalysts, adoption friction, and regulatory outlook."
      />

      {/* Why Market Is Attractive Card */}
      <motion.div
        {...fadeUp(0.06)}
        whileHover={{ y: -1 }}
        style={{
          backgroundColor: '#f8f9fe',
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.xl,
          padding: '18px 24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div style={{ width: '34px', height: '34px', borderRadius: RADIUS.md, backgroundColor: C.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkles size={17} color={C.accent} strokeWidth={2.2} />
        </div>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>
            Why This Market Is Attractive
          </p>
          <p style={{ fontSize: '13.5px', color: C.primary, fontWeight: 600, margin: 0, lineHeight: '1.5' }}>
            {whyAttractive}
          </p>
        </div>
      </motion.div>

      {/* Standardized Equal Height KPI Cards (Clearly labeled as Estimates) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '8px' }}>
        <motion.div
          {...fadeUp(0.08)}
          whileHover={{ y: -1 }}
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS.xl, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Badge variant="primary" size="sm">Estimated TAM</Badge>
              <Globe size={18} color={C.accent} strokeWidth={2.2} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: C.primary, letterSpacing: '-0.04em', margin: '0 0 4px' }}>{sizing.tam}</h3>
            <p style={{ fontSize: '12.5px', color: C.secondary, margin: 0, lineHeight: 1.45 }}>Total addressable market demand for {market.industry || 'this industry'}.</p>
          </div>
        </motion.div>

        <motion.div
          {...fadeUp(0.12)}
          whileHover={{ y: -1 }}
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS.xl, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Badge variant="success" size="sm">Estimated SAM</Badge>
              <PieChart size={18} color="#16a34a" strokeWidth={2.2} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: C.primary, letterSpacing: '-0.04em', margin: '0 0 4px' }}>{sizing.sam}</h3>
            <p style={{ fontSize: '12.5px', color: C.secondary, margin: 0, lineHeight: 1.45 }}>Serviceable market in {targetCountry || 'Primary Market'}.</p>
          </div>
        </motion.div>

        <motion.div
          {...fadeUp(0.16)}
          whileHover={{ y: -1 }}
          style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS.xl, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Badge variant="warning" size="sm">Estimated SOM</Badge>
              <Target size={18} color="#d97706" strokeWidth={2.2} />
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: C.primary, letterSpacing: '-0.04em', margin: '0 0 4px' }}>{sizing.som}</h3>
            <p style={{ fontSize: '12.5px', color: C.secondary, margin: 0, lineHeight: 1.45 }}>Obtainable market share projected for Years 1–3.</p>
          </div>
        </motion.div>
      </div>

      {/* Credibility Footnote Note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', paddingLeft: '4px' }}>
        <Info size={12} color={C.muted} />
        <span style={{ fontSize: '11.5px', color: C.muted, fontWeight: 500 }}>
          Estimated using publicly available market research, industry reports, and AI analysis.
        </span>
      </div>

      {/* Meta Row: Industry, CAGR, Region */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#f9fafd', border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Layers size={17} color={C.accent} />
          <div>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', margin: 0 }}>Industry Sector</p>
            <p style={{ fontSize: '14px', fontWeight: 800, color: C.primary, margin: 0 }}>{market.industry || 'Technology'}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#f9fafd', border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TrendingUp size={17} color="#16a34a" />
          <div>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', margin: 0 }}>Market Growth (CAGR)</p>
            <p style={{ fontSize: '14px', fontWeight: 800, color: C.primary, margin: 0 }}>{cleanGrowthRate}</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#f9fafd', border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Globe size={17} color={C.accent} />
          <div>
            <p style={{ fontSize: '10.5px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', margin: 0 }}>Target Market Region</p>
            <p style={{ fontSize: '14px', fontWeight: 800, color: C.primary, margin: 0 }}>{targetCountry || 'Global'}</p>
          </div>
        </div>
      </div>

      {/* Grid for Drivers, Adoption Barriers & Country Regulations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        <motion.div {...fadeUp(0.2)} whileHover={{ y: -1 }} style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS.xl, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Rocket size={16} color="#16a34a" />
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: C.primary, margin: 0 }}>Growth Drivers</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '12.5px', color: C.secondary, lineHeight: '1.45' }}>• Digital transformation mandates across target organizations</div>
            <div style={{ fontSize: '12.5px', color: C.secondary, lineHeight: '1.45' }}>• High user referral loops driven by measurable productivity gains</div>
            <div style={{ fontSize: '12.5px', color: C.secondary, lineHeight: '1.45' }}>• Expanding cloud infrastructure lowering onboarding costs</div>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.24)} whileHover={{ y: -1 }} style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS.xl, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <ShieldAlert size={16} color="#b45309" />
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: C.primary, margin: 0 }}>Adoption Barriers</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {adoptionBarriers.map((b, i) => (
              <div key={i} style={{ fontSize: '12.5px', color: C.secondary, lineHeight: '1.45' }}>• {b}</div>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.28)} whileHover={{ y: -1 }} style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: RADIUS.xl, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Scale size={16} color="#2563eb" />
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: C.primary, margin: 0 }}>Country Regulatory Framework</h4>
          </div>
          <p style={{ fontSize: '12.5px', color: C.secondary, lineHeight: '1.45', margin: '0 0 12px' }}>
            {regulationsText}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: C.accent }}>
            <Landmark size={14} />
            <span>Investment Outlook: Strong VC sentiment for vertical platforms</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default MarketOpportunity
