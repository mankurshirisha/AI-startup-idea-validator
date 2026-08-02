/**
 * types/dashboard.ts
 * All shared TypeScript types for the Results Dashboard.
 * Shape is designed to match the backend API payload exactly —
 * swap placeholders for real API data when integrating.
 */

export type AgentStatus = 'completed' | 'running' | 'pending' | 'failed'

export interface AgentResult {
  id: string
  name: string
  status: AgentStatus
  /** One-line summary visible in the pipeline card */
  summary: string
  /** Full detail text — shown in expanded view (future) */
  detail: string
}

export interface Competitor {
  name: string
  description: string
  strengths: string[]
  weaknesses: string[]
  website?: string
}

export interface MarketData {
  marketSize: string
  growthRate: string
  industry: string
  trends: string[]
}

export interface ValidationResult {
  /** The original startup idea string */
  idea: string
  /** Optional longer description submitted by the user */
  description?: string
  /** ISO date string — e.g. "2026-08-02T06:13:00Z" */
  createdAt: string
  /** 0 – 100 */
  validationScore: number
  /** Human-readable verdict */
  status: 'Strong' | 'Moderate' | 'Weak' | 'Needs Work'
  /** 2–4 sentence executive summary */
  executiveSummary: string
  agents: AgentResult[]
  market: MarketData
  competitors: Competitor[]
  recommendations: string[]
  sources: string[]
}
