import { useEffect, useRef, useState } from 'react'
import { PROFILE } from '../data/content'
import { ThemeToggle } from './ThemeToggle'

const LINKS = [
  { label: 'Work', href: '#work' },
  { label: 'Services', href: '#services' },
  { label: 'Process', href: '#process' },
  { label: 'FAQ', href: '#faq' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        setScrolled(y > 40)

        const max = document.documentElement.scrollHeight - window.innerHeight
        const progress = max > 0 ? y / max : 0
        // Written directly to avoid a render on every scroll frame.
        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${progress.toFixed(4)})`
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  // Active-section highlighting. Contact is observed too (though it has no nav
  // link) so that scrolling into it clears the highlight instead of leaving the
  // previous section stuck as "current".
  useEffect(() => {
    const sections = [...LINKS.map((link) => link.href), '#contact']
      .map((href) => document.querySelector<HTMLElement>(href))
      .filter((el): el is HTMLElement => el !== null)

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(`#${visible.target.id}`)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  // Close the mobile menu on Escape, and stop the page scrolling behind it.
  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.__lenis?.stop()

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      window.__lenis?.start()
    }
  }, [menuOpen])

  const onNavClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setMenuOpen(false)
    const target = document.querySelector<HTMLElement>(href)
    if (target && window.__lenis) {
      event.preventDefault()
      window.__lenis.scrollTo(target, { offset: -20 })
      // Keep the URL and focus in sync for keyboard and screen-reader users.
      history.replaceState(null, '', href)
      target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    }
  }

  return (
    <>
      <a
        href="#work"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-full focus:bg-acid focus:px-5 focus:py-3 focus:font-medium focus:text-void"
      >
        Skip to content
      </a>

      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-500 ${
          scrolled
            ? 'border-b border-ash/60 bg-void/70 backdrop-blur-xl'
            : 'border-b border-transparent'
        }`}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-6 py-5 md:px-10"
        >
          <a
            href="#top"
            data-cursor="pointer"
            onClick={(event) => onNavClick(event, '#top')}
            className="font-display text-sm font-semibold uppercase tracking-[0.2em] transition-colors hover:text-acid"
          >
            {PROFILE.name}
          </a>

          <ul className="hidden items-center gap-8 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  data-cursor="pointer"
                  onClick={(event) => onNavClick(event, link.href)}
                  aria-current={active === link.href ? 'true' : undefined}
                  className={`font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
                    active === link.href ? 'text-acid' : 'text-mute hover:text-chalk'
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <a
              href="#contact"
              data-cursor="pointer"
              onClick={(event) => onNavClick(event, '#contact')}
              className="hidden rounded-full border border-ash px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors hover:border-acid hover:text-acid sm:inline-block"
            >
              Get in touch
            </a>

            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-9 w-9 place-items-center rounded-full border border-ash transition-colors hover:border-chalk md:hidden"
            >
              <span aria-hidden="true" className="relative block h-3 w-4">
                <span
                  className="absolute left-0 block h-px w-full bg-chalk transition-transform duration-300"
                  style={{
                    transform: menuOpen
                      ? 'translateY(6px) rotate(45deg)'
                      : 'translateY(0) rotate(0)',
                  }}
                />
                <span
                  className="absolute left-0 top-1.5 block h-px w-full bg-chalk transition-opacity duration-200"
                  style={{ opacity: menuOpen ? 0 : 1 }}
                />
                <span
                  className="absolute bottom-0 left-0 block h-px w-full bg-chalk transition-transform duration-300"
                  style={{
                    transform: menuOpen
                      ? 'translateY(-6px) rotate(-45deg)'
                      : 'translateY(0) rotate(0)',
                  }}
                />
              </span>
            </button>
          </div>
        </nav>

        {/* Mobile panel. `hidden` when closed keeps the links out of the tab
            order rather than leaving them focusable behind a transform. */}
        <div
          id="mobile-menu"
          hidden={!menuOpen}
          className="border-t border-ash/60 bg-void/95 backdrop-blur-xl md:hidden"
        >
          <ul className="flex flex-col px-6 py-4">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={(event) => onNavClick(event, link.href)}
                  className="block border-b border-ash/40 py-4 font-display text-2xl font-medium uppercase tracking-tight transition-colors hover:text-acid"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div
          ref={progressRef}
          aria-hidden="true"
          className="h-px origin-left scale-x-0 bg-acid"
        />
      </header>
    </>
  )
}
