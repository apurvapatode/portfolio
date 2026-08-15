# Apurva Patode — Portfolio

A WebGL-driven portfolio site. Vite + React + TypeScript + Tailwind v4, with a
hand-written WebGL2 shader layer (no three.js).

## Commands

```bash
npm run dev      # dev server at localhost:5173
npm run build    # typecheck + production build to dist/
npm run preview  # serve the production build locally
```

## Where to edit

Almost all copy lives in one file: **`src/data/content.ts`**. Projects,
services, process steps, FAQs, skills and contact details are all there.

Before going live, check these:

| What | Where |
|---|---|
| Contact email / phone | `src/data/content.ts` → `PROFILE` |
| Social links | `src/data/content.ts` → `SOCIALS` |
| Project case-study URLs | `src/data/content.ts` → `PROJECTS[].href` (several are `'#'`) |
| Canonical URL + OG URL | `index.html` (currently `apurvapatode01.vercel.app`) |
| Domain in sitemap/robots | `scripts/prerender.mjs` → `SITE_URL`, `public/robots.txt` |
| Social preview image | add `public/og-image.png` at 1200×630 |
| **Client testimonials** | `src/data/content.ts` → `TESTIMONIALS` (empty — section is hidden until filled) |

### Pricing

**No prices appear anywhere in the public copy** — deliberately. Quoting per
project keeps the conversation on scope, and a low public anchor undersells the
work. The FAQ answers "what does it cost?" with how quoting works, not a number.

If you ever add public pricing, it has to change in lockstep with
`SERVICES`/`FAQS` in `src/data/content.ts`, the Hero intro, and the meta + OG
descriptions in `index.html`.

### Testimonials

`Testimonials.tsx` renders `null` while `TESTIMONIALS` is empty, so the section
does not exist until there are real quotes. Social proof near a CTA is the
strongest conversion lever on a freelance site — but the quotes must be genuine
and attributable. Ask past clients for two lines on communication, reliability
and result.

### Enquiry form

`EnquiryForm.tsx` POSTs to `/api/enquiry` — a Vercel serverless function
(`api/enquiry.ts`) that emails the enquiry through Resend.

**This will not send until one environment variable is set.** In Vercel →
Project → Settings → Environment Variables:

| Variable | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | **yes** | From [resend.com/api-keys](https://resend.com/api-keys). Free tier covers 3,000 emails/month. |
| `ENQUIRY_TO` | no | Destination inbox. Defaults to the address in `api/enquiry.ts`. |
| `ENQUIRY_FROM` | no | Defaults to Resend's shared `onboarding@resend.dev`, which delivers with no DNS setup. Point it at your own domain once verified in Resend. |

Without the key the endpoint returns 503 and the form tells the visitor to email
directly — it degrades, it does not lie about having sent.

Behaviour worth knowing:

- **Failures are visible.** The old version composed a `mailto:` and always
  reported success, so a visitor with no mail client configured (most people on
  a phone) lost their enquiry silently. Now a failed send shows an error and a
  fallback `mailto:` prefilled with everything they typed.
- **Reply-To** is set to the visitor's address, so replying goes to them.
- **Honeypot**: a hidden `website` field. Submissions that fill it get a 200 and
  are dropped — telling a bot which check it failed only helps it retry.
- **Rate limit**: 5 submissions per IP per 10 minutes, held in the function
  instance's memory. This stops the realistic attack — one script looping until
  the Resend quota is gone — but note what it does not do: Vercel runs several
  instances that each keep their own counter, so the real ceiling is the limit
  times the number of warm instances, and a cold start clears it. Moving to a
  shared KV store would fix both, at the cost of another dependency and another
  credential for a form that sees a handful of real submissions a week. Over the
  limit returns 429, which the form renders as "try again shortly" without the
  mailto: fallback, because the block is temporary.
- The work-type and timeline lists are duplicated in `api/enquiry.ts`; values it
  does not recognise are recorded as "Not specified" rather than echoed into the
  email. Keep the two lists in step.

To swap Resend for something else, replace the `fetch` to `api.resend.com` in
`api/enquiry.ts`. The form contract (`POST` JSON, `{ ok: true }` or a non-2xx)
stays the same.

## Architecture

```
src/
├─ webgl/          Shader layer
│  ├─ heroShader.ts    GLSL: domain-warped FBM + metaball SDF
│  ├─ ShaderCanvas.tsx React wrapper, rAF loop, lifecycle
│  └─ glUtils.ts       Program/VAO helpers, DPR-capped resize
├─ hooks/          useSmoothScroll, useMagnetic, useInView, useReducedMotion
├─ components/     One file per section
└─ data/content.ts All copy

api/
└─ enquiry.ts     Serverless function: validates + emails the contact form
```

### Performance notes

- The shader pauses via `IntersectionObserver` when scrolled offscreen, so it
  never burns GPU behind other sections.
- Backing store is capped at 2× DPR — 3–4× on phones quadruples fragment cost
  for no visible gain.
- Pointer/scroll effects write transforms in rAF loops rather than React state,
  so mousemove never triggers a re-render.
- Frame delta is clamped so a backgrounded tab doesn't jump on resume.

### Accessibility

- Every motion system checks `prefers-reduced-motion`: Lenis is skipped, the
  custom cursor is not mounted, the preloader is bypassed, and the shader draws
  a single static frame.
- `KineticText` exposes the full string to screen readers and hides the
  per-word split, so the text isn't read as disconnected fragments.
- Scroll-reveal has a 3s failsafe — content can never stay stuck at opacity 0
  if `IntersectionObserver` doesn't fire.
- Skip link, visible focus rings, and a labelled mobile menu that traps scroll
  and closes on Escape.

## Deploying

The output is a static `dist/` folder. Build command `npm run build`, output
`dist`. It will run on Netlify or Cloudflare Pages unchanged; `vercel.json` is
Vercel-specific and simply ignored elsewhere.

### `vercel.json`

Headers only — no routes, no builds. Two things it does:

- **Caching.** Vite fingerprints everything in `assets/` with a content hash, so
  those files can be `immutable` for a year: a changed file gets a new URL, so a
  stale cache is impossible. `index.html` is the opposite — it names the current
  hashes, so it must revalidate every time or a deploy would go unseen by repeat
  visitors. Getting this pair wrong in either direction is the classic static
  hosting bug (permanently stale site, or no caching at all).
- **Security headers.** HSTS, `nosniff`, a conservative `Referrer-Policy`,
  `SAMEORIGIN` framing, and a `Permissions-Policy` denying camera/mic/geo, none
  of which this site uses. A portfolio selling frontend work gets its own headers
  audited, so they are worth the fifteen lines.
- **CSP.** `default-src 'self'` with the narrowest set of exceptions the page
  actually needs: Google Fonts for `style-src`/`font-src`, `data:` images (the
  select chevron is an inline SVG), and one `'sha256-…'` for the inline theme
  script. `script-src` carries no `'unsafe-inline'`, which is the whole point —
  `style-src` still needs it for two inline `style` attributes.

  **The script hash is exact, and drift is silent** — edit the theme script in
  `index.html` by one byte and the browser refuses to run it, giving a
  light-mode visitor back the dark flash it exists to prevent, with no console
  error most people would notice. So `scripts/prerender.mjs` recomputes the hash
  from the built HTML on every build and fails the build if it no longer matches
  `vercel.json`. If it fails, paste the hash it prints into `script-src`.

  Vercel's analytics scripts need no exception: in production both load from
  `/_vercel/*` on this origin, and `va.vercel-scripts.com` is only used in debug
  builds.

Order matters: Vercel applies every matching `source`, and for a repeated header
the **first** match wins. The `/assets/(.*)` block therefore sits above the
catch-all `/(.*)`, and `/index.html` appears after it, so each path lands on the
`Cache-Control` intended for it.

### Analytics

`@vercel/analytics` and `@vercel/speed-insights` are mounted in `src/App.tsx`
via their `/react` entry points (not `/next` — this is a Vite SPA). Both must
also be enabled per-project in the Vercel dashboard; until then the injected
`/_vercel/*` scripts 404 and collect nothing. They 404 in local `preview` too —
those endpoints only exist on Vercel's edge, so that is expected, not a bug.
