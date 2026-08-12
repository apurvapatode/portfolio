import { useEffect, useRef } from 'react'
import { HERO_FRAG, HERO_VERT } from './heroShader'
import { createFullscreenTriangle, createProgram, resizeCanvas } from './glUtils'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useTheme } from '../hooks/useTheme'

// Deep near-black base → desaturated indigo → acid accent. Kept dark on
// purpose: this sits directly behind display type, so contrast wins over
// saturation.
const DARK_COLORS = {
  a: [0.015, 0.015, 0.025],
  b: [0.07, 0.05, 0.19],
  c: [0.55, 0.85, 0.14],
} as const

// Light mode is not an inversion of the above — the shader multiplies and adds,
// so simply lightening the ramp blows out to white. These are high-value, low-
// saturation tints that keep the fluid structure readable while staying pale
// enough for dark display type to sit on top.
const LIGHT_COLORS = {
  a: [0.96, 0.96, 0.98],
  b: [0.78, 0.76, 0.94],
  c: [0.62, 0.78, 0.35],
} as const

/**
 * Fullscreen shader background. Falls back to a CSS gradient when WebGL2 is
 * unavailable, and renders exactly one frame when the user prefers reduced
 * motion (so the visual still exists, it just holds still).
 */
export function ShaderCanvas({ intensity = 1 }: { intensity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()
  const { theme } = useTheme()

  // Held in a ref so pointer moves and scroll never trigger React renders.
  const pointerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity

  // Read inside the draw loop rather than listed as an effect dependency: a
  // theme change must not tear down and rebuild the GL context.
  const themeRef = useRef(theme)
  themeRef.current = theme

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
    gl.bindVertexArray(vao)

    // Uploaded every frame rather than once at init: the palette has to be able
    // to change when the theme is toggled, and three vec3 uploads are free next
    // to the fragment work.
    const uploadColors = () => {
      const palette = themeRef.current === 'light' ? LIGHT_COLORS : DARK_COLORS
      gl.uniform3fv(uniforms.colorA, palette.a)
      gl.uniform3fv(uniforms.colorB, palette.b)
      gl.uniform3fv(uniforms.colorC, palette.c)
    }

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
      uploadColors()
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
      uploadColors()
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

    // The reduced-motion path draws exactly one frame, so a theme toggle would
    // otherwise leave the previous palette frozen on screen. The animated path
    // picks the change up on its next frame and needs no help.
    const onThemeChange = () => {
      if (reducedMotion) drawStaticFrame()
    }
    window.addEventListener('themechange', onThemeChange)

    return () => {
      window.removeEventListener('themechange', onThemeChange)
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
      // CSS fallback for no-WebGL2. Uses theme tokens rather than literal hex
      // so it follows the palette instead of staying dark in light mode.
      className="absolute inset-0 h-full w-full bg-[radial-gradient(ellipse_at_50%_40%,var(--color-smoke)_0%,var(--color-void)_70%)]"
    />
  )
}
