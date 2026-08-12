/**
 * Runtime quality governor for the hero shader.
 *
 * The shader's cost is dominated by fragment work, and the range of GPUs that
 * will load this page spans roughly two orders of magnitude — an M-series Mac
 * and a four-year-old Android phone are both "a browser with WebGL2". A single
 * hard-coded quality setting therefore either wastes a fast GPU or melts a slow
 * one. Worse, the slow case does not merely look bad: a fragment shader that
 * misses frame deadlines starves the compositor, and the whole page — scroll,
 * hover, the custom cursor — goes sluggish with it.
 *
 * So quality is measured rather than assumed. The governor watches median
 * frame time and steps down through tiers until the page holds its budget.
 */

export type QualityTier = {
  name: string
  /** Multiplier on the backing-store resolution. Cost scales with its square. */
  resolution: number
  /** FBM octaves. Linear in cost. */
  octaves: number
  /** Domain-warp passes: 2 is the full look, 1 removes 40% of the work. */
  warpLayers: number
  /** Frames to skip between redraws: 0 = every frame, 1 = every other. */
  frameSkip: number
  /**
   * Terminal tier: draw one last frame and stop the loop permanently. The
   * shader becomes a static image and the GPU goes idle.
   */
  halt?: boolean
}

/**
 * Ordered best to worst. The first tier is what a modern discrete GPU gets;
 * the last is a deliberate "still moving, still pretty, costs almost nothing"
 * floor rather than a black rectangle.
 *
 * Resolution is cut before octaves because halving resolution removes 75% of
 * the work while octaves are only linear — and because losing an octave of
 * detail is more visible on this content than a slightly softer image.
 */
export const QUALITY_TIERS: QualityTier[] = [
  { name: 'high', resolution: 1.0, octaves: 5, warpLayers: 2, frameSkip: 0 },
  { name: 'medium', resolution: 0.75, octaves: 5, warpLayers: 2, frameSkip: 0 },
  { name: 'low', resolution: 0.5, octaves: 4, warpLayers: 2, frameSkip: 0 },
  { name: 'minimal', resolution: 0.4, octaves: 3, warpLayers: 1, frameSkip: 1 },
  { name: 'floor', resolution: 0.3, octaves: 2, warpLayers: 1, frameSkip: 2 },
  // Terminal state: one static frame, then the loop stops for good.
  // The background is decoration; the page is the product. If a device
  // cannot draw the decoration without taxing scroll and hover, the
  // decoration is what gives way — it holds a still image and costs nothing
  // from then on.
  { name: 'static', resolution: 0.5, octaves: 3, warpLayers: 1, frameSkip: 0, halt: true },
]

/** 30fps. The hero drifts slowly; it does not need 60 and cannot always earn it. */
const BUDGET_MS = 1000 / 30
/** Only climb back up when there is real headroom, not merely a passing frame. */
const UPGRADE_MS = 1000 / 55

/**
 * Picks a conservative opening tier from what the device advertises.
 *
 * Starting at `high` and measuring down means every visitor pays for the
 * worst frames of their session in the first second — precisely while the
 * hero is animating in and the impression is being formed. Since the governor
 * climbs back up when there is headroom, guessing low costs a fast machine
 * about a second of slightly softer background, while guessing high costs a
 * slow one a visible stall. The asymmetry says start low.
 */
export function pickInitialTier(): number {
  if (typeof navigator === 'undefined') return 1

  const cores = navigator.hardwareConcurrency ?? 4
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  // Coarse pointer is a strong proxy for "phone or tablet": a mobile GPU
  // paired with a high DPR is the single worst case for a fullscreen
  // fragment shader, since cost scales with the square of that ratio.
  const coarse =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(pointer: coarse)').matches

  if (coarse) return dpr > 2 ? 3 : 2
  if (cores <= 4) return 2
  return 1
}

export function createQualityGovernor(startTier = pickInitialTier()) {
  let tier = startTier
  let samples: number[] = []
  // Downgrades are cheap and urgent; upgrades are speculative and should be
  // rare. Requiring a long clean streak before climbing prevents the visible
  // oscillation you get when a tier sits exactly on the budget boundary.
  let goodStreak = 0
  let locked = false
  // The best tier this device has already proven it cannot hold. Once a tier
  // has failed, climbing back into it produces a visible oscillation — the
  // background softens, sharpens, softens again — which reads as a glitch and
  // is worse than simply staying at the lower quality. So the ceiling only
  // ever descends.
  let ceiling = 0

  return {
    get tier() {
      return QUALITY_TIERS[tier]
    },
    get tierIndex() {
      return tier
    },
    /** Pin the current tier — used when the user takes manual control. */
    lock() {
      locked = true
    },

    /**
     * Feed one frame interval. Returns true when the tier changed, so the
     * caller knows to resize the backing store.
     */
    sample(frameMs: number): boolean {
      if (locked) return false

      // Ignore absurd intervals: tab switches, devtools opening, and the first
      // frame after a resize all produce spikes that say nothing about steady
      // state, and reacting to them would drop quality for no reason.
      if (frameMs > 2000) return false

      samples.push(frameMs)

      // The window is a frame count, so on a slow device it is also a long
      // stretch of wall-clock time — 30 frames at 12fps is two and a half
      // seconds per decision, and descending four tiers would take ten
      // seconds of visible jank. Sizing the window by how bad things are
      // keeps the *worst* devices converging fastest, which is exactly
      // where responsiveness matters most.
      const window = frameMs > 100 ? 6 : frameMs > 40 ? 12 : 30
      if (samples.length < window) return false

      samples.sort((a, b) => a - b)
      const median = samples[Math.floor(samples.length / 2)]
      samples = []

      // Tiers that deliberately skip frames paint less often by design, so
      // their measured interval must be judged against a proportionally
      // larger budget. Without this, `minimal` and `floor` would always look
      // over budget and the governor would ratchet down forever, ending at
      // the floor on hardware that never needed to leave `low`.
      const stride = QUALITY_TIERS[tier].frameSkip + 1
      const budget = BUDGET_MS * stride

      if (median > budget && tier < QUALITY_TIERS.length - 1) {
        // This tier just failed, so it and everything above it are now out of
        // reach for the rest of the session.
        ceiling = tier + 1
        tier++
        goodStreak = 0
        return true
      }

      if (median < UPGRADE_MS * stride && tier > ceiling) {
        goodStreak++
        // ~4 consecutive clean windows before climbing back.
        if (goodStreak >= 4) {
          tier--
          goodStreak = 0
          return true
        }
      } else {
        goodStreak = 0
      }

      return false
    },
  }
}

export type QualityGovernor = ReturnType<typeof createQualityGovernor>
