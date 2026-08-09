/**
 * pages/ResultsDashboard.tsx
 * Refined Executive AI Business Intelligence Dashboard.
 *
 * Layout hierarchy:
 *  1. Executive Summary Hero (Merged Startup Name, Validation Score Gauge, Verdict Badge, Executive Summary)
 *  2. Score Breakdown
 *  3. Market Opportunity
 *  4. Competitor Analysis (with "View Details" toggle)
 *  5. SWOT Analysis (with "View Details" toggle)
 *  6. Recommendations
 *  7. Investor Perspective
 *  8. Risk Analysis (with "View Details" toggle)
 *  9. References (Collapsed at very bottom)
 */

import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import type { ValidationResult } from '@/types/dashboard'
import {
  DashboardSidebar,
  DashboardHeader,
  ExecutiveSummary,
  ScoreBreakdown,
  MarketOpportunity,
  CompetitorAnalysis,
  SWOTAnalysis,
  Recommendations,
  InvestorPerspective,
  RiskAnalysis,
  Sources,
} from '@/components/dashboard'

/* ════════════════════════════════════════════════════════
   DEFAULT / PLACEHOLDER FALLBACK DATA
════════════════════════════════════════════════════════ */
const DEFAULT_DATA: ValidationResult = {
  idea: 'AI Meal Planner for Diabetic Patients',
  description:
    'A hyper-personalized nutrition assistant that uses AI to analyze blood glucose logs and generate customized meal plans for diabetic patients.',
  createdAt: new Date().toISOString(),
  validationScore: 84,
  status: 'Strong',
  verdict: 'Promising but Competitive',
  executiveSummary:
    'AI Meal Planner for Diabetic Patients addresses a critical health problem: simplifying complex daily meal decisions for diabetic patients based on real-time glucose responses. ' +
    'The market opportunity is highly attractive, valued at ₹45,000 Cr in India and growing at ~18.5% annually driven by rising chronic care adoption. ' +
    'The startup\'s biggest strength lies in its automated glucose-to-meal feedback loop, eliminating manual tracking friction and delivering personalized dietary recommendations. ' +
    'However, its primary challenge centers on building early clinical trust and navigating competitive crowding from legacy health logging apps. ' +
    'Overall, we recommend proceeding aggressively with MVP waitlist validation while securing dietitian endorsement partners.',

  agents: [
    {
      id: 'web-search',
      name: 'Web Search Agent',
      status: 'completed',
      summary: 'Retrieved healthcare market reports and competitor profiles.',
      detail: 'Searched verified medical & tech sources.',
    },
    {
      id: 'market-opp',
      name: 'Market Opportunity Agent',
      status: 'completed',
      summary: 'Sized addressable market and customer demand signals.',
      detail: 'Evaluated TAM/SAM/SOM and growth trajectory.',
    },
    {
      id: 'competitor',
      name: 'Competitor Discovery Agent',
      status: 'completed',
      summary: 'Mapped direct competitors in digital diabetes management.',
      detail: 'Identified features, pricing, and positioning gaps.',
    },
    {
      id: 'comparison',
      name: 'Comparison Agent',
      status: 'completed',
      summary: 'Benchmarked features, strengths, weaknesses, and SWOT factors.',
      detail: 'Formulated strategic recommendations and moat advice.',
    },
  ],

  market: {
    marketSize: '$14.5 Billion',
    growthRate: '~18.5% / yr',
    industry: 'Healthcare & HealthTech',
    trends: [
      'Accelerating adoption of continuous glucose monitors (CGMs) and digital health tools.',
      'Shift towards personalized preventive nutrition over generic dietary advice.',
      'Increasing willingness of health insurers to subsidize digital chronic care management.',
    ],
    tam: '₹45,000 Cr',
    sam: '₹12,000 Cr',
    som: '₹1,500 Cr',
    currency: '₹',
  },

  competitors: [
    {
      name: 'Practo / HealthifyMe',
      description: 'Established health & nutrition tracking platforms with Indian market reach.',
      strengths: ['Massive existing user base', 'Brand recognition in India'],
      weaknesses: ['Generic calorie counting, lacks real-time CGM glucose sync'],
      website: 'https://www.healthifyme.com',
      country: 'India',
      similarity: 82,
      pricingModel: 'Freemium / Subscription',
      targetAudience: 'General Fitness & Health Seekers',
      relevanceReason: 'Operates directly in digital health tracking in target market.',
      differentiation: 'Provides dedicated diabetic glucose-response meal personalization.',
      keyOpportunity: 'Capture diabetic patients seeking clinical dietary feedback.',
      biggestThreat: 'Distribution scale and brand marketing budget.',
    },
    {
      name: 'MyFitnessPal',
      description: 'Global food logging database with extensive nutrition entry database.',
      strengths: ['Huge food database', 'Global community'],
      weaknesses: ['Manual food logging friction', 'No diabetic clinical guidance'],
      website: 'https://www.myfitnesspal.com',
      country: 'USA',
      similarity: 74,
      pricingModel: '$19.99 / mo',
      targetAudience: 'Calorie Trackers & Athletes',
      relevanceReason: 'Leading global calorie and meal tracking application.',
      differentiation: 'Automates food logging via WhatsApp OCR and glucose feedback.',
      keyOpportunity: 'Target diabetic users frustrated by manual entry.',
      biggestThreat: 'Potential addition of basic diabetic tracking features.',
    },
  ],

  recommendations: [
    'Launch a waitlist page targeting diabetic care communities and patient forums.',
    'Partner with endocrinologists or certified dietitians to validate meal plan safety.',
    'Build WhatsApp meal logging integration to eliminate app download friction.',
  ],

  sources: [
    'https://www.statista.com/topics/digital-health-market/',
    'https://www.grandviewresearch.com/industry-analysis/diabetes-management-market',
    'https://www.healthifyme.com',
  ],

  scoreBreakdown: [
    {
      id: 'innovation',
      title: 'Innovation',
      score: 88,
      explanation: 'Evaluates technological novelty, AI differentiation, and product uniqueness.',
      whyAssigned: 'Automates glucose-response meal recommendation loops using continuous AI analysis.',
      whatIncreased: 'Real-time glucose synchronization and personalized local recipe generation.',
      whatReduced: 'Initial dependence on LLM API infrastructure.',
      improvementSuggestion: 'Build proprietary glucose-meal correlation models to create a data moat.',
    },
    {
      id: 'market-demand',
      title: 'Market Demand',
      score: 86,
      explanation: 'Measures search intent volume, target user urgency, and organic demand signals.',
      whyAssigned: 'Urgent pain point experienced by millions of diabetic patients managing daily diet.',
      whatIncreased: 'High search volume for diabetic meal plans and CGM integration.',
      whatReduced: 'User reluctance to pay out-of-pocket without medical insurance subsidy.',
      improvementSuggestion: 'Publish clinical trial case studies to boost trust and conversion.',
    },
    {
      id: 'competition',
      title: 'Competition',
      score: 76,
      explanation: 'Assesses market crowding, incumbent dominance, and defensible positioning gaps.',
      whyAssigned: 'Legacy calorie counters dominate broad fitness but lack diabetic specialization.',
      whatIncreased: 'Clear gap in real-time continuous glucose monitor integration.',
      whatReduced: 'Large competitor user bases and established brand presence.',
      improvementSuggestion: 'Position strictly as a clinical diabetic nutrition tool rather than generic fitness.',
    },
    {
      id: 'scalability',
      title: 'Scalability',
      score: 89,
      explanation: 'Analyzes software unit economics, automated onboarding, and global expansion speed.',
      whyAssigned: 'SaaS architecture provides high software gross margins and automated delivery.',
      whatIncreased: 'Low marginal cost per added user across digital onboarding.',
      whatReduced: 'Localization effort required for regional cuisines and languages.',
      improvementSuggestion: 'Implement localized meal database expansion across target countries.',
    },
    {
      id: 'tech-feasibility',
      title: 'Technical Feasibility',
      score: 92,
      explanation: 'Evaluates API readiness, LLM infrastructure requirements, and execution complexity.',
      whyAssigned: 'Leverages existing CGM developer APIs and mature LLM frameworks.',
      whatIncreased: 'High availability of continuous glucose monitor data integrations.',
      whatReduced: 'Potential API rate limit considerations during peak sync hours.',
      improvementSuggestion: 'Implement background batching for glucose sync processing.',
    },
    {
      id: 'business-viability',
      title: 'Business Viability',
      score: 82,
      explanation: 'Assesses monetization potential, pricing power, customer LTV, and payback period.',
      whyAssigned: 'High recurring subscription value for chronic condition management.',
      whatIncreased: 'Multiple monetization paths (B2C Subscriptions, B2B Insurance Clinics).',
      whatReduced: 'Early customer acquisition cost during brand building.',
      improvementSuggestion: 'Offer annual plans with doctor consultation add-ons to boost ARPU.',
    },
  ],

  swot: {
    strengths: [
      'Niche specialization on diabetic nutrition builds high patient trust',
      'Automated glucose-to-meal feedback loop creates defensible value',
      'High recurring subscription retention potential in chronic care',
    ],
    weaknesses: [
      'Requires initial medical review to establish clinical safety credibility',
      'Food database localization required across target regional cuisines',
      'Customer acquisition cost requires early channel optimization',
    ],
    opportunities: [
      'Integrating directly with popular Continuous Glucose Monitors (Dexcom, Freestyle Libre)',
      'B2B2C corporate wellness partnerships with health insurance providers',
      'Expanding into pre-diabetic and gestational diabetes market segments',
    ],
    threats: [
      'Big tech health apps adding generic meal planning features',
      'Medical device compliance regulatory shifts in international markets',
      'User drop-off after initial glucose stabilization',
    ],
  },

  insights: {
    trends: [
      'Accelerating adoption of continuous glucose monitors (CGMs)',
      'Shift towards personalized preventive nutrition over generic advice',
      'Increasing insurance coverage for digital chronic care tools',
    ],
    painPoints: [
      'Patients struggle to know which specific foods trigger glucose spikes',
      'Generic diet plans ignore local cultural cuisines and personal tastes',
      'Manual food logging apps cause high user drop-off',
    ],
    growthDrivers: [
      'Rising global diabetes prevalence creating urgent demand',
      'Viral word-of-mouth in patient support communities',
      'Doctor recommendations driving high-converting user referrals',
    ],
    risks: [
      'Medical liability risks if meal advice contradicts doctor orders',
      'User retention drop-off after initial weight/glucose stabilization',
    ],
    regulations: [
      'Compliance with HIPAA, GDPR, and regional health data privacy laws',
      'Clear medical disclaimer ensuring non-diagnostic software status',
    ],
    investmentOutlook:
      'Digital health and chronic disease tech continue to attract substantial VC funding. Investors prioritize platforms demonstrating high retention, clinical validation, and clear monetization pathways.',
    whyAttractive: 'The HealthTech chronic care market is valued at $14.5 Billion with strong willingness-to-pay among diabetic patients.',
    adoptionBarriers: [
      'Patient reliance on traditional paper diet sheets from clinics',
      'Perceived difficulty connecting continuous glucose monitors',
      'Hesitation to pay subscription prior to seeing glucose improvement',
    ],
  },

  categorizedRecommendations: [
    {
      category: 'Innovation',
      priority: 'High',
      impact: 'High Impact',
      text: 'Differentiate your platform by offering personalized meal plans based on glucose history, dietary restrictions, and local cuisine preferences for diabetic patients.',
      reasoning: 'Hyper-personalization based on real medical data creates a clinically meaningful experience that generic health apps cannot replicate.',
    },
    {
      category: 'Market Demand',
      priority: 'High',
      impact: 'High Impact',
      text: 'Partner with endocrinologists, diabetes clinics, and patient support groups in India to validate demand and convert patients through trusted medical referrals.',
      reasoning: 'Doctor-endorsed acquisition channels provide high-intent patients with strong conversion and low churn compared to paid advertising.',
    },
    {
      category: 'Competition',
      priority: 'Strategic',
      impact: 'High Impact',
      text: 'Position strictly as a clinical diabetic nutrition tool rather than a generic fitness app to avoid direct competition with HealthifyMe and MyFitnessPal.',
      reasoning: 'Niche clinical positioning attracts serious patients and creates a clear differentiation that larger incumbents cannot quickly replicate.',
    },
    {
      category: 'Scalability',
      priority: 'Strategic',
      impact: 'Transformational',
      text: 'Design the platform to support additional chronic conditions such as hypertension and heart disease once the diabetic patient base is established and validated.',
      reasoning: 'A modular condition architecture dramatically expands the addressable market without rebuilding the core product.',
    },
    {
      category: 'Technical Feasibility',
      priority: 'Medium',
      impact: 'High Impact',
      text: 'Prioritize accurate glucose-to-meal correlation, secure handling of patient health data, and a simple onboarding flow that works for non-technical patients.',
      reasoning: 'HIPAA-compliant data handling and low-friction onboarding are critical to earning patient trust and clinical adoption.',
    },
    {
      category: 'Business Viability',
      priority: 'Strategic',
      impact: 'Transformational',
      text: 'Evaluate monthly subscriptions paired with optional dietitian consultation add-ons to create predictable recurring revenue from diabetic patients.',
      reasoning: 'Chronic condition management drives high retention; consultation add-ons increase ARPU without raising customer acquisition cost.',
    },
  ],

  investorPerspective: {
    interested: true,
    verdictLabel: 'Strong Seed-Stage Investor Appetite',
    evidence: [
      'Operates in a massive $14.5B chronic care HealthTech market with 18.5% CAGR.',
      'Clear unit economics opportunity through high-retention SaaS subscriptions.',
      'Strong product defensibility via automated continuous glucose feedback loops.',
    ],
    concerns: [
      'What is the clinical validation protocol to prevent medical liability?',
      'How quickly can the startup secure doctor referral partnerships?',
      'What is the projected CAC payback period across digital channels?',
    ],
  },

  riskAnalysis: [
    {
      type: 'Market Risk',
      level: 'Low',
      explanation: 'High market demand confirmed; chronic diabetes management has persistent urgency.',
    },
    {
      type: 'Technical Risk',
      level: 'Low',
      explanation: 'Built on established CGM developer APIs and proven LLM orchestration frameworks.',
    },
    {
      type: 'Execution Risk',
      level: 'Medium',
      explanation: 'Requires establishing doctor trust and local food database accuracy.',
    },
    {
      type: 'Financial Risk',
      level: 'Low',
      explanation: 'SaaS subscription model offers predictable recurring revenue and strong gross margins.',
    },
    {
      type: 'Regulatory Risk',
      level: 'Medium',
      explanation: 'Requires HIPAA/GDPR health data compliance and non-diagnostic medical disclaimers.',
    },
  ],

  finalVerdict: {
    decision: 'Proceed with Improvements',
    rationale:
      'Based on multi-agent validation, "AI Meal Planner for Diabetic Patients" achieves a validation score of 84/100. ' +
      'The market opportunity is substantial and user pain points are severe. ' +
      'We strongly recommend proceeding with MVP launch, focusing on WhatsApp meal logging and clinical dietitian endorsement partnerships.',
  },
}

/* ════════════════════════════════════════════════════════
   RESULTS DASHBOARD PAGE
════════════════════════════════════════════════════════ */
export default function ResultsDashboard() {
  const location = useLocation()

  const state = location.state as {
    data?: ValidationResult
    idea?: string
    description?: string
    industry?: string
    targetCustomer?: string
    targetCountry?: string
    startupStage?: string
    businessModel?: string
    keyFeatures?: string[]
  } | null

  // Merge state data with fallback
  const rawData = state?.data ?? DEFAULT_DATA
  const data: ValidationResult = {
    ...DEFAULT_DATA,
    ...rawData,
    idea: state?.idea || rawData.idea || DEFAULT_DATA.idea,
    description: state?.description || rawData.description || DEFAULT_DATA.description,
    industry: state?.industry || rawData.industry || DEFAULT_DATA.industry,
    targetCustomer: state?.targetCustomer || rawData.targetCustomer || DEFAULT_DATA.targetCustomer,
    targetCountry: state?.targetCountry || rawData.targetCountry || DEFAULT_DATA.targetCountry,
    startupStage: state?.startupStage || rawData.startupStage || DEFAULT_DATA.startupStage,
    businessModel: state?.businessModel || rawData.businessModel || DEFAULT_DATA.businessModel,
    keyFeatures: state?.keyFeatures || rawData.keyFeatures || DEFAULT_DATA.keyFeatures,
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
      {/* ── Fixed Sidebar ── */}
      <DashboardSidebar />

      {/* ── Main Scrollable Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {/* Sticky Header */}
        <DashboardHeader data={data} />

        {/* Executive BI Report Content */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            flex: 1,
            padding: '32px 40px 60px',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            maxWidth: '1160px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          {/* 1. Merged Executive Summary Hero Banner */}
          <ExecutiveSummary data={data} />

          {/* 2. Score Breakdown */}
          <ScoreBreakdown data={data} />

          {/* 3. Market Opportunity */}
          <MarketOpportunity market={data.market} targetCountry={data.targetCountry} />

          {/* 4. Competitor Analysis (View Details toggle) */}
          <CompetitorAnalysis
            competitors={data.enrichedCompetitors || data.competitors}
            targetCountry={data.targetCountry}
          />

          {/* 5. SWOT Analysis (View Details toggle) */}
          <SWOTAnalysis data={data} />

          {/* 6. Recommendations */}
          <Recommendations recommendations={data.recommendations} data={data} />

          {/* 7. Investor Perspective */}
          <InvestorPerspective data={data} />

          {/* 8. Risk Analysis (View Details toggle) */}
          <RiskAnalysis data={data} />

          {/* 9. References (Collapsed at bottom) */}
          <Sources sources={data.sources} />

          {/* Bottom Spacing */}
          <div style={{ height: '32px' }} />
        </motion.main>
      </div>
    </div>
  )
}
