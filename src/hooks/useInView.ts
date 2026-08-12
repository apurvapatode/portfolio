import { useEffect, useRef, useState } from 'react'

/**
 * One-shot intersection flag for scroll reveals. Unobserves after firing so a
 * long page doesn't retain dozens of live observers.
 */
export function useInView<T extends HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.2, rootMargin: '0px 0px -10% 0px' },
) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // No IO (or a test env): show the content rather than hiding it forever.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.unobserve(entry.target)
      }
    }, options)

    observer.observe(element)

    // Failsafe: content is hidden at opacity 0 until revealed, so if the
    // observer never fires (headless capture, odd viewport, scroll container
    // quirk) the copy would be invisible with no way back. Reveal it anyway.
    const failsafe = window.setTimeout(() => setInView(true), 3000)

    return () => {
      observer.disconnect()
      clearTimeout(failsafe)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ref, inView }
}
