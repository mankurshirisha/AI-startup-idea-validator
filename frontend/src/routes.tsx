/**
 * routes.tsx
 * Centralised route definitions using React Router v7.
 * Pages are lazy-loaded via React.lazy for code-splitting.
 */
import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

const LandingPage       = lazy(() => import('@/pages/LandingPage'))
const LoadingPage       = lazy(() => import('@/pages/LoadingPage'))
const ResultsDashboard  = lazy(() => import('@/pages/ResultsDashboard'))

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={null}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    path: '/loading',
    element: (
      <Suspense fallback={null}>
        <LoadingPage />
      </Suspense>
    ),
  },
  {
    path: '/results',
    element: (
      <Suspense fallback={null}>
        <ResultsDashboard />
      </Suspense>
    ),
  },
  // Catch-all: send unknown routes back to home
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

export default router

