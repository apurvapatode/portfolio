import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

/**
 * Reports how far an element has travelled through the viewport as it scrolls,
 * as a 0→1 value: 0 when its top edge first enters from below, 1 when its
 * bottom edge leaves the top.
 *
 * The value is written to a CSS custom property on the element rather than
 * returned as React state — a scroll-linked value in state would re-render the
 * subtree on every frame, which is the usual reason parallax feels heavier than
 * it looks. Consumers read it in CSS via `var(--progress)`.
 *
 * Returns a ref to attach. Under reduced motion the property is pinned to the
 * midpoint so any transform driven by it resolves to a sensible static pose.
 */
export function useScrollProgress<T extends HTMLElement>(property = '--progress') {
  const ref = useRef<T>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (reducedMotion) {
      element.style.setProperty(property, '0.5')
      return
    }

    let frame = 0
    // Only measured while the element is on screen, so an offscreen section
    // costs one IntersectionObserver callback rather than a scroll handler.
    let visible = false

    const update = () => {
      frame = 0
      const rect = element.getBoundingClientRect()
      const total = window.innerHeight + rect.height
      const travelled = window.innerHeight - rect.top
      const progress = Math.min(1, Math.max(0, travelled / total))
      element.style.setProperty(property, progress.toFixed(4))
    }

    const onScroll = () => {
      if (!visible || frame) return
      frame = requestAnimationFrame(update)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) onScroll()
      },
      { threshold: 0 },
    )
    observer.observe(element)

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [property, reducedMotion])

  return ref
}
