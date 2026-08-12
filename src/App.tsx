import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
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

export default function App() {
  useSmoothScroll()

  return (
    <>
      <Preloader />
      <Cursor />
      <Nav />

      <main>
        <Hero />
        <Marquee />
        <Work />
        <Testimonials />
        <Services />
        <Process />
        <Faq />
        <Contact />
      </main>

      <Footer />
    </>
  )
}
