/**
 * The tunable surface of the hero shader.
 *
 * This is the single source of truth for three consumers that must never drift
 * apart: the GLSL uniform defaults, the playground's slider ranges, and the
 * "reset" state. Every `value` below is the literal that was previously
 * hard-coded at the matching site in `heroShader.ts`, so a fresh page load with
 * the playground closed renders exactly what it rendered before the playground
 * existed.
 */

export type ParamKey =
  | 'uWarp'
  | 'uScale'
  | 'uSpeed'
  | 'uTravel'
  | 'uBallRadius'
  | 'uSmooth'
  | 'uRim'
  | 'uAberration'
  | 'uGrain'
  | 'uVignette'
  | 'uOctaves'

export type ParamSpec = {
  key: ParamKey
  /**
   * Plain-language name. Most visitors are not graphics programmers, and
   * "Domain warp" tells them nothing about what the slider will do — whereas
   * "Swirl" lets them predict the result before they drag it. The technical
   * term still appears in `term` for the readers who want it.
   */
  label: string
  /** The real graphics term, shown small beside the label. */
  term: string
  value: number
  min: number
  max: number
  step: number
  /** Integer uniforms upload via uniform1i and render without decimals. */
  integer?: boolean
  /** One line, in plain words, describing what changes on screen. */
  hint: string
}

export const HERO_PARAMS: ParamSpec[] = [
  {
    key: 'uWarp',
    label: 'Swirl',
    term: 'domain warp',
    value: 4.0,
    min: 0,
    max: 8,
    step: 0.05,
    hint: 'How much the pattern twists through itself. Zero is smooth clouds.',
  },
  {
    key: 'uScale',
    label: 'Detail',
    term: 'field scale',
    value: 1.8,
    min: 0.2,
    max: 6,
    step: 0.05,
    hint: 'Bigger values pack in finer, busier texture.',
  },
  {
    key: 'uSpeed',
    label: 'Speed',
    term: 'time scale',
    value: 0.35,
    min: 0,
    max: 1.5,
    step: 0.01,
    hint: 'How fast it drifts. Slide to zero to freeze the picture.',
  },
  {
    // The one parameter with no pre-playground literal: it arrived with the
    // site-wide field, where scroll pans the fluid. Zero disconnects the
    // field from the page and it becomes wallpaper again.
    key: 'uTravel',
    label: 'Travel',
    term: 'scroll parallax',
    value: 0.6,
    min: 0,
    max: 2,
    step: 0.05,
    hint: 'How far the fluid streams past as you scroll. Zero pins it in place.',
  },
  {
    key: 'uBallRadius',
    label: 'Blob size',
    term: 'metaball radius',
    value: 0.22,
    min: 0,
    max: 0.8,
    step: 0.01,
    // Deliberately not "follows your mouse": on a phone there is no cursor,
    // and the blob simply sits centred. Wording that only makes sense on
    // desktop reads as a bug to half the audience.
    hint: 'Size of the blob that follows your pointer on desktop.',
  },
  {
    key: 'uSmooth',
    label: 'Blob softness',
    term: 'smooth minimum',
    value: 0.45,
    min: 0.01,
    max: 1.2,
    step: 0.01,
    hint: 'How gooey the blobs are when they merge. Low values look sharp.',
  },
  {
    key: 'uRim',
    label: 'Edge glow',
    term: 'rim light',
    value: 0.5,
    min: 0,
    max: 2,
    step: 0.01,
    hint: 'Brightness of the coloured outline around each blob.',
  },
  {
    key: 'uAberration',
    label: 'Colour fringe',
    term: 'chromatic aberration',
    value: 0.006,
    min: 0,
    max: 0.05,
    step: 0.001,
    hint: 'Splits red away from the rest, like a cheap camera lens.',
  },
  {
    key: 'uGrain',
    label: 'Grain',
    term: 'film grain',
    value: 0.035,
    min: 0,
    max: 0.2,
    step: 0.001,
    hint: 'Speckled film texture. Also hides banding in the gradient.',
  },
  {
    key: 'uVignette',
    label: 'Edge darkening',
    term: 'vignette',
    value: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
    hint: 'Darkens the corners so the headline stays readable.',
  },
  {
    key: 'uOctaves',
    label: 'Quality',
    term: 'FBM octaves',
    value: 5,
    min: 1,
    max: 8,
    step: 1,
    integer: true,
    hint: 'Layers of detail. This is the big one for speed — watch the Speed tab.',
  },
]

export type ParamValues = Record<ParamKey, number>

export const DEFAULT_PARAMS: ParamValues = Object.fromEntries(
  HERO_PARAMS.map((p) => [p.key, p.value]),
) as ParamValues

/**
 * A few states worth arriving at directly. Dragging ten sliders to find
 * something interesting is a game; being shown the extremes of the system in
 * one click is a demonstration.
 */
export const PRESETS: { name: string; values: Partial<ParamValues> }[] = [
  { name: 'Original', values: DEFAULT_PARAMS },
  {
    name: 'Liquid metal',
    values: { uWarp: 6.4, uScale: 1.2, uSpeed: 0.18, uRim: 1.5, uGrain: 0.01, uSmooth: 0.85 },
  },
  {
    name: 'Frozen',
    values: { uWarp: 0, uScale: 3.4, uSpeed: 0, uRim: 0.2, uAberration: 0, uOctaves: 8 },
  },
  {
    name: 'Low power',
    values: { uOctaves: 1, uWarp: 1.2, uAberration: 0, uGrain: 0.06, uScale: 2.4 },
  },
  {
    name: 'Maximum chaos',
    values: { uWarp: 7.5, uScale: 4.2, uSpeed: 1.1, uRim: 1.8, uAberration: 0.03, uOctaves: 8 },
  },
]
