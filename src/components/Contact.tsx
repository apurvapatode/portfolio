import { useRef } from 'react'
import { EnquiryForm } from './EnquiryForm'
import { PROFILE, SOCIALS } from '../data/content'
import { useMagnetic } from '../hooks/useMagnetic'
import { useInView } from '../hooks/useInView'
import { useReducedMotion } from '../hooks/useReducedMotion'

export function Contact() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.25 })
  const emailRef = useMagnetic<HTMLAnchorElement>(0.25, 160)
  const reducedMotion = useReducedMotion()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const mailto = `mailto:${PROFILE.email}?subject=${encodeURIComponent('Project enquiry')}`

  return (
    <section
      id="contact"
      className="grain relative isolate overflow-hidden px-6 py-32 md:px-10 md:py-48"
    >
      {/* Ambient wash — cheap CSS, no second GL context. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_120%,color-mix(in_srgb,var(--color-plasma)_28%,transparent),transparent_60%),radial-gradient(ellipse_at_20%_0%,color-mix(in_srgb,var(--color-acid)_8%,transparent),transparent_50%)]"
      />

      <div ref={ref} className="mx-auto max-w-[1600px]">
        <p
          className="mb-8 font-mono text-[11px] uppercase tracking-[0.35em] text-acid"
          style={{
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.8s ease',
          }}
        >
          {PROFILE.availability}
        </p>

        <h2
          ref={headingRef}
          className="font-display text-[clamp(2.5rem,11vw,11rem)] font-semibold uppercase leading-[0.85] tracking-[-0.045em]"
        >
          {['Let’s build', 'something', 'worth using.'].map((line, index) => (
            <span key={line} className="block overflow-hidden">
              <span
                className={`block ${index === 2 ? 'text-mute' : ''}`}
                style={{
                  transform: inView ? 'translateY(0)' : 'translateY(105%)',
                  opacity: inView ? 1 : 0,
                  transition: `transform 1.1s var(--ease-out-expo) ${index * 0.09}s, opacity 0.8s ease ${index * 0.09}s`,
                }}
              >
                {line}
              </span>
            </span>
          ))}
        </h2>

        <div
          className="mt-16 flex flex-col gap-10 border-t border-ash/70 pt-10 md:flex-row md:items-start md:justify-between"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(30px)',
            transition: 'opacity 0.9s ease 0.35s, transform 1s var(--ease-out-expo) 0.35s',
          }}
        >
          <div className="flex flex-col gap-6">
            <a
              ref={emailRef}
              href={mailto}
              data-cursor="pointer"
              className="group inline-flex w-fit items-center gap-4 font-display text-2xl font-medium tracking-tight text-chalk transition-colors hover:text-acid md:text-4xl"
            >
              <span className="relative">
                {PROFILE.email}
                {/* Underline wipe */}
                <span
                  aria-hidden="true"
                  className={`absolute -bottom-1 left-0 h-px w-full origin-left bg-acid transition-transform duration-500 ease-[var(--ease-out-expo)] ${
                    reducedMotion ? '' : 'scale-x-0 group-hover:scale-x-100'
                  }`}
                />
              </span>
              <span
                aria-hidden="true"
                className="transition-transform duration-500 group-hover:translate-x-2 group-hover:-translate-y-1"
              >
                ↗
              </span>
            </a>

            <a
              href={`tel:${PROFILE.phone.replace(/\s/g, '')}`}
              data-cursor="pointer"
              className="w-fit font-mono text-sm tracking-[0.1em] text-bone transition-colors hover:text-chalk"
            >
              {PROFILE.phone}
            </a>

            <p className="max-w-md text-pretty leading-relaxed text-bone">
              Tell me what you're building, what's broken, or what date you need
              it live by. I reply to every genuine enquiry within two working
              days.
            </p>

            <EnquiryForm />
          </div>

          <ul className="flex flex-col gap-3">
            {SOCIALS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-cursor="pointer"
                  className="group flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-mute transition-colors hover:text-chalk"
                >
                  <span className="h-px w-6 bg-ash transition-[width,background-color] duration-300 group-hover:w-10 group-hover:bg-acid" />
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
