import { useEffect } from 'react'
import Lenis from 'lenis'
import Snap from 'lenis/snap'
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

    /**
     * Section snapping — the scroll settles a section's top edge against the
     * top of the viewport instead of stopping at an arbitrary offset.
     *
     * `proximity`, never `mandatory`: most sections here are 1500-1800px tall,
     * far taller than the viewport, and mandatory snapping on content like that
     * traps the reader — it fights every attempt to scroll through the middle of
     * a section. Proximity only pulls when the scroll has already come to rest
     * near a section top, which is exactly the "bring the section to me" case
     * and nothing else.
     *
     * Every section is registered regardless of height: the snap point is the
     * top edge, so a tall section still scrolls through normally once entered.
     * The short `distanceThreshold` is what keeps that true — past it, the
     * section is simply being read and no snapping applies.
     */
    const snap = new Snap(lenis, {
      type: 'proximity',
      // Deliberately tight. This is a fraction of the viewport, so anything
      // larger starts grabbing the scroll mid-section rather than at the seam.
      distanceThreshold: '12%',
      duration: 0.7,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      debounce: 400,
    })

    // addElement returns its own unsubscriber; they are tracked so a re-register
    // can tear down the previous set cleanly.
    let unsubscribers: Array<() => void> = []

    const registerSnapTargets = () => {
      unsubscribers.forEach((off) => off())
      unsubscribers = []

      document.querySelectorAll<HTMLElement>('main > section').forEach((section) => {
        // The hero already fills the screen and is where the page loads; snapping
        // it would fight the initial scroll away from the top.
        if (section.id === 'top') return
        unsubscribers.push(snap.addElement(section, { align: 'start' }))
      })
    }

    registerSnapTargets()
    // Section heights depend on font loading and viewport width, so re-measure
    // rather than trusting the first-paint layout.
    window.addEventListener('resize', registerSnapTargets)

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', registerSnapTargets)
      snap.destroy()
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
