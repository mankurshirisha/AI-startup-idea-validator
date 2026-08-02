/**
 * api.ts — Axios instance pre-configured with base URL and interceptors.
 * All API calls go through this client so headers/errors are handled centrally.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
})

export default api
