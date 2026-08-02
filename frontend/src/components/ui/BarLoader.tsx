/**
 * BarLoader.tsx
 * Custom loader: a blue track with an orange sliding block.
 * Restyled to match BeforeBeta's design palette.
 * Blue line = #3b3bdb  |  Orange block = #FCA311
 */
import { motion } from 'framer-motion'

interface BarLoaderProps {
  /** Total width of the loader track in px */
  width?: number
  /** Height of the track bar in px */
  height?: number
  /** Width of the sliding orange block in px */
  blockWidth?: number
}

export function BarLoader({
  width = 280,
  height = 5,
  blockWidth = 80,
}: BarLoaderProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: `${height}px`,
        backgroundColor: '#e8e8f8',   /* light indigo track background */
        overflow: 'hidden',
      }}
    >
      {/* Blue filled track (static) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: `${height}px`,
          backgroundColor: '#3b3bdb22',
        }}
      />

      {/* Orange sliding block */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${blockWidth}px`,
          height: '100%',
          borderRadius: `${height}px`,
          background: 'linear-gradient(90deg, #3b3bdb 0%, #FCA311 100%)',
          boxShadow: '0 0 8px rgba(252, 163, 17, 0.6)',
        }}
        animate={{
          x: [
            -blockWidth,
            width - blockWidth,
            -blockWidth,
          ],
        }}
        transition={{
          duration: 1.8,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'loop',
        }}
      />
    </div>
  )
}

export default BarLoader
