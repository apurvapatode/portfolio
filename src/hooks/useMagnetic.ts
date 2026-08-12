import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

/**
 * Pulls an element toward the pointer when it's within `radius`, then springs
 * back on exit. Writes transforms directly in a rAF loop rather than through
 * state — a magnetic button that re-renders React on every mousemove is how
 * these effects earn their bad reputation.
 */
export function useMagnetic<T extends HTMLElement>(strength = 0.35, radius = 120) {
  const ref = useRef<T>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element || reducedMotion) return

    // Skip on touch: there's no hover, so the effect can only misfire.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const current = { x: 0, y: 0 }
    const target = { x: 0, y: 0 }
    let frame = 0
    let running = false

    const tick = () => {
      current.x += (target.x - current.x) * 0.15
      current.y += (target.y - current.y) * 0.15
      element.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0)`

      // Park the loop once we've visually settled.
      const settled =
        Math.abs(target.x - current.x) < 0.05 && Math.abs(target.y - current.y) < 0.05
      if (settled && target.x === 0 && target.y === 0) {
        element.style.transform = ''
        running = false
        return
      }
      frame = requestAnimationFrame(tick)
    }

    const start = () => {
      if (!running) {
        running = true
        frame = requestAnimationFrame(tick)
      }
    }

    // The element's box is cached instead of measured per pointermove. Every
    // instance of this hook listens on window, so with several magnetic
    // elements on a page the old per-event getBoundingClientRect meant N forced
    // layouts for each of the ~120 events a second a fast mouse emits.
    //
    // Invalidated on scroll and resize — the only things that move the box
    // while the pointer is active. `null` means "re-measure on next use".
    let rect: DOMRect | null = null
    const invalidate = () => {
      rect = null
    }

    const onPointerMove = (event: PointerEvent) => {
      rect ??= element.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)

      if (Math.hypot(dx, dy) < radius + Math.max(rect.width, rect.height) / 2) {
        target.x = dx * strength
        target.y = dy * strength
      } else {
        // Already at rest and still out of range: nothing to animate, so skip
        // waking the loop.
        if (target.x === 0 && target.y === 0 && !running) return
        target.x = 0
        target.y = 0
      }
      start()
    }

    const onLeave = () => {
      target.x = 0
      target.y = 0
      start()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', invalidate, { passive: true })
    window.addEventListener('resize', invalidate, { passive: true })
    element.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', invalidate)
      window.removeEventListener('resize', invalidate)
      element.removeEventListener('pointerleave', onLeave)
      element.style.transform = ''
    }
  }, [strength, radius, reducedMotion])

  return ref
}
