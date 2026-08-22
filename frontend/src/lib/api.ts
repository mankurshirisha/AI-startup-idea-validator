/**
 * api.ts — Axios instance pre-configured with base URL and interceptors.
 * All API calls go through this client so headers/errors are handled centrally.
 */
import axios from 'axios'

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined
  if (!envUrl) return 'http://127.0.0.1:8000/api'
  const trimmed = envUrl.trim().replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
})

export default api
