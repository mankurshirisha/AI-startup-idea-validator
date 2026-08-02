/**
 * components/dashboard/tokens.ts
 * Design tokens — kept in strict sync with the landing page palette.
 * Import from here in every dashboard component instead of hard-coding values.
 */

export const C = {
  bg:        '#FFFFFF',
  surface:   '#FFFFFF',
  subtle:    '#fafafe',         // section backgrounds, sidebar
  primary:   '#1a1a2e',
  secondary: '#5a5a8a',
  accent:    '#3b3bdb',
  accentSoft:'#3b3bdb12',
  orange:    '#FCA311',
  muted:     '#9090b0',
  border:    '#e8e8f0',
  shadow:    '0 4px 24px rgba(59,59,219,0.07), 0 1px 4px rgba(0,0,0,0.05)',
  shadowMd:  '0 8px 40px rgba(59,59,219,0.09), 0 2px 8px rgba(0,0,0,0.06)',
} as const

export const FONT = "'DM Sans', 'Inter', system-ui, sans-serif"

export const RADIUS = {
  sm:  '10px',
  md:  '14px',
  lg:  '20px',
  xl:  '24px',
  pill:'100px',
} as const

/** Framer Motion shared ease */
export const ease = [0.25, 0.1, 0.25, 1] as const

export const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.5, delay, ease },
})

export const fadeIn = (delay = 0) => ({
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  transition: { duration: 0.45, delay, ease },
})
