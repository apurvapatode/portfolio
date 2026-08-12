import { useEffect, useState, type FormEvent } from 'react'
import { PROFILE } from '../data/content'

/**
 * The site is a static build with no backend, so this composes a prefilled
 * mail draft rather than POSTing anywhere. That keeps deployment dependency-free
 * while still capturing the fields that make an enquiry answerable on the first
 * reply — a bare mailto: link gets "hi, are you available?" and costs a round
 * trip to learn anything useful.
 *
 * To move this to a real endpoint later (Formspree, Resend, a serverless route),
 * replace the body of `handleSubmit` with a fetch; the markup stays as is.
 */

/**
 * Two distinct products, so the enquiry captures which one first — a same-week
 * fix and a full build sit at different price points, and a single ladder would
 * either underprice the build or scare off the fix.
 */
const WORK_TYPES = [
  'A fix or small change',
  'A full site build or rebuild',
  'Ongoing support',
  'Not sure yet',
]

/**
 * Pricing is deliberately absent from the public copy — the work is worth more
 * than a low anchor implies. This field stays because it is private (it only
 * reaches the inbox) and it qualifies the lead before a discovery call.
 *
 * Bands are entry-level by design: at ~2 years billing internationally the
 * market rate is $12—$22/hr. The top is left open ($5,000+) because US small
 * businesses spend $2,000—$8,000 on a freelance-built site, and a hard cap
 * would anchor better-funded clients into a cheaper bracket than they
 * arrived with.
 */
const BUDGETS = [
  'Under $300',
  '$300 — $1,000',
  '$1,000 — $2,500',
  '$2,500 — $5,000',
  '$5,000+',
  'Prefer to discuss',
]
const TIMELINES = ['ASAP', 'Within a month', '1—3 months', 'Just exploring']

export function EnquiryForm() {
  const [sent, setSent] = useState(false)

  /**
   * The service cards link to #contact carrying a `data-work` value. Rather than
   * lifting this state up through the page for one field, the form listens for
   * those clicks directly — the anchor still does the scrolling natively, and a
   * visitor arriving from "Rebuilds" lands with that option already chosen.
   *
   * Unrecognised values are ignored so a typo in the card data degrades to the
   * default rather than wedging the select on a value with no matching option.
   */
  const [workType, setWorkType] = useState(WORK_TYPES[0])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest?.('a[data-work]')
      const requested = link?.getAttribute('data-work')
      if (requested && WORK_TYPES.includes(requested)) setWorkType(requested)
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    const body = [
      `Name: ${data.get('name')}`,
      `Company: ${data.get('company') || '—'}`,
      `Needs: ${data.get('workType')}`,
      `Budget: ${data.get('budget')}`,
      `Timeline: ${data.get('timeline')}`,
      '',
      String(data.get('message') ?? ''),
    ].join('\n')

    const subject = `Project enquiry — ${data.get('name')}`
    window.location.href = `mailto:${PROFILE.email}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`

    setSent(true)
  }

  const field =
    'w-full rounded-lg border border-ash/70 bg-void/40 px-4 py-3 text-chalk outline-none transition-colors placeholder:text-mute focus-visible:border-acid'
  const label = 'mb-2 block font-mono text-[11px] uppercase tracking-[0.2em] text-mute'

  /**
   * Selects need their own treatment. A <select> does not inherit line-height
   * the way <input> does — the browser adds its own metrics around the option
   * text — so identical `py-3` renders a taller control. Pinning an explicit
   * height makes it match the inputs on every engine.
   *
   * `appearance-none` removes the native chevron (which otherwise doubles up
   * with ours); the background SVG replaces it, with `pr-11` reserving space so
   * long option text never runs underneath the arrow.
   */
  const selectField =
    `${field} h-[50px] appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-11 ` +
    `bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' stroke='%236b6b76' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")]`

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-lg flex-col gap-5">
      <div>
        <label className={label} htmlFor="enq-name">
          Name
        </label>
        <input
          id="enq-name"
          name="name"
          required
          autoComplete="name"
          className={`${field} h-[50px]`}
        />
      </div>

      <div>
        <label className={label} htmlFor="enq-company">
          Company <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="enq-company"
          name="company"
          autoComplete="organization"
          className={`${field} h-[50px]`}
        />
      </div>

      <div>
        <label className={label} htmlFor="enq-work-type">
          What do you need?
        </label>
        <select
          id="enq-work-type"
          name="workType"
          className={selectField}
          value={workType}
          onChange={(event) => setWorkType(event.target.value)}
        >
          {WORK_TYPES.map((option) => (
            <option key={option} value={option} className="bg-void">
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="enq-budget">
            Rough budget
          </label>
          <select
            id="enq-budget"
            name="budget"
            className={selectField}
            // "Not sure yet" — index-based defaults break silently when the
            // list changes, so this resolves by value.
            defaultValue={BUDGETS[BUDGETS.length - 1]}
          >
            {BUDGETS.map((option) => (
              <option key={option} value={option} className="bg-void">
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="enq-timeline">
            Timeline
          </label>
          <select
            id="enq-timeline"
            name="timeline"
            className={selectField}
            defaultValue="Within a month"
          >
            {TIMELINES.map((option) => (
              <option key={option} value={option} className="bg-void">
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="enq-message">
          What are you building?
        </label>
        <textarea
          id="enq-message"
          name="message"
          required
          rows={4}
          className={`${field} resize-y`}
          placeholder="What's broken, what you need, and any date you're working towards."
        />
      </div>

      <button
        type="submit"
        data-cursor="pointer"
        className="inline-flex w-fit items-center gap-3 rounded-full bg-acid px-8 py-4 font-medium text-void transition-colors hover:bg-chalk"
      >
        Send enquiry <span aria-hidden="true">→</span>
      </button>

      <p aria-live="polite" className="min-h-[1.25rem] text-sm text-bone">
        {sent
          ? 'Your mail client should have opened with the details filled in. If nothing happened, email me directly using the address above.'
          : ''}
      </p>
    </form>
  )
}
