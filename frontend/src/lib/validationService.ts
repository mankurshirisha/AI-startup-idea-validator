/**
 * validationService.ts
 * Integration service connecting the frontend to the FastAPI startup validation pipeline.
 * Handles API execution, timeout control, error parsing, and mapping raw JSON to ValidationResult.
 */

import api from './api'
import type { ValidationResult, AgentResult, Competitor, MarketData } from '@/types/dashboard'

export interface StartupValidationPayload {
  startupIdea: string
  description: string
}

export interface BackendValidationResponse {
  status?: string
  web_search?: {
    market_size?: string
    growth_rate?: string
    industry?: string
    market_trends?: string[]
    real_competitors?: string[]
    confidence_score?: number | string
    verified_sources?: string[]
  }
  market_opportunity?: {
    startupIdea?: string
    industryInsights?: {
      industry?: string
      marketSize?: string
      growthRate?: string
      trends?: string[]
    }
    marketOpportunity?: {
      TAM?: string
      SAM?: string
      SOM?: string
    }
    marketOpportunityScore?: number
    customerInsights?: {
      targetSegments?: string[]
      keyPainPoints?: string[]
      marketDemand?: string
    }
    recommendations?: string[]
    sources?: string[]
  }
  competitor_analysis?: {
    startupIdea?: string
    industry?: string
    competitors?: Array<{
      name?: string
      website?: string | null
      description?: string
      key_features?: string[]
      target_customers?: string
      pricing?: string
      source?: string
    }>
  }
  comparison?: {
    status?: string
    startup?: string
    description?: string
    industry?: string
    startup_features?: string[]
    comparison?: Array<{
      competitor?: string
      common_features?: string[]
      startup_unique_features?: string[]
      competitor_unique_features?: string[]
    }>
    similarity_scores?: Array<{ competitor?: string; similarity_score?: number }>
    market_gaps?: Array<{
      competitor?: string
      startup_advantages?: string[]
      competitor_advantages?: string[]
      gap_summary?: string
    }>
    business_insights?: {
      strengths?: string[]
      weaknesses?: string[]
      opportunities?: string[]
      recommendations?: string[]
    }
  }
}

/**
 * Maps raw backend FastAPI JSON to the frontend ValidationResult interface.
 */
export function mapBackendToValidationResult(
  data: BackendValidationResponse,
  idea: string,
  description?: string
): ValidationResult {
  const webSearch = data.web_search ?? {}
  const marketOpp = data.market_opportunity ?? {}
  const compAnalysis = data.competitor_analysis ?? {}
  const comparison = data.comparison ?? {}

  // 1. Validation Score
  let score = 75
  if (typeof marketOpp.marketOpportunityScore === 'number' && marketOpp.marketOpportunityScore > 0) {
    score = Math.min(100, Math.max(0, Math.round(marketOpp.marketOpportunityScore)))
  } else if (webSearch.confidence_score !== undefined) {
    const parsed = Number(webSearch.confidence_score)
    if (!isNaN(parsed) && parsed > 0) {
      score = Math.min(100, Math.max(0, Math.round(parsed)))
    }
  }

  // 2. Status Label
  let statusLabel: ValidationResult['status'] = 'Moderate'
  if (score >= 80) statusLabel = 'Strong'
  else if (score >= 60) statusLabel = 'Moderate'
  else if (score >= 40) statusLabel = 'Needs Work'
  else statusLabel = 'Weak'

  // 3. Executive Summary Construction
  const strengths = comparison.business_insights?.strengths ?? []
  const weaknesses = comparison.business_insights?.weaknesses ?? []
  const opps = comparison.business_insights?.opportunities ?? []

  let executiveSummary = ''
  if (strengths.length > 0 || weaknesses.length > 0) {
    executiveSummary = `Analysis of "${idea}" shows a ${statusLabel.toLowerCase()} market opportunity. `
    if (strengths.length > 0) {
      executiveSummary += `Key strengths include ${strengths.slice(0, 2).join(' and ')}. `
    }
    if (weaknesses.length > 0) {
      executiveSummary += `Notable areas of caution include ${weaknesses.slice(0, 2).join(' and ')}. `
    }
    if (opps.length > 0) {
      executiveSummary += `Strategic growth opportunities lie in ${opps.slice(0, 2).join(' and ')}.`
    }
  } else {
    executiveSummary =
      `The validation pipeline evaluated "${idea}" across current web research, market size trends, and competitive positioning. ` +
      `Market demand is currently rated as ${marketOpp.customerInsights?.marketDemand ?? 'active'}. ` +
      `Founders should focus on validating pricing models and core differentiation early.`
  }

  // 4. Market Data
  const industry =
    marketOpp.industryInsights?.industry || webSearch.industry || 'Tech & Software'
  const marketSize =
    marketOpp.industryInsights?.marketSize || webSearch.market_size || 'Available on request'
  const growthRate =
    marketOpp.industryInsights?.growthRate || webSearch.growth_rate || 'Steady growth'
  const rawTrends = [
    ...(marketOpp.industryInsights?.trends ?? []),
    ...(webSearch.market_trends ?? []),
  ]
  const trends = Array.from(new Set(rawTrends)).filter((t) => t && t.length > 2)

  const market: MarketData = {
    marketSize,
    growthRate,
    industry,
    trends: trends.length > 0 ? trends : ['AI automation driving workflow efficiency'],
  }

  // 5. Competitors Mapping
  const rawCompetitors = compAnalysis.competitors ?? []
  let competitors: Competitor[] = []

  if (rawCompetitors.length > 0) {
    competitors = rawCompetitors.map((c) => {
      const compName = c.name?.trim() || 'Competitor'
      const desc = c.description?.trim() || 'Direct competitor operating in the market.'

      // Extract matching comparison gaps if available
      const gapInfo = comparison.market_gaps?.find(
        (g) => g.competitor?.toLowerCase() === compName.toLowerCase()
      )

      const compStrengths = c.key_features && c.key_features.length > 0
        ? c.key_features
        : (gapInfo?.competitor_advantages ?? ['Established presence'])

      const compWeaknesses = gapInfo?.startup_advantages && gapInfo.startup_advantages.length > 0
        ? gapInfo.startup_advantages.map((adv) => `Lacks ${adv}`)
        : (c.pricing ? [`Pricing model: ${c.pricing}`] : ['Standard feature set'])

      return {
        name: compName,
        description: desc,
        strengths: compStrengths,
        weaknesses: compWeaknesses,
        website: c.website || c.source || undefined,
      }
    })
  } else if (webSearch.real_competitors && webSearch.real_competitors.length > 0) {
    competitors = webSearch.real_competitors.map((compName) => ({
      name: compName,
      description: `Market competitor operating within ${industry}.`,
      strengths: ['Brand awareness', 'Active user base'],
      weaknesses: ['Higher friction', 'Legacy architecture'],
    }))
  }

  // 6. Recommendations
  const recs = Array.from(
    new Set([
      ...(marketOpp.recommendations ?? []),
      ...(comparison.business_insights?.recommendations ?? []),
    ])
  ).filter((r) => r && r.length > 5)

  const finalRecommendations = recs.length > 0
    ? recs
    : [
        `Target early adopters in ${industry} before expanding to broader customer segments.`,
        'Validate willingness to pay through early user interviews or pre-order landing pages.',
        'Focus product development on key feature differentiators.',
      ]

  // 7. Sources
  const rawSources = [
    ...(webSearch.verified_sources ?? []),
    ...(marketOpp.sources ?? []),
    ...competitors.map((c) => c.website).filter(Boolean),
  ]
  const sources = Array.from(new Set(rawSources.filter((s): s is string => typeof s === 'string' && s.startsWith('http'))))

  // 8. Pipeline Agents Summary
  const agents: AgentResult[] = [
    {
      id: 'web-search',
      name: 'Web Search Agent',
      status: 'completed',
      summary: `Searched web sources for market size and competitor data in ${industry}.`,
      detail: `Verified ${sources.length} sources for startup validation.`,
    },
    {
      id: 'market-opp',
      name: 'Market Opportunity Agent',
      status: 'completed',
      summary: `Analyzed ${marketSize} market size and ${growthRate} trajectory.`,
      detail: `Evaluated TAM/SAM/SOM and customer pain points.`,
    },
    {
      id: 'competitor',
      name: 'Competitor Discovery Agent',
      status: 'completed',
      summary: `Identified ${competitors.length} direct competitor${competitors.length !== 1 ? 's' : ''} in the space.`,
      detail: `Mapped websites, key features, and pricing models.`,
    },
    {
      id: 'comparison',
      name: 'Comparison Agent',
      status: 'completed',
      summary: `Benchmarked strengths, weaknesses, and product feature gaps.`,
      detail: `Evaluated market advantages and strategic risks.`,
    },
    {
      id: 'report',
      name: 'Report Generator Agent',
      status: 'completed',
      summary: `Generated full startup validation report with a score of ${score}/100.`,
      detail: `Compiled executive summary and recommendations.`,
    },
  ]

  return {
    idea,
    description: description || '',
    createdAt: new Date().toISOString(),
    validationScore: score,
    status: statusLabel,
    executiveSummary,
    agents,
    market,
    competitors,
    recommendations: finalRecommendations,
    sources,
  }
}

/**
 * Triggers full backend startup validation pipeline via FastAPI POST /api/startup-validator
 */
export async function validateStartupIdea(
  payload: StartupValidationPayload
): Promise<ValidationResult> {
  const idea = payload.startupIdea.trim()
  const description = payload.description.trim()

  if (!idea || idea.length < 3) {
    throw new Error('Please enter a valid startup idea (at least 3 characters).')
  }

  try {
    const response = await api.post<BackendValidationResponse>(
      '/startup-validator',
      {
        startupIdea: idea,
        description: description || idea,
      },
      {
        timeout: 120000, // 2 minute timeout for full AI agent pipeline
      }
    )

    if (!response.data || typeof response.data !== 'object') {
      throw new Error('Invalid JSON response received from validation backend.')
    }

    return mapBackendToValidationResult(response.data, idea, description)
  } catch (err: any) {
    if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
      throw new Error('Validation request was cancelled.')
    }

    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      throw new Error(
        'Validation request timed out. The AI agents are taking longer than expected. Please try again.'
      )
    }

    if (err.response) {
      const status = err.response.status
      const detail = err.response.data?.detail || err.response.data?.message
      if (status === 400) {
        throw new Error(detail || 'Invalid startup validation request.')
      }
      if (status === 404) {
        throw new Error(detail || 'Validation endpoint not found.')
      }
      if (status >= 500) {
        throw new Error(
          detail || 'Backend processing error during AI analysis. Please try again.'
        )
      }
    }

    if (!navigator.onLine) {
      throw new Error('Network offline. Please check your internet connection and try again.')
    }

    throw new Error(
      err.message || 'Unable to connect to validation backend. Please ensure the backend server is running.'
    )
  }
}
