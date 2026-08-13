import { useEffect, useRef, useState } from 'react'
import { useMagnetic } from '../hooks/useMagnetic'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { PROFILE } from '../data/content'

export type HeroProps = {
  /** Whether the shader lab sheet is open; the invitation hides while it is. */
  labOpen: boolean
  /** Opens the lab. The canvas and the sheet both live in ShaderField now —
      the hero only extends the invitation, because this is where a visitor
      first meets the field and where the offer makes sense. */
  onOpenLab: () => void
}

/**
 * First viewport of the page. The shader field behind it is not rendered here
 * any more — it is the site-wide ground (see ShaderField) — so this section is
 * pure content: the headline, the pitch, and the invitation to play with the
 * background it happens to be standing on.
 */
export function Hero({ labOpen, onOpenLab }: HeroProps) {
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
      className="relative isolate flex min-h-svh flex-col justify-between overflow-hidden px-6 pb-10 pt-28 md:px-10"
    >
      {/* The invitation matters as much as the feature: "this background is
          live code you can edit" is the whole point, and nobody discovers that
          from an unlabelled icon. Hidden while the panel is open so it never
          sits under the sheet on mobile.

          Below md it sits in normal flow above the headline. Pinned top-right
          it shares a band with the eyebrow line, and since the eyebrow is in
          centred flow it rides up on short viewports and collides — the two
          overlap on a 390x664 phone and worse on a 320px one, where the label
          wraps to three rows. From md up there is width to spare, so it goes
          back to the corner. */}
      {!labOpen && (
        <button
          type="button"
          onClick={onOpenLab}
          data-cursor="pointer"
          aria-expanded={labOpen}
          className="group z-20 mb-6 inline-flex items-center gap-2 self-start rounded-full border border-ash bg-void/70 px-4 py-2.5 text-[12px] text-bone backdrop-blur-md transition-colors hover:border-acid hover:text-acid md:absolute md:right-10 md:top-24 md:mb-0 md:self-auto"
        >
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-acid transition-transform group-hover:scale-125"
          />
          Play with this background
        </button>
      )}

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center">
        <div className="overflow-hidden">
          {/* Tracking tightens on small screens: at 0.35em this line wraps to
              three rows on a phone and reads as a block of noise next to the
              headline rather than as a label. */}
          <p
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-acid sm:tracking-[0.35em]"
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

        {/* Splits at lg, not md. At 768px the two-column layout gave the
            paragraph ~55% of an already narrow viewport — eight lines for forty
            words, with dead space beside it. One column holds until there is
            genuinely room for two. */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div className="overflow-hidden">
            <p
              className="max-w-xl text-balance text-lg leading-relaxed text-bone md:text-xl"
              style={reveal(0.44)}
            >
              I'm {PROFILE.name.split(' ')[0]}. I fix broken websites and build
              fast, accessible ones — for 5,000+ users in production, and for
              teams who need the small things handled before they turn into a
              rescue project. AI in the loop keeps timelines short; the quality
              bar stays mine.
            </p>
          </div>

          {/* Deliberately no wrap: stacked, these two read as a list of equal
              options rather than a primary and its alternate, and the fold gets
              pushed down on exactly the screens that can least afford it.
              Padding tightens instead so the pair stays on one row down to
              360px. `shrink-0` keeps the labels off two lines inside a pill. */}
          <div className="flex items-center gap-3 sm:gap-4" style={reveal(0.52)}>
            <a
              ref={ctaRef}
              href="#contact"
              data-cursor="pointer"
              className="group relative inline-flex shrink-0 items-center gap-3 overflow-hidden rounded-full bg-acid px-6 py-3.5 font-medium text-void transition-colors hover:bg-chalk sm:px-8 sm:py-4"
            >
              <span className="relative z-10">Start a project</span>
              <span className="relative z-10 transition-transform duration-500 group-hover:translate-x-1">
                →
              </span>
            </a>
            <a
              href="#work"
              data-cursor="pointer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ash px-6 py-3.5 font-medium text-chalk transition-colors hover:border-chalk sm:px-8 sm:py-4"
            >
              See the work
            </a>
          </div>
        </div>
      </div>

      {/* `justify-between` only distributes when there is slack to distribute.
          Below lg these three items fill the row edge to edge and the spacing
          reads as accidental, so the bar stacks into a deliberate left-aligned
          column instead and only spreads once it has the width to earn it. */}
      <div
        className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col items-start gap-2 border-t border-ash/60 pt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-mute sm:tracking-[0.2em] lg:flex-row lg:items-end lg:justify-between lg:gap-4"
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
        {/* Matches the bar's own lg breakpoint — at md it would appear while the
            bar is still stacked, adding a third orphan line. */}
        <span aria-hidden="true" className="hidden lg:inline">
          Scroll ↓
        </span>
      </div>
    </section>
  )
}
