/**
 * types/dashboard.ts
 * All TypeScript types for the Executive AI Business Intelligence Platform.
 */

export type AgentStatus = 'completed' | 'running' | 'pending' | 'failed'

export interface AgentResult {
  id: string
  name: string
  status: AgentStatus
  summary: string
  detail: string
}

export interface Competitor {
  name: string
  description: string
  strengths: string[]
  weaknesses: string[]
  website?: string
  country?: string
  similarity?: number
  pricingModel?: string
  targetAudience?: string
  relevanceReason?: string
  differentiation?: string
  keyOpportunity?: string
  biggestThreat?: string
}

export interface MarketData {
  marketSize: string
  growthRate: string
  industry: string
  trends: string[]
  tam?: string
  sam?: string
  som?: string
  currency?: string
}

export interface ScoreDimension {
  id: string
  title: string
  score: number
  explanation: string
  whyAssigned?: string
  whatIncreased?: string
  whatReduced?: string
  improvementSuggestion?: string
}

export interface SWOTData {
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
}

export interface MarketInsightsData {
  trends: string[]
  painPoints: string[]
  growthDrivers: string[]
  risks: string[]
  regulations: string[]
  investmentOutlook: string
  whyAttractive?: string
  adoptionBarriers?: string[]
}

export interface CategorizedRecommendation {
  category:
    | 'Innovation'
    | 'Market Demand'
    | 'Competition'
    | 'Scalability'
    | 'Technical Feasibility'
    | 'Business Viability'
  priority: 'High' | 'Medium' | 'Strategic'
  impact?: 'High Impact' | 'Medium Impact' | 'Transformational'
  text: string
  reasoning?: string
}

export interface InvestorPerspectiveData {
  interested: boolean
  verdictLabel: string
  evidence: string[]
  concerns: string[]
}

export interface RiskItem {
  type: 'Market Risk' | 'Technical Risk' | 'Execution Risk' | 'Financial Risk' | 'Regulatory Risk'
  level: 'Low' | 'Medium' | 'High'
  explanation: string
}

export interface FinalVerdictData {
  decision: 'Should Proceed' | 'Proceed with Improvements' | 'Needs Significant Refinement' | 'Not Recommended Yet'
  rationale: string
}

export interface MVPFeature {
  feature: string
  priority: 'High' | 'Medium' | 'Low'
  marketFit?: 'High' | 'Medium' | 'Low' | string
  customerValue?: 'High' | 'Medium' | 'Low' | string
  resourceEffort?: 'Low' | 'Medium' | 'High' | string
  reason: string
  mvpPhase?: 'Initial MVP' | 'Post-MVP' | string
}

export interface MVPRecommendationData {
  summary: string
  overallStrategy: string
  features: MVPFeature[]
  deferredFeatures: string[]
}

export interface ValidationResult {
  idea: string
  description?: string
  createdAt: string
  validationScore: number
  status: 'Strong' | 'Moderate' | 'Weak' | 'Needs Work'
  verdict?: 'Excellent Opportunity' | 'Promising but Competitive' | 'Needs Refinement' | 'High Risk'
  executiveSummary: string
  agents: AgentResult[]
  market: MarketData
  competitors: Competitor[]
  recommendations: string[]
  sources: string[]
  // Enriched BI Platform fields
  scoreBreakdown?: ScoreDimension[]
  swot?: SWOTData
  swotRecommendations?: string[]
  overallRiskLevel?: string
  mvp?: MVPRecommendationData
  insights?: MarketInsightsData
  categorizedRecommendations?: CategorizedRecommendation[]
  investorPerspective?: InvestorPerspectiveData
  riskAnalysis?: RiskItem[]
  finalVerdict?: FinalVerdictData
  enrichedCompetitors?: Competitor[]
  industry?: string
  targetCustomer?: string
  targetCountry?: string
  startupStage?: string
  businessModel?: string
  keyFeatures?: string[]
}
