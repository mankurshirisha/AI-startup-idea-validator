// constants.ts — App-wide constants (API endpoints, route paths, theme tokens…)

export const ROUTES = {
  HOME: '/',
  VALIDATE: '/validate',
  RESULTS: '/results',
  HISTORY: '/history',
} as const

export const API_ENDPOINTS = {
  VALIDATE: '/validate',
  COMPETITORS: '/competitors',
  MARKET: '/market',
} as const
