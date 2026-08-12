import { useEffect, useRef, useState } from 'react'
import { ShaderCanvas } from '../webgl/ShaderCanvas'
import { useMagnetic } from '../hooks/useMagnetic'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { PROFILE } from '../data/content'

export function Hero() {
  const reducedMotion = useReducedMotion()
  const [mounted, setMounted] = useState(false)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const ctaRef = useMagnetic<HTMLAnchorElement>(0.4, 90)

  // Drives the entrance; one paint after mount so the transition actually runs.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Parallax the headline against the shader on scroll.
  useEffect(() => {
    if (reducedMotion) return
    const title = titleRef.current
    if (!title) return

    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (y > window.innerHeight) return // offscreen, stop paying for it
        title.style.transform = `translate3d(0, ${y * 0.25}px, 0)`
        title.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.7)))
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  const reveal = (delay: number) => ({
    transform: mounted ? 'translateY(0)' : 'translateY(100%)',
    opacity: mounted ? 1 : 0,
    transition: `transform 1.2s var(--ease-out-expo) ${delay}s, opacity 1s ease ${delay}s`,
  })

  return (
    <section
      id="top"
      className="grain relative isolate flex min-h-svh flex-col justify-between overflow-hidden px-6 pb-10 pt-28 md:px-10"
    >
      <ShaderCanvas />

      {/* Legibility scrim. The shader is bright in places and display type sits
          directly on it, so this guarantees text contrast regardless of where
          the fluid field happens to be at any given frame. */}
      {/* Both scrims are the page background at partial alpha, so this works in
          either theme: it pushes the shader toward the ground colour rather
          than toward black specifically. */}
      <div className="absolute inset-0 -z-0 bg-void/55" />
      <div className="absolute inset-0 -z-0 bg-gradient-to-b from-void/80 via-transparent to-void" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center">
        <div className="overflow-hidden">
          <p
            className="font-mono text-[11px] uppercase tracking-[0.35em] text-acid"
            style={reveal(0.1)}
          >
            {PROFILE.role} — {PROFILE.tagline}
          </p>
        </div>

        <h1
          ref={titleRef}
          className="mt-6 font-display text-[clamp(3rem,13vw,13rem)] font-semibold uppercase leading-[0.82] tracking-[-0.04em] will-change-transform"
        >
          <span className="block overflow-hidden">
            <span className="block" style={reveal(0.18)}>
              Interfaces
            </span>
          </span>
          <span className="block overflow-hidden">
            <span className="block text-bone" style={reveal(0.26)}>
              that make
            </span>
          </span>
          <span className="block overflow-hidden">
            <span
              className="block bg-gradient-to-r from-acid via-chalk to-plasma bg-clip-text text-transparent"
              style={reveal(0.34)}
            >
              people stay.
            </span>
          </span>
        </h1>

        <div className="mt-10 grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div className="overflow-hidden">
            <p
              className="max-w-xl text-balance text-lg leading-relaxed text-bone md:text-xl"
              style={reveal(0.44)}
            >
              I'm {PROFILE.name.split(' ')[0]} — I fix broken websites and build
              fast, accessible ones. From a one-off bug nobody else will touch to
              a full rebuild. Two years shipping to 5,000+ users, with an
              AI-assisted workflow that cuts the timeline without cutting the
              quality bar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4" style={reveal(0.52)}>
            <a
              ref={ctaRef}
              href="#contact"
              data-cursor="pointer"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-acid px-8 py-4 font-medium text-void transition-colors hover:bg-chalk"
            >
              <span className="relative z-10">Start a project</span>
              <span className="relative z-10 transition-transform duration-500 group-hover:translate-x-1">
                →
              </span>
            </a>
            <a
              href="#work"
              data-cursor="pointer"
              className="inline-flex items-center gap-2 rounded-full border border-ash px-8 py-4 font-medium text-chalk transition-colors hover:border-chalk"
            >
              See the work
            </a>
          </div>
        </div>
      </div>

      <div
        className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-wrap items-end justify-between gap-4 border-t border-ash/60 pt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-mute"
        style={reveal(0.6)}
      >
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {!reducedMotion && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-acid opacity-60" />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-acid" />
          </span>
          {PROFILE.availability}
        </span>
        <span>{PROFILE.location}</span>
        <span aria-hidden="true" className="hidden md:inline">
          Scroll ↓
        </span>
      </div>
    </section>
  )
}
