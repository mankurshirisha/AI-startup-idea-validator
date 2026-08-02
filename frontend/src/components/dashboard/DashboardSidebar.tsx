/**
 * DashboardSidebar.tsx
 * Fixed left navigation sidebar.
 * Matches landing page design: white surface, indigo accent, DM Sans.
 */
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  Settings,
  ChevronRight,
} from 'lucide-react'
import { C, FONT, RADIUS, ease } from './tokens'

/* ── Nav item definition ── */
interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
  to: string
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',      label: 'Dashboard',       icon: LayoutDashboard, to: '/results' },
  { id: 'new-validation', label: 'New Validation',  icon: PlusCircle,      to: '/' },
  { id: 'history',        label: 'History',         icon: Clock,           to: '/history',  disabled: true },
  { id: 'settings',       label: 'Settings',        icon: Settings,        to: '/settings', disabled: true },
]

/* ═══════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════ */
export function DashboardSidebar() {
  const navigate = useNavigate()

  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0,   opacity: 1 }}
      transition={{ duration: 0.4, ease }}
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100vh',
        position: 'sticky',
        top: 0,
        backgroundColor: C.surface,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT,
        zIndex: 40,
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '24px 24px 20px',
          borderBottom: `1px solid ${C.border}`,
          cursor: 'pointer',
        }}
        onClick={() => navigate('/')}
        id="sidebar-logo"
      >
        <span
          style={{
            fontFamily: FONT,
            fontSize: '18px',
            fontWeight: 800,
            color: C.primary,
            letterSpacing: '-0.04em',
          }}
        >
          BeforeBeta
        </span>
      </div>

      {/* Nav */}
      <nav
        style={{
          padding: '16px 12px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3, ease }}
            >
              {item.disabled ? (
                /* Disabled placeholder items */
                <div
                  id={`sidebar-${item.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: RADIUS.md,
                    cursor: 'not-allowed',
                    opacity: 0.38,
                  }}
                >
                  <Icon size={16} color={C.muted} strokeWidth={2} />
                  <span style={{ fontSize: '14px', fontWeight: 500, color: C.muted }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: C.muted,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      background: '#f0f0f8',
                      borderRadius: '6px',
                      padding: '2px 7px',
                    }}
                  >
                    Soon
                  </span>
                </div>
              ) : (
                /* Active nav link */
                <NavLink
                  to={item.to}
                  id={`sidebar-${item.id}`}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: RADIUS.md,
                    textDecoration: 'none',
                    cursor: 'pointer',
                    backgroundColor: isActive ? C.accentSoft : 'transparent',
                    transition: 'background-color 0.15s ease',
                  })}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget
                    const active = el.getAttribute('aria-current') === 'page'
                    if (!active) el.style.backgroundColor = '#f4f4fc'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget
                    const active = el.getAttribute('aria-current') === 'page'
                    if (!active) el.style.backgroundColor = 'transparent'
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={16}
                        color={isActive ? C.accent : C.muted}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? C.accent : C.secondary,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {item.label}
                      </span>
                      {isActive && (
                        <ChevronRight
                          size={13}
                          color={C.accent}
                          strokeWidth={2.5}
                          style={{ marginLeft: 'auto' }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              )}
            </motion.div>
          )
        })}
      </nav>

      {/* Footer note */}
      <div
        style={{
          padding: '16px 24px 20px',
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <p style={{ fontSize: '11.5px', color: C.muted, lineHeight: '1.6' }}>
          Results are generated once per validation. Start a new validation to re-run.
        </p>
      </div>
    </motion.aside>
  )
}

export default DashboardSidebar
