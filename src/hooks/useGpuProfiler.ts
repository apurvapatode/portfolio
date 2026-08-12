import { useEffect, useRef, useState } from 'react'

export type GpuStats = {
  /** Rolling median CPU frame interval, ms. */
  frameMs: number
  /** Frames per second derived from `frameMs`. */
  fps: number
  /** Median GPU time for the hero draw, ms. -1 when unavailable. */
  gpuMs: number
  /** 99th-percentile frame interval — the number that actually shows as jank. */
  p99Ms: number
  /** Backing-store size in device pixels. */
  width: number
  height: number
  dpr: number
  /** Fragments shaded per second, in millions. The real cost driver here. */
  megaFragsPerSec: number
  renderer: string
  timerQuerySupported: boolean
  /** Adaptive-quality tier the renderer settled on. */
  tier: string
}

export const EMPTY_STATS: GpuStats = {
  frameMs: 0,
  fps: 0,
  gpuMs: -1,
  p99Ms: 0,
  width: 0,
  height: 0,
  dpr: 1,
  megaFragsPerSec: 0,
  renderer: 'unknown',
  timerQuerySupported: false,
  tier: 'high',
}

/**
 * A fixed-size ring of samples with percentile readout.
 *
 * Percentiles need the samples sorted, but sorting the live ring would destroy
 * insertion order and break the overwrite cursor — so `percentile` sorts into a
 * scratch array that is allocated once and reused. The whole point of this
 * class is that measuring the frame loop must not itself allocate per frame.
 */
export class SampleRing {
  private readonly capacity: number
  private readonly values: Float32Array
  private readonly scratch: Float32Array
  private cursor = 0
  private filled = 0

  constructor(capacity = 120) {
    this.capacity = capacity
    this.values = new Float32Array(capacity)
    this.scratch = new Float32Array(capacity)
  }

  push(value: number) {
    this.values[this.cursor] = value
    this.cursor = (this.cursor + 1) % this.capacity
    if (this.filled < this.capacity) this.filled++
  }

  get size() {
    return this.filled
  }

  /** `p` in 0..1. Returns 0 when no samples have landed yet. */
  percentile(p: number): number {
    if (this.filled === 0) return 0
    const view = this.scratch.subarray(0, this.filled)
    view.set(this.values.subarray(0, this.filled))
    view.sort()
    const index = Math.min(this.filled - 1, Math.max(0, Math.round(p * (this.filled - 1))))
    return view[index]
  }

  clear() {
    this.cursor = 0
    this.filled = 0
  }
}

/**
 * Collects frame timings pushed from the render loop and republishes them to
 * React on a slow interval.
 *
 * The split matters: the render loop calls `record()` at 60Hz and that must
 * stay allocation-free and render-free, so samples accumulate in a ref. A timer
 * then lifts a summary into state ~4x a second, which is as fast as a human can
 * read a HUD anyway. Sampling at 60Hz into React state would make the profiler
 * the most expensive thing on the page — the observer changing what it observes.
 */
export function useGpuProfiler(enabled: boolean) {
  const [stats, setStats] = useState<GpuStats>(EMPTY_STATS)

  const frameRing = useRef(new SampleRing(120))
  const gpuRing = useRef(new SampleRing(60))
  const meta = useRef({
    width: 0,
    height: 0,
    dpr: 1,
    renderer: 'unknown',
    timerQuerySupported: false,
    tier: 'high',
  })

  /** Called once per frame from the GL loop. Must stay cheap. */
  const record = useRef((frameMs: number, gpuMs: number) => {
    frameRing.current.push(frameMs)
    if (gpuMs >= 0) gpuRing.current.push(gpuMs)
  }).current

  /** Called on resize / init from the GL layer. */
  const describe = useRef(
    (info: {
      width: number
      height: number
      dpr: number
      renderer: string
      timerQuerySupported: boolean
      tier: string
    }) => {
      meta.current = info
    },
  ).current

  useEffect(() => {
    if (!enabled) return

    const id = window.setInterval(() => {
      const frames = frameRing.current
      if (frames.size === 0) return

      // Median, not mean: one 300ms hitch from a GC pause or a devtools open
      // would drag a mean far away from what the frame loop is actually doing.
      const frameMs = frames.percentile(0.5)
      const p99Ms = frames.percentile(0.99)
      const gpuMs = gpuRing.current.size > 0 ? gpuRing.current.percentile(0.5) : -1

      const { width, height, dpr, renderer, timerQuerySupported, tier } = meta.current
      const fps = frameMs > 0 ? 1000 / frameMs : 0

      setStats({
        frameMs,
        fps,
        gpuMs,
        p99Ms,
        width,
        height,
        dpr,
        // Every frame shades the full backing store once — one fullscreen
        // triangle, no overdraw — so fragments/sec is just pixels x fps.
        megaFragsPerSec: (width * height * fps) / 1e6,
        renderer,
        timerQuerySupported,
        tier,
      })
    }, 250)

    return () => window.clearInterval(id)
  }, [enabled])

  // Stale samples from before the HUD was closed would show as a spike on
  // reopen, so drop them when profiling stops.
  useEffect(() => {
    if (enabled) return
    frameRing.current.clear()
    gpuRing.current.clear()
    setStats(EMPTY_STATS)
  }, [enabled])

  return { stats, record, describe }
}
