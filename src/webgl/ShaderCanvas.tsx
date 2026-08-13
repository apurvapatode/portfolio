import { useEffect, useRef } from 'react'
import { HERO_FRAG, HERO_VERT } from './heroShader'
import {
  compileProgram,
  createFullscreenTriangle,
  createGpuTimer,
  getRendererName,
  resizeCanvas,
} from './glUtils'
import { DEFAULT_PARAMS, HERO_PARAMS, type ParamValues } from './heroParams'
import { createQualityGovernor } from './adaptiveQuality'
import { createSceneTrack, type SceneMood } from './worldScene'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useTheme } from '../hooks/useTheme'

// Palettes live in worldScene.ts now: the field spans the whole page, and its
// colours belong to whichever section the camera is passing — including the
// light-mode tuning notes, which moved with them.

export type FrameSample = (frameMs: number, gpuMs: number) => void

export type CanvasInfo = {
  width: number
  height: number
  dpr: number
  renderer: string
  timerQuerySupported: boolean
  /** Current adaptive-quality tier name, e.g. "high" / "low". */
  tier: string
}

export type ShaderCanvasProps = {
  intensity?: number
  /**
   * Live parameter overrides from the playground. Uploaded per frame; changing
   * these never recompiles.
   */
  params?: ParamValues
  /**
   * Fragment source override. Changing this *does* recompile, so it is passed
   * separately from `params` — see the effect split below.
   */
  fragmentSource?: string
  /** Called after each compile attempt, with the driver log on failure. */
  onCompile?: (result: { ok: boolean; log: string }) => void
  /** Per-frame timing sink. Must be cheap and stable across renders. */
  onFrame?: FrameSample
  /** Reports backing-store size and GPU identity on init and resize. */
  onInfo?: (info: CanvasInfo) => void
  /** Profiling costs a GPU timer query per frame; only pay when the HUD is up. */
  profiling?: boolean
}

/**
 * The site-wide shader field. Fills whatever it is mounted in (ShaderField
 * pins it to the viewport behind the whole page) and drives itself from
 * scroll: position pans the fluid, velocity excites it, and the palette
 * cross-fades between per-section moods as the camera passes their anchors
 * (worldScene.ts). Falls back to a CSS gradient when WebGL2 is unavailable,
 * and renders exactly one frame when the user prefers reduced motion (so the
 * visual still exists, it just holds still).
 */
export function ShaderCanvas({
  intensity = 1,
  params,
  fragmentSource,
  onCompile,
  onFrame,
  onInfo,
  profiling = false,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()
  const { theme } = useTheme()

  // Everything below is held in refs and read inside the draw loop. The rule
  // for this component: a prop change must never tear down the GL context
  // unless it changes the *program*, because recreating a context is expensive
  // and a canvas only ever vends one.
  const pointerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity

  const paramsRef = useRef<ParamValues>(params ?? DEFAULT_PARAMS)
  paramsRef.current = params ?? DEFAULT_PARAMS

  const themeRef = useRef(theme)
  themeRef.current = theme

  const profilingRef = useRef(profiling)
  profilingRef.current = profiling

  // Callbacks go through refs so that an inline arrow in the parent does not
  // rebuild the GL context on every parent render.
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame
  const onInfoRef = useRef(onInfo)
  onInfoRef.current = onInfo
  const onCompileRef = useRef(onCompile)
  onCompileRef.current = onCompile

  // `fragmentSource` is a real dependency: it is the only prop that requires a
  // new program. Everything else is uploaded per frame from the refs above.
  const frag = fragmentSource ?? HERO_FRAG

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
      onCompileRef.current?.({ ok: false, log: 'WebGL2 is not available in this browser.' })
      return
    }

    const compiled = compileProgram(gl, HERO_VERT, frag)
    onCompileRef.current?.({
      ok: compiled.ok,
      log: compiled.ok ? '' : compiled.log,
    })

    // On a failed edit, fall back to the shipped shader rather than bailing
    // out. The canvas is drawn with preserveDrawingBuffer:false, so there is
    // no "last frame" to leave up — returning early drops the hero to flat
    // background and makes a one-character typo look like a crashed page.
    // Keeping a known-good program running means the error log is the only
    // thing that changes, which is what an editor should do.
    let program: WebGLProgram
    if (compiled.ok) {
      delete canvas.dataset.compileError
      program = compiled.program
    } else {
      canvas.dataset.compileError = 'true'
      const fallback = compileProgram(gl, HERO_VERT, HERO_FRAG)
      // If even the shipped shader will not compile, this GPU cannot run the
      // hero at all; let the CSS gradient underneath stand in.
      if (!fallback.ok) {
        canvas.dataset.fallback = 'true'
        return
      }
      program = fallback.program
    }

    const { vao, buffer } = createFullscreenTriangle(gl)
    const timer = createGpuTimer(gl)
    const renderer = getRendererName(gl)
    const governor = createQualityGovernor()

    // -- World camera --------------------------------------------------------
    // Scroll state is integrated here, not read raw: the field should glide
    // with Lenis's inertia, and energy should flare on a fling and settle
    // slowly enough to be seen settling.
    const world = { scroll: 0, lastTarget: 0, energy: 0 }
    const track = createSceneTrack()
    // Section anchors move with fonts, images and viewport; the body observer
    // hears about all of them.
    const sceneObserver = new ResizeObserver(() => track.measure())
    sceneObserver.observe(document.body)
    track.measure()

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      pointer: gl.getUniformLocation(program, 'uPointer'),
      time: gl.getUniformLocation(program, 'uTime'),
      intensity: gl.getUniformLocation(program, 'uIntensity'),
      colorA: gl.getUniformLocation(program, 'uColorA'),
      colorB: gl.getUniformLocation(program, 'uColorB'),
      colorC: gl.getUniformLocation(program, 'uColorC'),
      // Governor-controlled, not user-facing: this one trades away detail the
      // reader cannot see at reduced resolution anyway.
      warpLayers: gl.getUniformLocation(program, 'uWarpLayers'),
      // World-camera pair. Null in a lab-edited shader that dropped them,
      // which turns the pan off rather than throwing — same contract as the
      // params below.
      scroll: gl.getUniformLocation(program, 'uScroll'),
      energy: gl.getUniformLocation(program, 'uEnergy'),
    }

    // Param uniforms are resolved by name from the schema so that a user-edited
    // shader which drops one simply gets a null location (a no-op upload)
    // instead of throwing.
    const paramLocations = HERO_PARAMS.map((spec) => ({
      spec,
      location: gl.getUniformLocation(program, spec.key),
    }))

    gl.useProgram(program)
    gl.bindVertexArray(vao)

    // Uploaded every frame rather than once at init: the palette moves with
    // both the theme toggle and the scroll camera, and three vec3 uploads are
    // free next to the fragment work.
    const uploadColors = (mood: SceneMood) => {
      gl.uniform3fv(uniforms.colorA, mood.a)
      gl.uniform3fv(uniforms.colorB, mood.b)
      gl.uniform3fv(uniforms.colorC, mood.c)
    }

    const uploadParams = () => {
      const values = paramsRef.current
      const maxOctaves = governor.tier.octaves
      for (const { spec, location } of paramLocations) {
        if (!location) continue
        let value = values[spec.key] ?? spec.value
        // The governor caps octaves rather than overwriting them, so a user
        // who deliberately lowers Quality in the shader lab keeps their lower
        // value instead of having it raised back up by the tier.
        if (spec.key === 'uOctaves') value = Math.min(value, maxOctaves)
        if (spec.integer) gl.uniform1i(location, Math.round(value))
        else gl.uniform1f(location, value)
      }
    }

    let lastInfo = ''
    const reportInfo = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const tier = governor.tier.name
      const signature = `${canvas.width}x${canvas.height}@${dpr}/${tier}`
      if (signature === lastInfo) return
      lastInfo = signature
      onInfoRef.current?.({
        width: canvas.width,
        height: canvas.height,
        dpr,
        renderer,
        timerQuerySupported: timer.supported,
        tier,
      })
    }

    const handlePointerMove = (event: PointerEvent) => {
      // Once halted the pointer no longer drives anything, so skip the work
      // entirely rather than updating a uniform nothing will ever read.
      if (halted) return
      const p = pointerRef.current
      p.tx = (event.clientX / window.innerWidth) * 2 - 1
      p.ty = -((event.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    // The field is pinned to the viewport, so this no longer fires on scroll —
    // it exists for the cases where the canvas genuinely stops being seen
    // (display:none, an unmounted preview) and as the restart edge when it
    // returns. The battery question the old offscreen pause answered is now
    // the governor's job: the field runs for the whole visit by design, and
    // the tier ladder is what keeps that affordable.
    let visible = true
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        // `halted` is terminal: scrolling the hero back into view must not
        // resurrect a loop we already decided this device cannot afford.
        if (visible && !reducedMotion && !halted) {
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
    let skipCounter = 0
    // Latched once the governor reaches the terminal tier; never cleared.
    let halted = false

    const render = (now: number) => {
      // Clamped delta: a backgrounded tab returns a huge dt that would rocket
      // the animation forward on resume.
      const rawDelta = now - lastFrame
      const delta = Math.min(rawDelta / 1000, 1 / 30)
      lastFrame = now
      elapsed += delta

      // Time still advances on skipped frames, so lowering the redraw cadence
      // slows how often we paint without slowing the animation itself.
      //
      // Skipped frames cost nothing and would drag the median down, hiding
      // the true cost of a drawn one — so the governor is fed only on frames
      // we actually render. `rawDelta` then spans the whole stride (a skipped
      // frame plus a drawn one), which is deliberately the number we want:
      // the governor's budget is about how often the page *paints*, not how
      // fast a single draw is in isolation.
      const stride = governor.tier.frameSkip + 1
      if (stride > 1 && skipCounter++ % stride !== 0) {
        if (visible && !reducedMotion) frame = requestAnimationFrame(render)
        return
      }

      // Steady-state frame cost decides the tier. A tier change resizes the
      // backing store, which is why this runs before resizeCanvas.
      if (governor.sample(rawDelta)) {
        resizeCanvas(canvas, gl, 2, governor.tier.resolution)
        reportInfo()
      } else if (resizeCanvas(canvas, gl, 2, governor.tier.resolution)) {
        reportInfo()
      }

      const p = pointerRef.current
      p.x += (p.tx - p.x) * 0.05 // critically-damped-ish follow
      p.y += (p.ty - p.y) * 0.05

      // World camera. Position eases toward the real scroll so the field
      // glides with Lenis's inertia rather than snapping under it; the ease is
      // scaled by stride so frame-skipping tiers don't also get a laggier
      // camera. Velocity (viewport-heights per second) feeds uEnergy with
      // asymmetric smoothing — a fling registers in a few frames and takes a
      // couple of seconds to settle, which is what makes the settling visible.
      const vh = window.innerHeight || 1
      const scrollTarget = window.scrollY / vh
      const dt = Math.max(rawDelta / 1000, 1e-3)
      const vel = Math.abs(scrollTarget - world.lastTarget) / dt
      world.lastTarget = scrollTarget
      const energyTarget = Math.min(1, vel * 0.35)
      world.energy +=
        (energyTarget - world.energy) * (energyTarget > world.energy ? 0.25 : 0.04)
      world.scroll += (scrollTarget - world.scroll) * (1 - Math.pow(0.88, stride))

      // The mood is sampled at the middle of the viewport: the section the
      // reader is actually looking at, not the one whose top edge they passed.
      const mood = track.sample(window.scrollY + vh * 0.5, themeRef.current)

      const measuring = profilingRef.current
      if (measuring) timer.begin()

      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
      gl.uniform2f(uniforms.pointer, p.x, p.y)
      gl.uniform1f(uniforms.time, elapsed)
      gl.uniform1f(uniforms.intensity, intensityRef.current * mood.intensity)
      gl.uniform1f(uniforms.scroll, world.scroll)
      gl.uniform1f(uniforms.energy, world.energy)
      uploadColors(mood)
      uploadParams()
      gl.uniform1i(uniforms.warpLayers, governor.tier.warpLayers)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      // The CPU interval is already computed to drive the governor, so
      // reporting it every frame is free and the session-long device profile
      // depends on it. The GPU timer query is the part that costs something,
      // so it stays gated behind `profiling` — callers get -1 for GPU time
      // when the HUD is closed, which is the same value they get on browsers
      // that withhold timer queries entirely, and is handled identically.
      if (measuring) {
        timer.end()
        // `read()` returns the newest *completed* query, which is typically
        // from a frame or two ago — that is inherent to async GPU timing, not
        // a bug. Pairing it with this frame's CPU interval is fine for a HUD.
        onFrameRef.current?.(rawDelta, timer.read())
      } else {
        onFrameRef.current?.(rawDelta, -1)
      }

      // Terminal tier: this device cannot animate the background without
      // costing the page its responsiveness, so the frame just drawn becomes
      // a still image and the loop ends here. Nothing restarts it — not the
      // IntersectionObserver, not a resize.
      if (governor.tier.halt) {
        halted = true
        return
      }

      if (visible && !reducedMotion) frame = requestAnimationFrame(render)
    }

    // Static single frame for reduced motion. Kept as a function because the
    // ResizeObserver has to be able to redraw it after any layout change —
    // otherwise a resize leaves a stretched, stale image on screen.
    const drawStaticFrame = () => {
      // A one-off frame under reduced motion has no frame rate to sustain, so
      // it can afford full quality — but once halted we are on a device that
      // demonstrably cannot, and a full-resolution redraw on every slider drag
      // would reintroduce exactly the stall the halt exists to prevent.
      resizeCanvas(canvas, gl, 2, halted ? governor.tier.resolution : 1)
      reportInfo()
      // The still frame is honest about where the page is: it bakes in the
      // scroll position and mood of the moment it was drawn. Under reduced
      // motion nothing will pan it afterwards — holding still is the point.
      const vh = window.innerHeight || 1
      const mood = track.sample(window.scrollY + vh * 0.5, themeRef.current)
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
      gl.uniform2f(uniforms.pointer, 0, 0)
      gl.uniform1f(uniforms.time, 12)
      gl.uniform1f(uniforms.intensity, intensityRef.current * mood.intensity)
      gl.uniform1f(uniforms.scroll, window.scrollY / vh)
      gl.uniform1f(uniforms.energy, 0)
      uploadColors(mood)
      uploadParams()
      gl.uniform1i(uniforms.warpLayers, governor.tier.warpLayers)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    if (reducedMotion) drawStaticFrame()
    else frame = requestAnimationFrame(render)

    // ResizeObserver rather than a window resize listener: the canvas can be
    // laid out at 0x0 on first mount (before fonts/layout settle), and only an
    // element-level observer fires when it later gets its real size.
    const resizeObserver = new ResizeObserver(() => {
      if (reducedMotion) drawStaticFrame()
      else if (resizeCanvas(canvas, gl, 2, governor.tier.resolution)) reportInfo()
    })
    resizeObserver.observe(canvas)

    // The reduced-motion path draws exactly one frame, so a theme toggle would
    // otherwise leave the previous palette frozen on screen. The animated path
    // picks the change up on its next frame and needs no help.
    const onThemeChange = () => {
      if (reducedMotion) drawStaticFrame()
    }
    window.addEventListener('themechange', onThemeChange)

    // A static frame ignores param edits, so the playground would look broken
    // without an explicit redraw signal. This covers both reduced-motion and
    // the halted tier, where the loop has stopped for good but the sliders
    // must still visibly do something.
    const onParamsChange = () => {
      if (reducedMotion || halted) drawStaticFrame()
    }
    window.addEventListener('shaderparams', onParamsChange)

    return () => {
      window.removeEventListener('themechange', onThemeChange)
      window.removeEventListener('shaderparams', onParamsChange)
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver.disconnect()
      sceneObserver.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      timer.dispose()
      gl.deleteProgram(program)
      gl.deleteVertexArray(vao)
      gl.deleteBuffer(buffer)
      // Deliberately NOT calling loseContext(): a canvas only ever vends one
      // WebGL context, so killing it here would leave StrictMode's second mount
      // (and any future remount) compiling against a dead context.
    }
  }, [reducedMotion, frag])

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
