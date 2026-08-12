import { useEffect } from 'react'
import Lenis from 'lenis'
import { useReducedMotion } from './useReducedMotion'

/**
 * Installs Lenis inertial scrolling and exposes it on `window.__lenis` so
 * anchor links can hand off to it. Skipped entirely under reduced motion —
 * hijacking the scrollbar is exactly what that preference is asking you not
 * to do.
 */
export function useSmoothScroll() {
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) return

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
      // Native scrolling on touch: momentum there is already good and
      // overriding it breaks pull-to-refresh.
      syncTouch: false,
    })

    window.__lenis = lenis

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
      delete window.__lenis
    }
  }, [reducedMotion])
}

declare global {
  interface Window {
    __lenis?: Lenis
  }
}
