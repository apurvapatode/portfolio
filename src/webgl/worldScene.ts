/**
 * The colour journey of the site-wide shader field.
 *
 * The field is the ground the whole page sits on, and scroll is a slow camera
 * move through one continuous fluid. What sells that idea is not the pan — it
 * is that the *mood* of the fluid belongs to the content in front of it. Each
 * station below ties a palette to one section of the page, and the camera
 * cross-fades between neighbouring stations as the seam approaches, so the
 * world you are travelling through changes climate as the subject changes.
 *
 * Station positions are measured from the real DOM rather than hard-coded:
 * section offsets move with viewport width, font loading and content edits,
 * and a mood that arrives one viewport late reads as broken, not atmospheric.
 */

type Rgb = readonly [number, number, number]

export type ScenePalette = {
  /** Base tone — darkest in dark theme, palest in light. */
  a: Rgb
  /** Mid tone; carries the station's hue. */
  b: Rgb
  /** Accent — the metaball glow and rim light. */
  c: Rgb
}

type Station = {
  /** DOM id of the section whose centre anchors this mood. */
  id: string
  /**
   * Multiplier on the shader's master intensity: quiet where there is long
   * copy to read, louder where the page is asking for a decision.
   */
  intensity: number
  dark: ScenePalette
  light: ScenePalette
}

/**
 * Dark palettes keep `a` constant — it is the legibility floor under every
 * word on the page, and only `b` (hue) and `c` (accent) are allowed to travel.
 *
 * Light palettes are not inversions: the shader multiplies and adds, so a
 * lightened dark ramp blows out to white. They follow the constraint
 * documented when the light hero palette was tuned — `a` near-white, `b` a
 * high-value low-saturation tint, `c` mid-value — which keeps the fluid
 * structure readable while dark display type sits on top. Only the hue of `b`
 * and `c` moves between stations; their value levels match the measured hero
 * pair so no station clips brighter than the tuned baseline.
 */
const DARK_BASE: Rgb = [0.015, 0.015, 0.025]
const LIGHT_BASE: Rgb = [0.985, 0.985, 0.995]

const STATIONS: Station[] = [
  {
    // The shipped hero palette: near-black → desaturated indigo → acid.
    id: 'top',
    intensity: 1,
    dark: { a: DARK_BASE, b: [0.07, 0.05, 0.19], c: [0.55, 0.85, 0.14] },
    light: { a: LIGHT_BASE, b: [0.88, 0.87, 0.97], c: [0.7, 0.86, 0.4] },
  },
  {
    // Work: the indigo deepens toward plasma — the accent of the case-study
    // links — and the field quietens under the project copy.
    id: 'work',
    intensity: 0.85,
    dark: { a: DARK_BASE, b: [0.1, 0.05, 0.21], c: [0.43, 0.29, 1.0] },
    light: { a: LIGHT_BASE, b: [0.895, 0.865, 0.965], c: [0.56, 0.47, 0.93] },
  },
  {
    // Device report: clinical teal — the one section that is an instrument
    // rather than a pitch, and the palette says lab, not lava.
    id: 'device',
    intensity: 0.95,
    dark: { a: DARK_BASE, b: [0.03, 0.09, 0.15], c: [0.24, 0.85, 0.8] },
    light: { a: LIGHT_BASE, b: [0.855, 0.915, 0.94], c: [0.32, 0.72, 0.68] },
  },
  {
    // Services/process: warmth creeps in as the page turns from evidence to
    // offer. Lowest intensity on the page — this is its longest stretch of
    // reading.
    id: 'services',
    intensity: 0.8,
    dark: { a: DARK_BASE, b: [0.13, 0.05, 0.07], c: [1.0, 0.3, 0.18] },
    light: { a: LIGHT_BASE, b: [0.955, 0.885, 0.86], c: [0.9, 0.47, 0.33] },
  },
  {
    // Contact: back to acid — the same colour as the CTA the reader is being
    // asked to press — and the loudest the field gets.
    id: 'contact',
    intensity: 1.1,
    dark: { a: DARK_BASE, b: [0.12, 0.05, 0.17], c: [0.55, 0.85, 0.14] },
    light: { a: LIGHT_BASE, b: [0.915, 0.87, 0.955], c: [0.7, 0.86, 0.4] },
  },
]

export type SceneMood = {
  a: Float32Array
  b: Float32Array
  c: Float32Array
  intensity: number
}

function mixInto(target: Float32Array, from: Rgb, to: Rgb, t: number) {
  target[0] = from[0] + (to[0] - from[0]) * t
  target[1] = from[1] + (to[1] - from[1]) * t
  target[2] = from[2] + (to[2] - from[2]) * t
}

export function createSceneTrack() {
  // Document-space y of each present station's centre, in px, ascending.
  // Stations whose section is absent are simply skipped — the ids are shared
  // with the DOM, and a section can be removed without this module hearing
  // about it.
  let points: { y: number; station: Station }[] = []

  // Reused output: sample() runs inside the draw loop, and allocating three
  // arrays per frame is how a background earns itself a GC pause.
  const mood: SceneMood = {
    a: new Float32Array(3),
    b: new Float32Array(3),
    c: new Float32Array(3),
    intensity: 1,
  }

  return {
    /** Re-read station anchors from the DOM. Cheap; call on any layout move. */
    measure() {
      const scrollY = window.scrollY
      points = []
      for (const station of STATIONS) {
        const el = document.getElementById(station.id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        points.push({ y: scrollY + rect.top + rect.height / 2, station })
      }
    },

    /**
     * The mood at a document-space camera position (usually scrollY plus half
     * a viewport, i.e. what is in the middle of the screen). Returns a shared
     * object — read it before the next call, don't keep it.
     */
    sample(cameraY: number, theme: 'light' | 'dark'): SceneMood {
      // Before measure() finds anything (prerender, missing ids), hold the
      // hero mood rather than flashing black.
      if (points.length === 0) {
        const p = theme === 'light' ? STATIONS[0].light : STATIONS[0].dark
        mixInto(mood.a, p.a, p.a, 0)
        mixInto(mood.b, p.b, p.b, 0)
        mixInto(mood.c, p.c, p.c, 0)
        mood.intensity = STATIONS[0].intensity
        return mood
      }

      let i = 0
      while (i < points.length - 1 && cameraY > points[i + 1].y) i++
      const from = points[i]
      const to = points[Math.min(i + 1, points.length - 1)]

      let t = to.y > from.y ? (cameraY - from.y) / (to.y - from.y) : 0
      t = Math.min(1, Math.max(0, t))
      // Smoothstep holds the mood through the heart of a section and spends
      // the transition at the seam, where the eye is already moving.
      t = t * t * (3 - 2 * t)

      const pa = theme === 'light' ? from.station.light : from.station.dark
      const pb = theme === 'light' ? to.station.light : to.station.dark
      mixInto(mood.a, pa.a, pb.a, t)
      mixInto(mood.b, pa.b, pb.b, t)
      mixInto(mood.c, pa.c, pb.c, t)
      mood.intensity =
        from.station.intensity + (to.station.intensity - from.station.intensity) * t
      return mood
    },
  }
}

export type SceneTrack = ReturnType<typeof createSceneTrack>