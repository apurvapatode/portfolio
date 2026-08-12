import { useRef } from 'react'
import { SERVICES } from '../data/content'
import { KineticText } from './KineticText'
import { useInView } from '../hooks/useInView'
import { useReducedMotion } from '../hooks/useReducedMotion'

function ServiceCard({ service, index }: { service: (typeof SERVICES)[number]; index: number }) {
  const { ref, inView } = useInView<HTMLElement>()
  const cardRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotion()

  // 3D tilt toward the pointer. Perspective lives on the parent so the card
  // rotates in place rather than shearing.
  const onPointerMove = (event: React.PointerEvent) => {
    if (reducedMotion) return
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5

    card.style.transform = `rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateZ(0)`
    card.style.setProperty('--glow-x', `${(px + 0.5) * 100}%`)
    card.style.setProperty('--glow-y', `${(py + 0.5) * 100}%`)
  }

  const onPointerLeave = () => {
    const card = cardRef.current
    if (card) card.style.transform = ''
  }

  return (
    <article
      ref={ref}
      className="[perspective:1200px]"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(50px)',
        transition: `opacity 0.8s ease ${index * 0.1}s, transform 0.9s var(--ease-out-expo) ${index * 0.1}s`,
      }}
    >
      <div
        ref={cardRef}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        className="group relative h-full overflow-hidden rounded-2xl border border-ash bg-ink/60 p-8 backdrop-blur-sm transition-[transform,border-color,background-color] duration-300 ease-out will-change-transform hover:border-bone/30 hover:bg-smoke/60 md:p-10"
      >
        {/* Pointer-tracked glow */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              'radial-gradient(400px circle at var(--glow-x,50%) var(--glow-y,50%), rgba(215,255,62,0.07), transparent 65%)',
          }}
        />

        <div className="relative z-10 flex h-full flex-col">
          <span className="font-mono text-xs tracking-[0.2em] text-acid">
            {String(index + 1).padStart(2, '0')}
          </span>

          <h3 className="mt-6 font-display text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
            {service.title}
          </h3>

          <p className="mt-4 flex-1 text-pretty leading-relaxed text-bone">
            {service.body}
          </p>

          <ul className="mt-8 flex flex-wrap gap-2">
            {service.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-smoke px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-mute transition-colors group-hover:text-bone"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}

export function Services() {
  return (
    <section id="services" className="relative px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-16 max-w-3xl">
          <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-acid">
            What I do
          </p>
          <KineticText
            as="h2"
            text="Four ways I can help you ship."
            className="font-display text-[clamp(2.2rem,6vw,5rem)] font-semibold uppercase leading-[0.9] tracking-[-0.04em] text-balance"
          />
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {SERVICES.map((service, index) => (
            <ServiceCard key={service.title} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
