import { useState } from 'react'
import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { ShaderField } from './components/ShaderField'
import { Marquee } from './components/Marquee'
import { Work } from './components/Work'
import { Testimonials } from './components/Testimonials'
import { Services } from './components/Services'
import { Process } from './components/Process'
import { Faq } from './components/Faq'
import { Contact } from './components/Contact'
import { Footer } from './components/Footer'
import { Cursor } from './components/Cursor'
import { Preloader } from './components/Preloader'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

export default function App() {
  useSmoothScroll()

  // Lives at the root because the lab is shared between two components that
  // never meet: the hero renders the invitation, ShaderField owns the sheet.
  const [labOpen, setLabOpen] = useState(false)

  return (
    <>
      {/* The ground everything else stands on — one fixed canvas behind the
          whole page. Kept outside <main> so no section's stacking context can
          capture it (see the stacking note in ShaderField). */}
      <ShaderField labOpen={labOpen} onCloseLab={() => setLabOpen(false)} />

      <Preloader />
      <Cursor />
      <Nav />

      <main>
        <Hero labOpen={labOpen} onOpenLab={() => setLabOpen(true)} />

        {/* Reading zone. The hero shows the field at full strength — it is the
            demo, and it has few words competing with it. Everything below is
            dense body copy, so it gets an extra scrim of its own.

            This wrapper is `relative` without `isolate`: the scrim inside it
            is absolutely positioned and paints above the field (which sits at
            -z-10 in the root stacking context), while every child section is
            already `relative` and so paints above the scrim. Adding `isolate`
            here would trap the field's negative z-index inside this wrapper
            and hide it behind the scrim entirely.

            The gradient's transparent top lets the hero's field bleed a short
            way into the first section rather than ending at a hard seam. */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-void/55 to-void/55"
          />

          <Marquee />
          <Work />
          <Testimonials />
          <Services />
          <Process />
          <Faq />
          <Contact />
        </div>
      </main>

      <Footer />

      <Analytics />
      <SpeedInsights />
    </>
  )
}
