/**
 * Sources.tsx
 * Section 6 — List of source URLs used during validation.
 */
import { motion } from 'framer-motion'
import { ExternalLink, Link2 } from 'lucide-react'
import { C, FONT, RADIUS, fadeUp } from './tokens'

interface Props {
  sources: string[]
}

/* ── Extract domain from URL for display ── */
function displayDomain(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/* ─── Single source row ─── */
function SourceRow({ url, index }: { url: string; index: number }) {
  const domain = displayDomain(url)

  return (
    <motion.div
      {...fadeUp(0.06 + index * 0.04)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 0',
        borderBottom: `1px solid ${C.border}`,
        fontFamily: FONT,
      }}
    >
      {/* Index */}
      <span
        style={{
          width: '24px',
          fontFamily: FONT,
          fontSize: '12px',
          fontWeight: 700,
          color: C.muted,
          flexShrink: 0,
          textAlign: 'right',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Link icon */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: RADIUS.sm,
          background: C.accentSoft,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Link2 size={14} color={C.accent} strokeWidth={2} />
      </div>

      {/* Domain + full URL */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13.5px', fontWeight: 700, color: C.primary, letterSpacing: '-0.01em', marginBottom: '2px' }}>
          {domain}
        </p>
        <p
          style={{
            fontSize: '11.5px',
            color: C.muted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {url}
        </p>
      </div>

      {/* Open link */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          fontWeight: 600,
          color: C.accent,
          textDecoration: 'none',
          flexShrink: 0,
          padding: '6px 12px',
          border: `1.5px solid ${C.border}`,
          borderRadius: RADIUS.sm,
          transition: 'border-color 0.15s ease',
          fontFamily: FONT,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.accent)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
      >
        Open <ExternalLink size={11} strokeWidth={2.5} />
      </a>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════
   SOURCES
═══════════════════════════════════════════════════════ */
export function Sources({ sources }: Props) {
  return (
    <section id="sources" style={{ fontFamily: FONT }}>
      {/* Section header */}
      <motion.div {...fadeUp(0.04)} style={{ marginBottom: '24px' }}>
        <p
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: C.accent,
            marginBottom: '8px',
          }}
        >
          Sources
        </p>
        <h2
          style={{
            fontFamily: FONT,
            fontSize: 'clamp(20px, 2.4vw, 26px)',
            fontWeight: 800,
            color: C.primary,
            letterSpacing: '-0.04em',
            lineHeight: 1.2,
          }}
        >
          {sources.length} source{sources.length !== 1 ? 's' : ''} reviewed
        </h2>
      </motion.div>

      {/* Sources card */}
      <motion.div
        {...fadeUp(0.1)}
        style={{
          backgroundColor: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.xl,
          padding: '8px 24px 0',
          boxShadow: '0 4px 24px rgba(59,59,219,0.06)',
        }}
      >
        {sources.length === 0 ? (
          <p style={{ fontSize: '14px', color: C.muted, padding: '24px 0' }}>
            No sources available yet.
          </p>
        ) : (
          sources.map((url, i) => (
            <SourceRow key={url + i} url={url} index={i} />
          ))
        )}
      </motion.div>
    </section>
  )
}

export default Sources
