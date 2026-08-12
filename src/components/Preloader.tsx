import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Brief entry curtain with a counter. Capped at ~1.4s and it never gates real
 * content — the page underneath is already interactive, this just covers it.
 */
export function Preloader() {
  const reducedMotion = useReducedMotion()
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (reducedMotion) {
      setDone(true)
      return
    }

    let frame = 0
    const start = performance.now()
    const DURATION = 1200

    const tick = (now: number) => {
      const t = Math.min((now - start) / DURATION, 1)
      // easeOutExpo so the counter sprints then settles
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setProgress(Math.round(eased * 100))

      if (t < 1) frame = requestAnimationFrame(tick)
      else setTimeout(() => setDone(true), 180)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90] flex items-end justify-between bg-void px-6 pb-10 transition-[transform,opacity] duration-[900ms] ease-[var(--ease-in-out-quint)] md:px-10"
      style={{
        transform: done ? 'translateY(-100%)' : 'translateY(0)',
        opacity: done ? 0 : 1,
      }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-mute">
        Loading experience
      </span>
      <span className="font-display text-[clamp(3rem,12vw,9rem)] font-semibold leading-none tracking-tighter text-chalk tabular-nums">
        {String(progress).padStart(3, '0')}
      </span>
    </div>
  )
}
