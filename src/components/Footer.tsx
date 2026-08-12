import { useEffect, useState } from 'react'
import { PROFILE } from '../data/content'

export function Footer() {
  const [time, setTime] = useState('')

  // Local clock in IST — a small signal that a real person is behind the site.
  useEffect(() => {
    const update = () =>
      setTime(
        new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        }).format(new Date()),
      )

    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <footer className="border-t border-ash/70 px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-mute md:flex-row md:items-center md:justify-between">
        <span>
          © {new Date().getFullYear()} {PROFILE.name}
        </span>
        <span className="flex items-center gap-2">
          {PROFILE.location}
          {time && <span aria-label={`Local time ${time}`}>· {time} IST</span>}
        </span>
        <a
          href="#top"
          data-cursor="pointer"
          className="group flex items-center gap-2 transition-colors hover:text-chalk"
          onClick={(event) => {
            // Hand off to Lenis so the scroll matches the rest of the site.
            if (window.__lenis) {
              event.preventDefault()
              window.__lenis.scrollTo(0)
            }
          }}
        >
          Back to top
          <span aria-hidden="true" className="transition-transform group-hover:-translate-y-1">
            ↑
          </span>
        </a>
      </div>
    </footer>
  )
}
