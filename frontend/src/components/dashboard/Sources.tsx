/**
 * Sources.tsx
 * Section 9 — Collapsed "References" section at the very bottom.
 * Zero emojis.
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Link2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react'
import { C, FONT, RADIUS, fadeUp } from './tokens'
import { Badge } from './Badge'
import { EmptyState } from './EmptyState'

interface Props {
  sources: string[]
}

function displayDomain(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function Sources({ sources }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <section id="references" style={{ fontFamily: FONT, marginTop: '12px' }}>
      {/* Collapsible References Header */}
      <motion.div
        {...fadeUp(0.04)}
        whileHover={{ y: -1 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.xl,
          padding: '18px 24px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          transition: 'border-color 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: RADIUS.md,
              backgroundColor: C.accentSoft,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={17} color={C.accent} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: C.primary, margin: 0 }}>
                References & Research Sources
              </h3>
              <Badge variant="neutral" size="sm">
                {sources.length} Verified Sources
              </Badge>
            </div>
            <p style={{ fontSize: '12px', color: C.secondary, margin: 0 }}>
              Click to {isOpen ? 'collapse' : 'expand'} verified web sources and citation links
            </p>
          </div>
        </div>

        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: RADIUS.pill,
            backgroundColor: '#f4f4fc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.accent,
          }}
        >
          {isOpen ? <ChevronUp size={15} strokeWidth={2.5} /> : <ChevronDown size={15} strokeWidth={2.5} />}
        </div>
      </motion.div>

      {/* Collapsible Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden', marginTop: '10px' }}
          >
            <div
              style={{
                backgroundColor: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: RADIUS.xl,
                padding: '12px 24px 8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              }}
            >
              {sources.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No Sources Cited" message="No external references were cited for this run." />
              ) : (
                sources.map((url, i) => {
                  const domain = displayDomain(url)
                  return (
                    <div
                      key={url + i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                        padding: '12px 0',
                        borderBottom: i < sources.length - 1 ? `1px solid ${C.border}` : 'none',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <Link2 size={14} color={C.accent} strokeWidth={2} style={{ flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: 800, color: C.primary, margin: 0 }}>
                            {domain}
                          </p>
                          <p style={{ fontSize: '11px', color: C.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '450px' }}>
                            {url}
                          </p>
                        </div>
                      </div>

                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: C.accent,
                          backgroundColor: '#ffffff',
                          border: `1.5px solid ${C.border}`,
                          borderRadius: RADIUS.md,
                          padding: '4px 12px',
                          textDecoration: 'none',
                          flexShrink: 0,
                        }}
                      >
                        Open Link <ExternalLink size={11} strokeWidth={2.5} />
                      </a>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default Sources
