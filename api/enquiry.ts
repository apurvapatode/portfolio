/**
 * Enquiry endpoint. Runs as a Vercel serverless function at POST /api/enquiry.
 *
 * Replaces the old mailto: handoff, which silently did nothing for anyone
 * without a configured mail client (most phone webmail users) while the form
 * still reported success — so a lead could be lost with no trace on either
 * side. This path either delivers or returns an error the UI can show.
 *
 * Delivery is via Resend's HTTP API rather than SMTP: serverless functions
 * can't hold a connection open, and SMTP from a shared IP is a deliverability
 * fight not worth having for a contact form.
 *
 * Required env var (set in Vercel → Project → Settings → Environment Variables):
 *   RESEND_API_KEY   from resend.com/api-keys
 * Optional:
 *   ENQUIRY_TO       destination inbox; defaults to the address below
 *   ENQUIRY_FROM     verified sender; defaults to Resend's shared domain, which
 *                    works with no DNS setup. Point this at your own domain
 *                    once you've verified one in Resend.
 */

/**
 * Declared locally rather than relying on @types/node's ambient `process`.
 *
 * The build box resolved `"types": ["node"]` differently than a local install
 * did and failed with TS2591 on every `process.env` read — which does not fail
 * the deploy loudly, it just republishes the previous build, so production goes
 * on serving stale code while the dashboard reports success. Three lines here
 * remove that whole class of failure: the only Node global this file touches is
 * `process.env`, and its shape is not in doubt.
 */
declare const process: { env: Record<string, string | undefined> }

const TO = process.env.ENQUIRY_TO || 'apurvapatode01@gmail.com'

// Resend's shared sending domain — deliverable without verifying a domain of
// your own. Mail sent from it lands fine at Gmail; it just shows a resend.dev
// sender. Swap ENQUIRY_FROM to hello@yourdomain once DNS is verified.
const FROM = process.env.ENQUIRY_FROM || 'Portfolio Enquiry <onboarding@resend.dev>'

/** Mirrors the select options in src/components/EnquiryForm.tsx. */
const WORK_TYPES = [
  'A fix or small change',
  'A full site build or rebuild',
  'Ongoing support',
  'Not sure yet',
]

const TIMELINES = ['ASAP', 'Within a month', '1—3 months', 'Just exploring']

/** Caps mirror the maxLength attributes on the form, enforced again here
 *  because client-side limits are a UX affordance, not a control. */
const LIMITS = {
  name: 100,
  company: 100,
  message: 5000,
}

type Payload = {
  name: string
  company: string
  /** Drives Reply-To, so a reply is one click rather than a copy-paste. */
  email: string
  workType: string
  timeline: string
  message: string
  /** Honeypot: a real user never fills this; bots fill every field they find. */
  website: string
}

const str = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : ''

/**
 * Header injection guard. These values are interpolated into the subject line
 * and the Reply-To address, both of which are headers — a newline in either
 * would let a submitter append headers of their own.
 */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim()

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Permissive on purpose: this only decides whether we can set Reply-To, not
// whether the enquiry is delivered. A visitor who mistypes their address still
// gets their message through — it just arrives without a one-click reply.
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export async function POST(request: Request): Promise<Response> {
  // `json()` is typed as `unknown`: the body is attacker-controlled, so every
  // field below is read through `str()` rather than trusted as a Payload.
  let body: Partial<Payload>
  try {
    body = (await request.json()) as Partial<Payload>
  } catch {
    return json({ error: 'Malformed request.' }, 400)
  }

  const name = oneLine(str(body.name, LIMITS.name))
  const company = oneLine(str(body.company, LIMITS.company))
  const email = oneLine(str(body.email, LIMITS.name))
  const message = str(body.message, LIMITS.message)
  const honeypot = str(body.website, 100)

  // Bots that fill every field get a 200 and no email. Returning an error
  // would tell a scripted submitter exactly which field tripped it.
  if (honeypot) return json({ ok: true }, 200)

  if (!name || !message) {
    return json({ error: 'Name and message are both required.' }, 400)
  }

  // Unrecognised values fall back to a label rather than being echoed into the
  // email verbatim, so the select can't be used to inject arbitrary text.
  const workType = WORK_TYPES.includes(body.workType as string)
    ? (body.workType as string)
    : 'Not specified'
  const timeline = TIMELINES.includes(body.timeline as string)
    ? (body.timeline as string)
    : 'Not specified'

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Logged for the function's runtime logs; the visitor is told to fall back
    // to plain email rather than shown a configuration detail.
    console.error('[enquiry] RESEND_API_KEY is not set — cannot send mail.')
    return json({ error: 'The form is not configured to send right now.' }, 503)
  }

  const replyTo = looksLikeEmail(email) ? email : undefined

  const lines = [
    `Name: ${name}`,
    `Company: ${company || '—'}`,
    `Email: ${email || '— (not provided)'}`,
    `Needs: ${workType}`,
    `Timeline: ${timeline}`,
    '',
    message,
  ]

  const html = `
    <div style="font-family:system-ui,sans-serif;line-height:1.6">
      <h2 style="margin:0 0 16px">New enquiry from ${escapeHtml(name)}</h2>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr><td style="padding-right:16px;color:#666">Company</td><td>${escapeHtml(company || '—')}</td></tr>
        <tr><td style="padding-right:16px;color:#666">Email</td><td>${escapeHtml(email || '— (not provided)')}</td></tr>
        <tr><td style="padding-right:16px;color:#666">Needs</td><td>${escapeHtml(workType)}</td></tr>
        <tr><td style="padding-right:16px;color:#666">Timeline</td><td>${escapeHtml(timeline)}</td></tr>
      </table>
      <div style="white-space:pre-wrap;border-left:3px solid #d7ff3e;padding-left:16px">${escapeHtml(
        message,
      )}</div>
    </div>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        subject: `Project enquiry — ${name}`,
        text: lines.join('\n'),
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    })

    if (!response.ok) {
      // Resend's error body names the actual cause (unverified domain, bad
      // key, rate limit). It goes to the logs, never to the visitor.
      console.error('[enquiry] Resend rejected the send:', response.status, await response.text())
      return json({ error: 'Could not send the message.' }, 502)
    }
  } catch (error) {
    console.error('[enquiry] Network failure calling Resend:', error)
    return json({ error: 'Could not send the message.' }, 502)
  }

  return json({ ok: true }, 200)
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
