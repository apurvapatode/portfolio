import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Two-part cursor: a 1:1 dot and a lagging ring that inflates over interactive
 * targets. Elements opt in to the hover state with `data-cursor="..."`.
 *
 * The native cursor is only hidden once this mounts and confirms a fine
 * pointer, so touch and keyboard users are never left without one.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    const dot = dotRef.current
    const ring = ringRef.current
    const label = labelRef.current
    if (!dot || !ring || !label) return

    document.body.dataset.customCursor = 'true'

    const pointer = { x: innerWidth / 2, y: innerHeight / 2 }
    const ringPos = { x: pointer.x, y: pointer.y }
    let scale = 1
    let targetScale = 1
    let frame = 0

    // Cached so the DOM walk below only runs when the pointer actually crosses
    // into a different element, not on every one of the ~120 pointermove events
    // a second a high-polling-rate mouse delivers.
    let lastTarget: Element | null = null
    // True while the pointer is over a precision surface (the shader lab).
    let precise = false

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      wake()

      const eventTarget = event.target as Element | null
      if (eventTarget === lastTarget) return
      lastTarget = eventTarget

      // Inside a dense control surface the trailing ring stops reading as
      // style and starts reading as input lag — you aim at a 16px slider
      // thumb and the cursor arrives late. Precision work wants a precise
      // cursor, so the ring snaps to the pointer over anything marked
      // `data-cursor-precise` and resumes trailing on the way out.
      precise = !!(eventTarget as HTMLElement)?.closest('[data-cursor-precise]')

      const target = (eventTarget as HTMLElement)?.closest<HTMLElement>('[data-cursor]')
      const mode = target?.dataset.cursor

      if (mode) {
        // A 2x ring (80px) swallowing a 16px slider thumb hides the very
        // thing you are aiming at, so precision surfaces get a tighter ring.
        targetScale = precise ? 0.55 : mode === 'view' ? 3.2 : 2
        label.textContent = mode === 'view' ? 'VIEW' : ''
        ring.dataset.active = 'true'
      } else {
        targetScale = precise ? 0.55 : 1
        label.textContent = ''
        delete ring.dataset.active
      }
    }

    const tick = () => {
      // Ring trails the dot; the lag is the whole effect — except over
      // precision surfaces, where it tracks 1:1.
      const ease = precise ? 1 : 0.16
      ringPos.x += (pointer.x - ringPos.x) * ease
      ringPos.y += (pointer.y - ringPos.y) * ease
      scale += (targetScale - scale) * 0.16

      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`

      // Park the loop once the ring has caught up and the scale has settled.
      // Previously this ran at 60fps for the life of the page even with a
      // motionless pointer, competing for frames with Lenis and the shader.
      // Thresholds are sub-pixel, so stopping is invisible.
      const settled =
        Math.abs(pointer.x - ringPos.x) < 0.1 &&
        Math.abs(pointer.y - ringPos.y) < 0.1 &&
        Math.abs(targetScale - scale) < 0.001

      if (settled) {
        running = false
        return
      }
      frame = requestAnimationFrame(tick)
    }

    // Restarted by any input that changes a target the loop is easing toward.
    let running = false
    const wake = () => {
      if (running) return
      running = true
      frame = requestAnimationFrame(tick)
    }
    wake()

    // Each of these retargets something the loop eases toward, so each has to
    // wake it — a parked loop would otherwise never animate the change.
    const onDown = () => {
      targetScale *= 0.8
      wake()
    }
    const onUp = () => {
      targetScale = targetScale / 0.8
      wake()
    }
    // Hide when the pointer leaves the window so it can't stick to an edge.
    const onEnter = () => (dot.style.opacity = ring.style.opacity = '1')
    const onLeave = () => (dot.style.opacity = ring.style.opacity = '0')

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    document.documentElement.addEventListener('pointerenter', onEnter)
    document.documentElement.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.documentElement.removeEventListener('pointerenter', onEnter)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      delete document.body.dataset.customCursor
    }
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100]">
      <div
        ref={dotRef}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-acid transition-opacity duration-200"
      />
      <div
        ref={ringRef}
        data-active="false"
        className="absolute left-0 top-0 grid h-10 w-10 place-items-center rounded-full border border-bone/40 transition-[background-color,border-color] duration-300 data-[active=true]:border-acid data-[active=true]:bg-acid/10"
      >
        <span
          ref={labelRef}
          className="font-mono text-[3px] font-medium tracking-[0.2em] text-acid"
        />
      </div>
    </div>
  )
}
