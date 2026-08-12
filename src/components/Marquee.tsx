import { useEffect, useRef } from 'react'
import { CAPABILITIES } from '../data/content'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Infinite marquee whose speed and direction react to scroll velocity — scroll
 * down and it accelerates, scroll up and it reverses.
 *
 * Implemented with a manual transform loop rather than a CSS animation because
 * the offset has to stay addressable to fold in velocity.
 */
export function Marquee() {
  const trackRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    const track = trackRef.current
    if (!track) return

    let offset = 0
    let velocity = 0
    let lastScroll = window.scrollY
    let frame = 0

    // `scrollWidth` forces a synchronous layout, so it is measured here and on
    // resize rather than per frame — reading it inside the loop made the
    // browser re-lay-out the track 60 times a second for a value that only
    // changes when the viewport or font does.
    let half = track.scrollWidth / 2
    const measure = () => {
      half = track.scrollWidth / 2
    }
    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(track)

    const onScroll = () => {
      const current = window.scrollY
      velocity += (current - lastScroll) * 0.28
      lastScroll = current
    }

    // Idles when scrolled past. The marquee sits high on the page, so without
    // this it keeps compositing a transform behind every section below it.
    let visible = true
    const observer = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible
        visible = entry.isIntersecting
        if (visible && !wasVisible) frame = requestAnimationFrame(tick)
      },
      { threshold: 0 },
    )
    observer.observe(track)

    const tick = () => {
      velocity *= 0.92 // friction back toward the idle speed
      offset -= 0.55 + velocity

      // The track renders its content twice; wrapping at the halfway point
      // makes the loop seamless.
      if (half > 0) {
        if (offset <= -half) offset += half
        if (offset > 0) offset -= half
      }

      track.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`
      if (visible) frame = requestAnimationFrame(tick)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    frame = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  // Duplicated for the seamless wrap; the copy is hidden from assistive tech.
  const items = [...CAPABILITIES, ...CAPABILITIES]

  return (
    <section aria-label="Capabilities" className="relative border-y border-ash/70 py-8">
      <div className="edge-fade overflow-hidden">
        <div
          ref={trackRef}
          className={`flex w-max items-center gap-10 will-change-transform ${
            reducedMotion ? 'flex-wrap justify-center px-6' : ''
          }`}
        >
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              aria-hidden={index >= CAPABILITIES.length ? 'true' : undefined}
              className="flex shrink-0 items-center gap-10 font-display text-xl font-medium uppercase tracking-tight text-bone md:text-3xl"
            >
              {item}
              <span className="text-acid" aria-hidden="true">
                ✦
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
