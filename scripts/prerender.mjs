/**
 * Injects a crawler-readable snapshot of the page into dist/index.html.
 *
 * Why not react-snap / vite-plugin-prerender / SSR: almost every component
 * here touches window, document, localStorage or WebGL at render scope (see
 * useTheme, useSmoothScroll, ShaderCanvas), so renderToString would need
 * guards threaded through the whole tree for a single-route site. Instead we
 * read the same content.ts the app reads and emit semantic HTML from it —
 * one source of truth, no browser globals, nothing to keep in sync by hand.
 *
 * The block is written inside #root. React's createRoot() replaces the
 * container's children on mount, so real visitors never see it — but crawlers
 * that don't execute JS (GPTBot, ClaudeBot, PerplexityBot, most social
 * scrapers) get the full text instead of the one-line noscript fallback.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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

const indexPath = resolve(root, 'dist/index.html')
let out = readFileSync(indexPath, 'utf8')

if (!out.includes('<div id="root"></div>')) {
  console.error('[prerender] #root placeholder not found — did the build change?')
  process.exit(1)
}

// Clipped rather than `display:none`: the block must stay in the accessibility
// and crawler-visible tree (Google treats display:none text as lower-value, and
// some scrapers skip it), but must never paint. Without this the browser shows
// ~9KB of unstyled black-on-white text — starting with the <h1> — for as long
// as the JS bundle takes to arrive, which on a slow connection is seconds.
//
// No JS teardown needed: createRoot() replaces #root's children on mount, so
// this wrapper is removed wholesale the moment React renders.
out = out.replace(
  '<div id="root"></div>',
  `<div id="root"><div style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap">\n${html}\n    </div></div>`,
)

writeFileSync(indexPath, out)
console.log(`[prerender] injected ${html.length} bytes of crawler content into dist/index.html`)
