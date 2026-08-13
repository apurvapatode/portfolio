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
        <Marquee />
        <Work />
        <Testimonials />
        <Services />
        <Process />
        <Faq />
        <Contact />
      </main>

      <Footer />

      <Analytics />
      <SpeedInsights />
    </>
  )
}
