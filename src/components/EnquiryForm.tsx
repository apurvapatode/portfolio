import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PROFILE } from '../data/content'

/**
 * Posts to /api/enquiry, a Vercel serverless function that emails the enquiry
 * through Resend. See api/enquiry.ts for the delivery side and the env vars it
 * needs.
 *
 * This replaced a mailto: handoff. The problem with mailto: was not that it was
 * low-tech — it was that it fails silently: a visitor without a configured mail
 * client (most people reading on a phone) got nothing, while the form still
 * claimed the message had been sent. A lead vanished with no signal on either
 * end. Every outcome below is now something the visitor can actually see.
 *
 * If the endpoint is unreachable or misconfigured, the error state falls back
 * to a prefilled mailto: link rather than a dead end — the enquiry is worth more
 * than the purity of the mechanism.
 */

/**
 * Two distinct products, so the enquiry captures which one first — a same-week
 * fix and a full build sit at different price points, and a single ladder would
 * either underprice the build or scare off the fix.
 *
 * Kept in sync with the same list in api/enquiry.ts, which rejects values it
 * does not recognise.
 */
const WORK_TYPES = [
  'A fix or small change',
  'A full site build or rebuild',
  'Ongoing support',
  'Not sure yet',
]

const TIMELINES = ['ASAP', 'Within a month', '1—3 months', 'Just exploring']

type Status = 'idle' | 'sending' | 'sent' | 'error'

/**
 * How long to wait before giving up on the endpoint. A serverless cold start
 * plus the Resend call is comfortably under this; past it, the visitor is
 * staring at "Sending…" with no way to tell that it has stalled. The abort
 * lands them on the error state, which carries the mailto: fallback.
 */
const SUBMIT_TIMEOUT_MS = 15000

export function EnquiryForm() {
  const [status, setStatus] = useState<Status>('idle')
  /**
   * The endpoint distinguishes a rejected submission (400 — a field the visitor
   * can fix) from a delivery failure (502/503 — nothing they can do but email
   * instead). Showing one generic line for both sent people to the mailto:
   * fallback over a typo, so the server's own message is surfaced when it has
   * one, and only the unfixable cases offer the fallback link.
   */
  const [errorMessage, setErrorMessage] = useState('')
  const [errorRecoverable, setErrorRecoverable] = useState(false)
  /** 429 only: the message stands alone, with no follow-up advice appended. */
  const [errorSelfExplanatory, setErrorSelfExplanatory] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  /** Retained on failure so the fallback mailto: keeps what was typed. */
  const draftRef = useRef('')

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending') return

    const data = new FormData(event.currentTarget)
    const payload = {
      name: String(data.get('name') ?? ''),
      company: String(data.get('company') ?? ''),
      email: String(data.get('email') ?? ''),
      workType: String(data.get('workType') ?? ''),
      timeline: String(data.get('timeline') ?? ''),
      message: String(data.get('message') ?? ''),
      website: String(data.get('website') ?? ''),
    }

    draftRef.current = [
      `Name: ${payload.name}`,
      `Company: ${payload.company || '—'}`,
      `Email: ${payload.email}`,
      `Needs: ${payload.workType}`,
      `Timeline: ${payload.timeline}`,
      '',
      payload.message,
    ].join('\n')

    setStatus('sending')

    // Without this the request can hang indefinitely on a dead connection and
    // the button sits disabled on "Sending…" forever.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS)

    try {
      const response = await fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        // A 4xx is the visitor's to fix; anything else is ours, and the
        // mailto: fallback is the only route left for them.
        //
        // 429 is the exception on both counts: there is no field to correct,
        // so "adjust that and try again" is wrong, and the block is temporary,
        // so pushing them to email would be an overreaction. The server's own
        // message ("try again shortly") is the whole instruction.
        const rateLimited = response.status === 429
        const recoverable = response.status >= 400 && response.status < 500
        const served = await response
          .json()
          .then((body: unknown) =>
            body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
              ? (body as { error: string }).error
              : '',
          )
          .catch(() => '')

        setErrorMessage(served || 'Something went wrong sending that.')
        setErrorRecoverable(recoverable)
        setErrorSelfExplanatory(rateLimited)
        setStatus('error')
        return
      }

      setStatus('sent')
      setErrorMessage('')
      formRef.current?.reset()
      setWorkType(WORK_TYPES[0])
    } catch (error) {
      console.error('[enquiry] submit failed:', error)
      setErrorMessage(
        (error as Error)?.name === 'AbortError'
          ? 'That took too long to send.'
          : 'Something went wrong sending that.',
      )
      setErrorRecoverable(false)
      setErrorSelfExplanatory(false)
      setStatus('error')
    } finally {
      clearTimeout(timeout)
    }
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

  const sending = status === 'sending'

  const fallbackMailto = `mailto:${PROFILE.email}?subject=${encodeURIComponent(
    'Project enquiry',
  )}&body=${encodeURIComponent(draftRef.current)}`

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={() => {
        // A "sent" or error line left standing while the visitor types their
        // next message describes a submission no longer on screen.
        if (status === 'sent' || status === 'error') setStatus('idle')
      }}
      className="relative flex w-full max-w-lg flex-col gap-5"
    >
      <div>
        <label className={label} htmlFor="enq-name">
          Name
        </label>
        <input
          id="enq-name"
          name="name"
          required
          maxLength={100}
          autoComplete="name"
          className={`${field} h-[50px]`}
        />
      </div>

      <div>
        <label className={label} htmlFor="enq-email">
          Email
        </label>
        <input
          id="enq-email"
          name="email"
          type="email"
          required
          maxLength={100}
          autoComplete="email"
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
          maxLength={100}
          autoComplete="organization"
          className={`${field} h-[50px]`}
        />
      </div>

      {/*
        Honeypot. Positioned offscreen rather than `display:none` because some
        bots skip fields they can tell are hidden — but it must be genuinely
        absent for assistive tech, or a screen reader user tabs into an unlabelled
        box and gets their enquiry silently dropped as spam. `aria-hidden` on the
        input itself (not just the wrapper) plus `tabIndex={-1}` keeps it out of
        both the accessibility tree and the tab order.
      */}
      <div className="pointer-events-none absolute left-[-9999px]" aria-hidden="true">
        <input
          id="enq-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
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

      <div>
        <label className={label} htmlFor="enq-message">
          What are you building?
        </label>
        <textarea
          id="enq-message"
          name="message"
          required
          rows={4}
          maxLength={5000}
          className={`${field} resize-y`}
          placeholder="What's broken, what you need, and any date you're working towards."
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        data-cursor="pointer"
        className="inline-flex w-fit items-center gap-3 rounded-full bg-acid px-8 py-4 font-medium text-void transition-colors hover:bg-chalk disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-acid"
      >
        {sending ? 'Sending…' : 'Send enquiry'}
        <span aria-hidden="true">{sending ? '···' : '→'}</span>
      </button>

      {/*
        One live region for every outcome. `min-h` reserves the space so the
        form does not jump when a message appears.
      */}
      <p aria-live="polite" className="min-h-[1.25rem] text-sm text-bone">
        {status === 'sent' &&
          `Thanks — that's landed in my inbox. I reply to every genuine enquiry within two working days.`}
        {status === 'error' && (
          <span className="text-plasma">
            {errorMessage}{' '}
            {errorSelfExplanatory ? null : errorRecoverable ? (
              'Please adjust that and try again.'
            ) : (
              <>
                Please{' '}
                <a href={fallbackMailto} data-cursor="pointer" className="underline hover:text-chalk">
                  email me directly
                </a>{' '}
                — your message is already filled in.
              </>
            )}
          </span>
        )}
      </p>
    </form>
  )
}
