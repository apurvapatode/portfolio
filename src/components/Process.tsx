import { PROCESS, STATS } from '../data/content'
import { KineticText } from './KineticText'
import { useInView } from '../hooks/useInView'
import { useCountUp } from '../hooks/useCountUp'

function Stat({ stat, index }: { stat: (typeof STATS)[number]; index: number }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const valueRef = useCountUp<HTMLDivElement>(stat.value, inView)

  return (
    <div
      ref={ref}
      className="border-t border-ash pt-5"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.7s ease ${index * 0.1}s, transform 0.8s var(--ease-out-expo) ${index * 0.1}s`,
      }}
    >
      {/* `tabular-nums` stops the digits jittering the layout mid-count, and the
          authored value stays in the DOM for assistive tech and no-JS. */}
      <div
        ref={valueRef}
        className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-none tracking-tight text-chalk [font-variant-numeric:tabular-nums]"
      >
        {stat.value}
      </div>
      <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">
        {stat.label}
      </div>
    </div>
  )
}

function Step({ step, index }: { step: (typeof PROCESS)[number]; index: number }) {
  const { ref, inView } = useInView<HTMLLIElement>()

  return (
    <li
      ref={ref}
      className="group relative grid gap-4 border-t border-ash py-8 md:grid-cols-[auto_1fr_2fr] md:items-baseline md:gap-10"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.7s ease ${index * 0.08}s, transform 0.8s var(--ease-out-expo) ${index * 0.08}s`,
      }}
    >
      {/* Progress line that draws itself as the step enters */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 h-px bg-acid transition-[width] duration-1000 ease-out"
        style={{ width: inView ? '100%' : '0%', transitionDelay: `${index * 0.08}s` }}
      />
      <span className="font-mono text-xs tracking-[0.2em] text-acid">
        {String(index + 1).padStart(2, '0')}
      </span>
      <h3 className="font-display text-2xl font-semibold uppercase tracking-tight transition-transform duration-500 md:group-hover:translate-x-2">
        {step.phase}
      </h3>
      <p className="max-w-2xl text-pretty leading-relaxed text-bone">{step.body}</p>
    </li>
  )
}

export function Process() {
  return (
    <section id="process" className="relative px-6 py-28 md:px-10 md:py-40">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.4fr] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-acid">
              How it works
            </p>
            <KineticText
              as="h2"
              text="No surprises, no black box."
              className="font-display text-[clamp(2.2rem,5vw,4.5rem)] font-semibold uppercase leading-[0.9] tracking-[-0.04em] text-balance"
            />
            <p className="mt-8 max-w-md text-pretty leading-relaxed text-bone">
              You see the work every week, on a real URL, from the first sprint.
              Fixed scope, fixed price, and a handover your team can maintain
              after I'm gone.
            </p>

            <div className="mt-14 grid grid-cols-3 gap-6">
              {STATS.map((stat, index) => (
                <Stat key={stat.label} stat={stat} index={index} />
              ))}
            </div>
          </div>

          <ol className="border-b border-ash">
            {PROCESS.map((step, index) => (
              <Step key={step.phase} step={step} index={index} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
