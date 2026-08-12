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

    const onMove = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY

      const target = (event.target as HTMLElement)?.closest<HTMLElement>('[data-cursor]')
      const mode = target?.dataset.cursor

      if (mode) {
        targetScale = mode === 'view' ? 3.2 : 2
        label.textContent = mode === 'view' ? 'VIEW' : ''
        ring.dataset.active = 'true'
      } else {
        targetScale = 1
        label.textContent = ''
        delete ring.dataset.active
      }
    }

    const tick = () => {
      // Ring trails the dot; the lag is the whole effect.
      ringPos.x += (pointer.x - ringPos.x) * 0.16
      ringPos.y += (pointer.y - ringPos.y) * 0.16
      scale += (targetScale - scale) * 0.16

      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`

      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    const onDown = () => (targetScale *= 0.8)
    const onUp = () => (targetScale = targetScale / 0.8)
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
