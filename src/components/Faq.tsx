import { useState } from 'react'
import { FAQS } from '../data/content'
import { KineticText } from './KineticText'

/**
 * FAQPage structured data, generated from FAQS so it can never drift from the
 * copy actually on screen. Google requires the marked-up answer to match the
 * visible text, which a hand-maintained copy in index.html would eventually
 * violate.
 */
function FaqSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <script
      type="application/ld+json"
      // Content is authored by us in content.ts, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Accordion built on native <button> + aria-expanded rather than <details>,
 * so the open/close height can be animated smoothly.
 */
function FaqItem({ item, index }: { item: (typeof FAQS)[number]; index: number }) {
  const [open, setOpen] = useState(false)
  const panelId = `faq-panel-${index}`
  const buttonId = `faq-button-${index}`

  return (
    <div className="border-t border-ash last:border-b">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          data-cursor="pointer"
          onClick={() => setOpen((value) => !value)}
          className="group flex w-full items-center justify-between gap-6 py-7 text-left transition-colors hover:text-acid"
        >
          <span className="font-display text-xl font-medium tracking-tight md:text-2xl">
            {item.q}
          </span>
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ash text-lg transition-transform duration-500 group-hover:border-acid"
            style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
          >
            +
          </span>
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!open}
        className="grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out-expo)]"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-8 text-pretty leading-relaxed text-bone">{item.a}</p>
        </div>
      </div>
    </div>
  )
}

export function Faq() {
  return (
    <section id="faq" className="relative px-6 py-28 md:px-10 md:py-40">
      <FaqSchema />
      <div className="mx-auto max-w-[1600px]">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.6fr] lg:gap-24">
          <div>
            <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.35em] text-acid">
              Questions
            </p>
            <KineticText
              as="h2"
              text="The things clients ask first."
              className="font-display text-[clamp(2.2rem,5vw,4rem)] font-semibold uppercase leading-[0.9] tracking-[-0.04em] text-balance"
            />
          </div>

          <div>
            {FAQS.map((item, index) => (
              <FaqItem key={item.q} item={item} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
