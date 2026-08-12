import { useEffect, useRef } from 'react'
import { HERO_FRAG, HERO_VERT } from './heroShader'
import { createFullscreenTriangle, createProgram, resizeCanvas } from './glUtils'
import { useReducedMotion } from '../hooks/useReducedMotion'

// Deep near-black base → desaturated indigo → acid accent. Kept dark on
// purpose: this sits directly behind display type, so contrast wins over
// saturation.
const COLOR_A = [0.015, 0.015, 0.025] as const
const COLOR_B = [0.07, 0.05, 0.19] as const
const COLOR_C = [0.55, 0.85, 0.14] as const

/**
 * Fullscreen shader background. Falls back to a CSS gradient when WebGL2 is
 * unavailable, and renders exactly one frame when the user prefers reduced
 * motion (so the visual still exists, it just holds still).
 */
export function ShaderCanvas({ intensity = 1 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()

  // Held in a ref so pointer moves and scroll never trigger React renders.
  const pointerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      // We never read back pixels, so let the driver discard after compositing.
      preserveDrawingBuffer: false,
    })

    if (!gl) {
      canvas.dataset.fallback = 'true'
      return
    }

    const program = createProgram(gl, HERO_VERT, HERO_FRAG)
    if (!program) {
      canvas.dataset.fallback = 'true'
      return
    }

    const { vao, buffer } = createFullscreenTriangle(gl)

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      pointer: gl.getUniformLocation(program, 'uPointer'),
      time: gl.getUniformLocation(program, 'uTime'),
      intensity: gl.getUniformLocation(program, 'uIntensity'),
      colorA: gl.getUniformLocation(program, 'uColorA'),
      colorB: gl.getUniformLocation(program, 'uColorB'),
      colorC: gl.getUniformLocation(program, 'uColorC'),
    }

    gl.useProgram(program)
    gl.uniform3fv(uniforms.colorA, COLOR_A)
    gl.uniform3fv(uniforms.colorB, COLOR_B)
    gl.uniform3fv(uniforms.colorC, COLOR_C)
    gl.bindVertexArray(vao)

    const handlePointerMove = (event: PointerEvent) => {
      const p = pointerRef.current
      p.tx = (event.clientX / window.innerWidth) * 2 - 1
      p.ty = -((event.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    // Pause entirely when scrolled offscreen — a shader burning GPU behind
    // three sections of content is the classic portfolio battery killer.
    let visible = true
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible && !reducedMotion) {
          lastFrame = performance.now()
          frame = requestAnimationFrame(render)
        }
      },
      { threshold: 0 },
    )
    observer.observe(canvas)

    let frame = 0
    let elapsed = 0
    let lastFrame = performance.now()

    const render = (now: number) => {
      // Clamped delta: a backgrounded tab returns a huge dt that would rocket
      // the animation forward on resume.
      const delta = Math.min((now - lastFrame) / 1000, 1 / 30)
      lastFrame = now
      elapsed += delta

      resizeCanvas(canvas, gl)

      const p = pointerRef.current
      p.x += (p.tx - p.x) * 0.05 // critically-damped-ish follow
      p.y += (p.ty - p.y) * 0.05

      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
      gl.uniform2f(uniforms.pointer, p.x, p.y)
      gl.uniform1f(uniforms.time, elapsed)
      gl.uniform1f(uniforms.intensity, intensityRef.current)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      if (visible && !reducedMotion) frame = requestAnimationFrame(render)
    }

    // Static single frame for reduced motion. Kept as a function because the
    // ResizeObserver has to be able to redraw it after any layout change —
    // otherwise a resize leaves a stretched, stale image on screen.
    const drawStaticFrame = () => {
      resizeCanvas(canvas, gl)
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
      gl.uniform2f(uniforms.pointer, 0, 0)
      gl.uniform1f(uniforms.time, 12)
      gl.uniform1f(uniforms.intensity, intensityRef.current)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    if (reducedMotion) drawStaticFrame()
    else frame = requestAnimationFrame(render)

    // ResizeObserver rather than a window resize listener: the canvas can be
    // laid out at 0x0 on first mount (before fonts/layout settle), and only an
    // element-level observer fires when it later gets its real size.
    const resizeObserver = new ResizeObserver(() => {
      if (reducedMotion) drawStaticFrame()
      else resizeCanvas(canvas, gl)
    })
    resizeObserver.observe(canvas)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      gl.deleteProgram(program)
      gl.deleteVertexArray(vao)
      gl.deleteBuffer(buffer)
      // Deliberately NOT calling loseContext(): a canvas only ever vends one
      // WebGL context, so killing it here would leave StrictMode's second mount
      // (and any future remount) compiling against a dead context.
    }
  }, [reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full bg-[radial-gradient(ellipse_at_50%_40%,#1a1145_0%,#050506_70%)]"
    />
  )
}
