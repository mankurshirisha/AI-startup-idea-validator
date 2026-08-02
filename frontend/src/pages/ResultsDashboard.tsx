/**
 * pages/ResultsDashboard.tsx
 * Results Dashboard — assembles all dashboard components.
 *
 * PLACEHOLDER DATA is defined inline here.
 * When integrating the backend:
 *   1. Replace `PLACEHOLDER_DATA` with an API call (useEffect + fetch / React Query).
 *   2. Add a loading state (the LoadingPage already handles that transition).
 *   3. Pass real `ValidationResult` data down to each component — zero component changes needed.
 */

import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import type { ValidationResult } from '@/types/dashboard'
import {
  DashboardSidebar,
  DashboardHeader,
  ExecutiveSummary,
  AgentPipeline,
  MarketOpportunity,
  CompetitorAnalysis,
  Recommendations,
  Sources,
} from '@/components/dashboard'

/* ════════════════════════════════════════════════════════
   PLACEHOLDER DATA
   Replace this with a real API response when the backend
   is integrated. All field shapes mirror ValidationResult.
════════════════════════════════════════════════════════ */
const PLACEHOLDER_DATA: ValidationResult = {
  idea:             'AI-powered fitness coaching app',
  description:      'A mobile app that uses AI to create personalized workout plans and provide real-time coaching.',
  createdAt:        new Date().toISOString(),
  validationScore:  74,
  status:           'Moderate',
  executiveSummary:
    'The AI fitness coaching market is growing, with several established players already operating in this space. ' +
    'The idea addresses a genuine user need — personalized, accessible fitness guidance — but faces meaningful competition. ' +
    'Differentiation through a specific niche or user segment will be important before launch.',

  agents: [
    {
      id:      'web-search',
      name:    'Web Search Agent',
      status:  'completed',
      summary: 'Retrieved market reports, news articles, and relevant web pages about AI fitness apps.',
      detail:  'Searched across 14 sources including Statista, TechCrunch, and industry blogs.',
    },
    {
      id:      'market-opp',
      name:    'Market Opportunity Agent',
      status:  'completed',
      summary: 'Analyzed addressable market size, annual growth rates, and user demand signals.',
      detail:  'Market estimated at $4.4B in 2024, growing ~25% annually through 2028.',
    },
    {
      id:      'competitor',
      name:    'Competitor Discovery Agent',
      status:  'completed',
      summary: 'Identified 4 direct competitors operating in the AI fitness coaching space.',
      detail:  'Competitors include Whoop, Future, Freeletics, and Tempo.',
    },
    {
      id:      'comparison',
      name:    'Comparison Agent',
      status:  'completed',
      summary: 'Compared your idea against competitors across features, pricing, and market positioning.',
      detail:  'Found opportunity in the budget-conscious segment currently underserved by premium offerings.',
    },
    {
      id:      'report',
      name:    'Report Generator Agent',
      status:  'completed',
      summary: 'Compiled all agent outputs into this structured validation report.',
      detail:  'Full report generated with executive summary, market data, and recommendations.',
    },
  ],

  market: {
    marketSize: '$4.4B',
    growthRate: '~25% / yr',
    industry:   'Health & Fitness Tech',
    trends: [
      'Wearable device integration is becoming a baseline expectation for fitness apps.',
      'Short-form, micro-workout formats are gaining traction among busy professionals.',
      'Subscription fatigue is increasing; users prefer one-time purchase or freemium models.',
      'Personalization is the primary differentiator users cite when choosing fitness apps.',
    ],
  },

  competitors: [
    {
      name:        'Future',
      description: 'Connects users with human coaches who deliver personalized plans via a mobile app.',
      strengths:   ['Human coaching adds trust', 'Strong retention metrics'],
      weaknesses:  ['High price point ($149/mo)', 'Scalability limited by coach availability'],
      website:     'https://www.future.co',
    },
    {
      name:        'Freeletics',
      description: 'AI-driven bodyweight workout app with a large global community.',
      strengths:   ['No equipment required', 'Large user base', 'Affordable pricing'],
      weaknesses:  ['Generic plans, limited personalization depth', 'Heavy reliance on community content'],
      website:     'https://www.freeletics.com',
    },
    {
      name:        'Tempo',
      description: 'AI-powered home gym with real-time motion tracking via a dedicated hardware device.',
      strengths:   ['Real-time form feedback', 'Premium hardware experience'],
      weaknesses:  ['High hardware cost ($2,000+)', 'Requires dedicated space'],
      website:     'https://tempo.fit',
    },
  ],

  recommendations: [
    'Define a narrow initial target segment — e.g., busy professionals aged 25–40 who want 20-minute workouts — rather than competing on breadth against established players.',
    'Validate pricing sensitivity early. Most established competitors charge $10–$149/month; test whether your target user will pay before building subscription infrastructure.',
    'Consider a freemium entry model with a clear upgrade path. This reduces acquisition friction in a market where trial fatigue is high.',
    'Wearable integration (Apple Watch, Garmin, Whoop) should be on the near-term roadmap. Users increasingly expect seamless data portability.',
    'Run a small closed beta with 20–50 users before expanding. Collect qualitative feedback on the AI coaching quality, not just retention numbers.',
  ],

  sources: [
    'https://www.statista.com/topics/4964/fitness-app-market/',
    'https://www.grandviewresearch.com/industry-analysis/fitness-app-market',
    'https://techcrunch.com/tag/fitness-tech/',
    'https://www.businessofapps.com/data/fitness-app-market/',
    'https://www.future.co',
    'https://www.freeletics.com',
    'https://tempo.fit',
  ],
}

/* ════════════════════════════════════════════════════════
   RESULTS DASHBOARD PAGE
════════════════════════════════════════════════════════ */
export default function ResultsDashboard() {
  const location = useLocation()

  /*
   * If navigated from LoadingPage, `location.state` contains { idea, description }.
   * Override the placeholder idea with the real user input so the header
   * shows what they actually typed — before full backend integration.
   */
  const state = location.state as { idea?: string; description?: string } | null
  const data: ValidationResult = {
    ...PLACEHOLDER_DATA,
    ...(state?.idea        ? { idea: state.idea }               : {}),
    ...(state?.description ? { description: state.description } : {}),
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
      }}
    >
      {/* ── Sidebar ── */}
      <DashboardSidebar />

      {/* ── Main scrollable area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {/* Sticky header */}
        <DashboardHeader data={data} />

        {/* Content */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{
            flex: 1,
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            gap: '48px',
            maxWidth: '1100px',
            width: '100%',
          }}
        >
          {/* 1 — Executive Summary */}
          <ExecutiveSummary data={data} />

          {/* Section divider */}
          <div style={{ height: '1px', backgroundColor: '#e8e8f0' }} />

          {/* 2 — Multi-Agent Pipeline */}
          <AgentPipeline agents={data.agents} />

          {/* Section divider */}
          <div style={{ height: '1px', backgroundColor: '#e8e8f0' }} />

          {/* 3 — Market Opportunity */}
          <MarketOpportunity market={data.market} />

          {/* Section divider */}
          <div style={{ height: '1px', backgroundColor: '#e8e8f0' }} />

          {/* 4 — Competitor Analysis */}
          <CompetitorAnalysis competitors={data.competitors} />

          {/* Section divider */}
          <div style={{ height: '1px', backgroundColor: '#e8e8f0' }} />

          {/* 5 — Recommendations */}
          <Recommendations recommendations={data.recommendations} />

          {/* Section divider */}
          <div style={{ height: '1px', backgroundColor: '#e8e8f0' }} />

          {/* 6 — Sources */}
          <Sources sources={data.sources} />

          {/* Bottom padding */}
          <div style={{ height: '40px' }} />
        </motion.main>
      </div>
    </div>
  )
}
