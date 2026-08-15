/**
 * Injects a first-paint hero, a crawler-readable snapshot and generated
 * FAQPage JSON-LD into dist/index.html, and writes dist/llms.txt.
 *
 * Why not react-snap / vite-plugin-prerender / SSR: almost every component
 * here touches window, document, localStorage or WebGL at render scope (see
 * useTheme, useSmoothScroll, ShaderCanvas), so renderToString would need
 * guards threaded through the whole tree for a single-route site. Instead we
 * read the same content.ts the app reads and emit semantic HTML from it —
 * one source of truth, no browser globals, nothing to keep in sync by hand.
 *
 * Two blocks go in, both inside #root, and they do different jobs:
 *
 *   1. A styled shell of the hero — headline, pitch, CTAs. This one PAINTS.
 *      It carries the same Tailwind classes the real Hero renders, so the
 *      stylesheet (which arrives long before the JS bundle finishes booting)
 *      dresses it correctly, and the inline theme script above #root has
 *      already set data-theme so it lands in the right palette.
 *   2. The full-content crawler block, clipped so it never paints, for the
 *      bots that do not execute JS.
 *
 * Why block 1 exists: everything downloads by ~1.3s but nothing was visible
 * until React mounted at ~2.5s (4x-throttled mobile), because block 2 was the
 * only thing in #root and it is deliberately invisible. That is a blank
 * screen for the entire boot. Painting a styled hero from static HTML moves
 * first paint to the HTML's own arrival.
 *
 * Both blocks are dropped wholesale when createRoot() replaces #root's
 * children on mount, so there is no teardown to maintain and no duplicate
 * content once React is live.
 *
 * The hero shell must stay a visual match for src/components/Hero.tsx. It is
 * a deliberate, contained duplication — the alternative is SSR-ing a tree
 * built entirely on browser globals. If the hero's copy or layout changes,
 * change it here too; a mismatch shows up as a visible snap at mount.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Must agree with the canonical and og:url in index.html and the URLs in
 * public/robots.txt and public/sitemap.xml. See the canonical comment in
 * index.html — a canonical pointing at an unreachable host deindexes the page.
 */
const SITE_URL = 'https://apurvapatode01.vercel.app'

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Strip TS-only syntax so we can import content.ts from plain Node. */
async function loadContent() {
  const src = readFileSync(resolve(root, 'src/data/content.ts'), 'utf8')
  const js = src
    .replace(/^export type [\s\S]*?\n}\n/gm, '')
    .replace(/^export type .*$/gm, '')
    .replace(/: Project\[\]|: Service\[\]|: Testimonial\[\]/g, '')
  const tmp = resolve(root, 'node_modules/.cache-prerender-content.mjs')
  writeFileSync(tmp, js)
  return import(tmp + '?t=' + Date.now())
}

const { PROFILE, PROJECTS, SERVICES, PROCESS, FAQS, STATS, CAPABILITIES, SOCIALS } =
  await loadContent()

/**
 * The painting hero. Mirrors src/components/Hero.tsx in its *settled* state:
 * the real one animates up from translateY(100%)/opacity:0 on mount, and
 * replaying that entrance here would mean painting invisible text again —
 * exactly the bug this fixes. So the shell renders where the animation lands.
 *
 * Deliberately omitted: the "Play with this background" button (it opens the
 * shader lab, which needs React state), the ping dot (animation only), and
 * the parallax hooks. Everything a first-paint viewer can act on — both CTAs
 * are plain anchors to #contact and #work — works before any JS runs.
 *
 * `aria-hidden` + inert-by-omission is not used: this is real content for the
 * ~2s it is on screen, and a screen-reader user landing mid-boot should reach
 * the same headline and CTAs a sighted visitor sees.
 */
const heroShell = `
      <section id="top" class="relative isolate flex min-h-svh flex-col justify-between overflow-hidden px-6 pb-10 pt-28 md:px-10">
        <div class="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col justify-center">
          <p class="font-mono text-[11px] uppercase tracking-[0.2em] text-acid sm:tracking-[0.35em]">
            ${esc(PROFILE.role)} — ${esc(PROFILE.tagline)}
          </p>

          <h1 class="mt-6 font-display text-[clamp(3rem,13vw,13rem)] font-semibold uppercase leading-[0.82] tracking-[-0.04em]">
            <span class="block">Interfaces</span>
            <span class="block text-bone">that make</span>
            <span class="block bg-gradient-to-r from-acid via-chalk to-plasma bg-clip-text text-transparent">people stay.</span>
          </h1>

          <div class="mt-10 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <p class="max-w-xl text-balance text-lg leading-relaxed text-bone md:text-xl">
              I'm ${esc(PROFILE.name.split(' ')[0])}. I fix broken websites and build
              fast, accessible ones — for 5,000+ users in production, and for
              teams who need the small things handled before they turn into a
              rescue project. AI in the loop keeps timelines short; the quality
              bar stays mine.
            </p>

            <div class="flex items-center gap-3 sm:gap-4">
              <a href="#contact" class="group relative inline-flex shrink-0 items-center gap-3 overflow-hidden rounded-full bg-acid px-6 py-3.5 font-medium text-void sm:px-8 sm:py-4">
                <span class="relative z-10">Start a project</span>
                <span class="relative z-10">→</span>
              </a>
              <a href="#work" class="inline-flex shrink-0 items-center gap-2 rounded-full border border-ash px-6 py-3.5 font-medium text-chalk sm:px-8 sm:py-4">
                See the work
              </a>
            </div>
          </div>
        </div>

        <div class="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col items-start gap-2 border-t border-ash/60 pt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-mute sm:tracking-[0.2em] lg:flex-row lg:items-end lg:justify-between lg:gap-4">
          <span class="flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="relative inline-flex h-2 w-2 rounded-full bg-acid"></span>
            </span>
            ${esc(PROFILE.availability)}
          </span>
          <span>${esc(PROFILE.location)}</span>
        </div>
      </section>`

const html = `
      <header>
        <h1>${esc(PROFILE.name)} — ${esc(PROFILE.role)}</h1>
        <p>${esc(PROFILE.tagline)}</p>
        <p>${esc(PROFILE.location)}. ${esc(PROFILE.availability)}.</p>
        <p>
          Contact: <a href="mailto:${esc(PROFILE.email)}">${esc(PROFILE.email)}</a>
          · <a href="tel:${esc(PROFILE.phone.replace(/\s/g, ''))}">${esc(PROFILE.phone)}</a>
        </p>
      </header>

      <section>
        <h2>Services</h2>
        ${SERVICES.map(
          (s) => `<article>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.body)}</p>
          <p>Turnaround: ${esc(s.turnaround)}. ${esc(s.tags.join(', '))}.</p>
        </article>`,
        ).join('\n        ')}
      </section>

      <section>
        <h2>Selected work</h2>
        ${PROJECTS.map(
          (p) => `<article>
          <h3>${esc(p.title)} — ${esc(p.client)} (${esc(p.year)})</h3>
          <p>${esc(p.summary)}</p>
          <p>${esc(p.metric.value)} ${esc(p.metric.label)}. Built with ${esc(p.discipline.join(', '))}.</p>
        </article>`,
        ).join('\n        ')}
      </section>

      <section>
        <h2>How I work</h2>
        ${PROCESS.map(
          (p) => `<article><h3>${esc(p.phase)}</h3><p>${esc(p.body)}</p></article>`,
        ).join('\n        ')}
      </section>

      <section>
        <h2>Frequently asked questions</h2>
        ${FAQS.map(
          (f) => `<article><h3>${esc(f.q)}</h3><p>${esc(f.a)}</p></article>`,
        ).join('\n        ')}
      </section>

      <section>
        <h2>Capabilities</h2>
        <p>${esc(CAPABILITIES.join(', '))}.</p>
        <p>${STATS.map((s) => esc(`${s.value} — ${s.label}`)).join(' · ')}</p>
      </section>

      <nav>
        <h2>Elsewhere</h2>
        <ul>
          ${SOCIALS.map((s) => `<li><a href="${esc(s.href)}">${esc(s.label)}</a></li>`).join('\n          ')}
        </ul>
      </nav>`

/**
 * FAQPage markup, generated from the same FAQS the crawler block above renders.
 *
 * Generated rather than hand-written in index.html for a specific reason:
 * Google requires FAQ markup to match FAQ content visible on the page, and a
 * hand-maintained copy drifts the moment someone edits an answer in
 * content.ts. Drift here is not a silent no-op — mismatched markup is a
 * structured-data manual action. One source, no drift.
 *
 * JSON.stringify handles escaping, so the answers pass through raw; esc() is
 * for the HTML blocks above and would double-escape entities inside a script.
 * The closing `</script>` sequence is the one thing that could break out of the
 * tag, and it cannot appear here — but guard it anyway rather than rely on the
 * copy never containing it.
 */
const faqSchema = JSON.stringify(
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  },
  null,
  2,
).replace(/<\//g, '<\\/')

const indexPath = resolve(root, 'dist/index.html')
let out = readFileSync(indexPath, 'utf8')

if (!out.includes('<div id="root"></div>')) {
  console.error('[prerender] #root placeholder not found — did the build change?')
  process.exit(1)
}

// The crawler block stays clipped rather than `display:none`: it must remain
// in the accessibility and crawler-visible tree (Google treats display:none
// text as lower-value, and some scrapers skip it), but must never paint.
// Unclipped it would show ~9KB of unstyled text under the hero for the whole
// boot — which is the flash the clip was added to kill in the first place.
//
// It follows the hero shell so a non-JS crawler reads the headline first and
// then the full content, in document order.
//
// No JS teardown needed for either block: createRoot() replaces #root's
// children on mount, so both are removed wholesale the moment React renders.
// Injected before </head> so it sits with the hand-written Person and
// ProfessionalService blocks. Bailing loudly rather than silently shipping a
// page whose FAQ answers are invisible to search.
if (!out.includes('</head>')) {
  console.error('[prerender] no </head> found — did the build change?')
  process.exit(1)
}
out = out.replace(
  '</head>',
  `  <script type="application/ld+json">\n${faqSchema}\n    </script>\n  </head>`,
)

out = out.replace(
  '<div id="root"></div>',
  `<div id="root">${heroShell}\n      <div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap">\n${html}\n      </div>\n    </div>`,
)

writeFileSync(indexPath, out)

/**
 * dist/llms.txt — a plain-text brief for assistants that accept one.
 *
 * The convention normally expects a short index of links to detailed pages.
 * This site is a single route with no sub-pages to point at, so linking out
 * would produce a file that costs a fetch and answers nothing. The full
 * content goes inline instead: one fetch, everything an assistant needs to
 * answer "who is this, what do they do, how do I reach them".
 *
 * Written here rather than kept in public/ for the same reason as the FAQ
 * schema — a static copy in public/ would drift from content.ts silently.
 */
const llms = `# ${PROFILE.name}

> ${PROFILE.role}. ${PROFILE.tagline}. ${PROFILE.location}. ${PROFILE.availability}.

Contact: ${PROFILE.email} · ${PROFILE.phone}
Site: ${SITE_URL}

## Services

${SERVICES.map(
  (s) => `### ${s.title}\n${s.body}\nTurnaround: ${s.turnaround}. Tags: ${s.tags.join(', ')}.`,
).join('\n\n')}

## Selected work

${PROJECTS.map(
  (p) =>
    `### ${p.title} — ${p.client} (${p.year})\n${p.summary}\nResult: ${p.metric.value} ${p.metric.label}. Built with ${p.discipline.join(', ')}.`,
).join('\n\n')}

## How I work

${PROCESS.map((p) => `### ${p.phase}\n${p.body}`).join('\n\n')}

## FAQ

${FAQS.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')}

## Capabilities

${CAPABILITIES.join(', ')}.

${STATS.map((s) => `- ${s.value} — ${s.label}`).join('\n')}

## Elsewhere

${SOCIALS.map((s) => `- [${s.label}](${s.href})`).join('\n')}
`

writeFileSync(resolve(root, 'dist/llms.txt'), llms)

console.log(
  `[prerender] injected ${heroShell.length} bytes of painting hero + ${html.length} bytes of crawler content + ${faqSchema.length} bytes of FAQ schema into dist/index.html`,
)
console.log(`[prerender] wrote dist/llms.txt (${llms.length} bytes)`)
