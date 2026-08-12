import { useEffect, useRef } from 'react'
import { useReducedMotion } from './useReducedMotion'

/**
 * Counts a display value up to its final number when `start` flips true.
 *
 * Stat values are authored as display strings ('5k+', '2+', '3'), so the numeric
 * run is parsed out and any prefix/suffix is preserved — '5k+' animates 0k+ →
 * 5k+ rather than being rewritten as 5000.
 *
 * The text is written straight to the node: this runs for ~1s at 60fps, and
 * routing it through state would re-render the subtree on every one of those
 * frames for a value nothing else depends on.
 *
 * Under reduced motion the final value is set immediately — the information
 * matters, the animation does not.
 */
export function useCountUp<T extends HTMLElement>(value: string, start: boolean, duration = 1100) {
  const ref = useRef<T>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const match = value.match(/^(\D*?)([\d.]+)(.*)$/)
    if (!match) {
      element.textContent = value
      return
    }

    const [, prefix, digits, suffix] = match
    const target = parseFloat(digits)
    // Integers count as integers; a decimal target keeps its precision.
    const decimals = digits.includes('.') ? (digits.split('.')[1]?.length ?? 0) : 0

    if (!start || reducedMotion || !Number.isFinite(target)) {
      element.textContent = start || reducedMotion ? value : `${prefix}${(0).toFixed(decimals)}${suffix}`
      return
    }

    let frame = 0
    const began = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / duration)
      // Ease-out cubic: fast start, gentle settle onto the final number.
      const eased = 1 - Math.pow(1 - t, 3)
      element.textContent = `${prefix}${(target * eased).toFixed(decimals)}${suffix}`

      if (t < 1) frame = requestAnimationFrame(tick)
      // Land exactly on the authored string so no rounding artefact survives.
      else element.textContent = value
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, start, duration, reducedMotion])

  return ref
}
