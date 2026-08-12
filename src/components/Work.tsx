import { useRef, useState } from 'react'
import { PROJECTS, type Project } from '../data/content'
import { KineticText } from './KineticText'
import { useInView } from '../hooks/useInView'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Case-study list. Each row is a link that skews toward the pointer on hover
 * and reveals a generated gradient preview that follows the cursor.
 *
 * The preview is a procedural CSS composition rather than an image so there are
 * no assets to ship and nothing to lazy-load — swap for real screenshots when
 * you have them.
 */
function ProjectRow({ project, index }: { project: Project; index: number }) {
  const { ref, inView } = useInView<HTMLLIElement>()
  const reducedMotion = useReducedMotion()
  const rowRef = useRef<HTMLAnchorElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)

  const onPointerMove = (event: React.PointerEvent) => {
    if (reducedMotion) return
    const preview = previewRef.current
    const row = rowRef.current
    if (!preview || !row) return

    const rect = row.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Preview tracks the cursor; the tilt is derived from vertical offset so it
    // feels like the card is hinged on the pointer.
    preview.style.transform = `translate3d(${x - 140}px, ${y - 100}px, 0) rotate(${((y / rect.height) * 2 - 1) * 6}deg)`
  }

  const isExternal = project.href.startsWith('http')
  // Not every external link is a deployed site — the Figma case-study file is
  // one too — so the hover caption names the destination rather than assuming.
  const externalLabel = project.href.includes('figma.com')
    ? 'View in Figma ↗'
    : 'Visit live site ↗'

  return (
    <li
      ref={ref}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.8s ease ${index * 0.08}s, transform 0.9s var(--ease-out-expo) ${index * 0.08}s`,
      }}
    >
      <a
        ref={rowRef}
        href={project.href}
        data-cursor={isExternal ? 'view' : 'pointer'}
        {...(isExternal ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerMove={onPointerMove}
        className="group relative block overflow-hidden border-t border-ash/70 py-10 transition-colors duration-500 hover:border-chalk/40 md:py-14"
      >
        {/* Accent wash on hover */}
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
          style={{
            background: `radial-gradient(600px circle at 50% 50%, ${project.accent}14, transparent 70%)`,
          }}
        />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-baseline md:justify-between">
          <div className="flex items-baseline gap-5 md:gap-8">
            <span className="font-mono text-xs text-mute">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="font-display text-[clamp(2rem,6vw,5rem)] font-semibold uppercase leading-[0.9] tracking-[-0.03em] transition-transform duration-700 md:group-hover:translate-x-4">
              {project.title}
            </h3>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1 md:items-end">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-mute">
              {project.year}
            </span>
            <span className="text-sm text-bone">{project.client}</span>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr] md:gap-16 md:pl-[3.6rem]">
          <p className="max-w-2xl text-pretty leading-relaxed text-bone">
            {project.summary}
          </p>

          <div className="flex flex-col gap-4 md:items-end">
            <div className="flex items-baseline gap-2">
              <span
                className="font-display text-3xl font-semibold tracking-tight"
                style={{ color: project.accent }}
              >
                {project.metric.value}
              </span>
              <span className="text-xs text-mute">{project.metric.label}</span>
            </div>
            <ul className="flex flex-wrap gap-2 md:justify-end">
              {project.discipline.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-ash px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-mute transition-colors group-hover:border-bone/40 group-hover:text-bone"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Cursor-following preview card, desktop only. */}
        {!reducedMotion && (
          <div
            ref={previewRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 hidden h-[200px] w-[280px] overflow-hidden rounded-lg border border-white/10 shadow-2xl transition-opacity duration-300 will-change-transform lg:block"
            style={{
              opacity: hovered ? 1 : 0,
              // Fades into the page background rather than a literal near-black,
              // so the preview does not stay dark in light mode.
              background: `linear-gradient(135deg, ${project.accent}, var(--color-void) 60%), radial-gradient(circle at 30% 20%, ${project.accent}66, transparent 60%)`,
            }}
          >
            {/* Scrim so the caption stays legible over the accent gradient.
                color-mix keeps it tied to the theme background. */}
            <div className="absolute inset-0 bg-[linear-gradient(0deg,color-mix(in_srgb,var(--color-void)_85%,transparent),transparent_60%)]" />
            <span className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-[0.25em] text-chalk">
              {isExternal ? externalLabel : 'Case study'}
            </span>
          </div>
        )}
      </a>
    </li>
  )
}

export function Work() {
  return (
    <section id="work" className="relative px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <KineticText
            as="h2"
            text="Selected work"
            className="font-display text-[clamp(2.5rem,8vw,7rem)] font-semibold uppercase leading-[0.85] tracking-[-0.04em]"
          />
          <p className="max-w-sm font-mono text-xs uppercase leading-relaxed tracking-[0.2em] text-mute">
            Production frontends — shipped, measured, and still running.
          </p>
        </header>

        <ul className="border-b border-ash/70">
          {PROJECTS.map((project, index) => (
            <ProjectRow key={project.id} project={project} index={index} />
          ))}
        </ul>
      </div>
    </section>
  )
}
