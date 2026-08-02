/**
 * Recommendations.tsx
 * Section 5 — Numbered list of actionable recommendations.
 */
import { motion } from 'framer-motion'
import { C, FONT, RADIUS, fadeUp } from './tokens'

interface Props {
  recommendations: string[]
}

/* ═══════════════════════════════════════════════════════
   RECOMMENDATIONS
═══════════════════════════════════════════════════════ */
export function Recommendations({ recommendations }: Props) {
  return (
    <section id="recommendations" style={{ fontFamily: FONT }}>
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
          Recommendations
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
          Next steps
        </h2>
      </motion.div>

      {/* Card */}
      <motion.div
        {...fadeUp(0.1)}
        style={{
          backgroundColor: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: RADIUS.xl,
          padding: '32px',
          boxShadow: '0 4px 24px rgba(59,59,219,0.06)',
        }}
      >
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {recommendations.map((rec, i) => (
            <motion.li
              key={i}
              {...fadeUp(0.1 + i * 0.06)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '18px',
                padding: '18px 0',
                borderBottom: i < recommendations.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              {/* Step number */}
              <span
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: C.accentSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: FONT,
                  fontSize: '12px',
                  fontWeight: 800,
                  color: C.accent,
                  letterSpacing: '-0.02em',
                  marginTop: '1px',
                }}
              >
                {i + 1}
              </span>

              {/* Text */}
              <p
                style={{
                  fontSize: '14.5px',
                  color: C.secondary,
                  lineHeight: '1.7',
                  flex: 1,
                }}
              >
                {rec}
              </p>
            </motion.li>
          ))}
        </ol>
      </motion.div>
    </section>
  )
}

export default Recommendations
