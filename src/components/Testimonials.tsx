import { TESTIMONIALS } from '../data/content'
import { useInView } from '../hooks/useInView'

/**
 * Renders nothing while TESTIMONIALS is empty, so the section simply does not
 * exist until there are real quotes to put in it. An empty "what clients say"
 * heading is worse than no section at all.
 */
export function Testimonials() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.2 })

  if (TESTIMONIALS.length === 0) return null

  return (
    <section
      id="testimonials"
      className="grain relative isolate overflow-hidden px-6 py-32 md:px-10 md:py-40"
    >
      <div ref={ref} className="mx-auto max-w-[1600px]">
        <p className="mb-16 font-mono text-[11px] uppercase tracking-[0.35em] text-acid">
          Client feedback
        </p>

        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <li
              key={testimonial.name}
              className="flex flex-col justify-between gap-8 rounded-2xl border border-ash/60 bg-chalk/[0.02] p-8"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(28px)',
                transition: `opacity 0.8s ease ${index * 0.08}s, transform 0.9s var(--ease-out-expo) ${index * 0.08}s`,
              }}
            >
              <blockquote className="text-pretty text-lg leading-relaxed text-bone">
                “{testimonial.quote}”
              </blockquote>
              <footer className="font-mono text-[11px] uppercase tracking-[0.2em] text-mute">
                <span className="text-chalk">{testimonial.name}</span>
                <span className="mt-1 block">{testimonial.title}</span>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
