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
  | 'uBallRadius'
  | 'uSmooth'
  | 'uRim'
  | 'uAberration'
  | 'uGrain'
  | 'uVignette'
  | 'uOctaves'

export type ParamSpec = {
  key: ParamKey
  label: string
  value: number
  min: number
  max: number
  step: number
  /** Integer uniforms upload via uniform1i and render without decimals. */
  integer?: boolean
  /** Shown under the label — what the reader learns by dragging it. */
  hint: string
}

export const HERO_PARAMS: ParamSpec[] = [
  {
    key: 'uWarp',
    label: 'Domain warp',
    value: 4.0,
    min: 0,
    max: 8,
    step: 0.05,
    hint: 'How hard the noise field folds through itself. 0 is plain FBM.',
  },
  {
    key: 'uScale',
    label: 'Field scale',
    value: 1.8,
    min: 0.2,
    max: 6,
    step: 0.05,
    hint: 'Frequency of the base noise — larger is busier, finer detail.',
  },
  {
    key: 'uSpeed',
    label: 'Flow speed',
    value: 0.35,
    min: 0,
    max: 1.5,
    step: 0.01,
    hint: 'Time multiplier. 0 freezes the field without stopping the loop.',
  },
  {
    key: 'uBallRadius',
    label: 'Pointer mass',
    value: 0.22,
    min: 0,
    max: 0.8,
    step: 0.01,
    hint: 'Radius of the metaball that tracks your cursor.',
  },
  {
    key: 'uSmooth',
    label: 'Smooth min',
    value: 0.45,
    min: 0.01,
    max: 1.2,
    step: 0.01,
    hint: 'Blend radius where metaballs merge. Low values crease.',
  },
  {
    key: 'uRim',
    label: 'Rim light',
    value: 0.5,
    min: 0,
    max: 2,
    step: 0.01,
    hint: 'Accent glow on the metaball boundary.',
  },
  {
    key: 'uAberration',
    label: 'Aberration',
    value: 0.006,
    min: 0,
    max: 0.05,
    step: 0.001,
    hint: 'Chromatic split. Costs a second field evaluation per fragment.',
  },
  {
    key: 'uGrain',
    label: 'Film grain',
    value: 0.035,
    min: 0,
    max: 0.2,
    step: 0.001,
    hint: 'Per-frame noise. Also hides gradient banding.',
  },
  {
    key: 'uVignette',
    label: 'Vignette',
    value: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
    hint: 'Corner falloff, keeps display type legible.',
  },
  {
    key: 'uOctaves',
    label: 'FBM octaves',
    value: 5,
    min: 1,
    max: 8,
    step: 1,
    integer: true,
    hint: 'Noise layers per sample. The main GPU cost dial — watch the HUD.',
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
  { name: 'Shipped', values: DEFAULT_PARAMS },
  {
    name: 'Liquid metal',
    values: { uWarp: 6.4, uScale: 1.2, uSpeed: 0.18, uRim: 1.5, uGrain: 0.01, uSmooth: 0.85 },
  },
  {
    name: 'Static field',
    values: { uWarp: 0, uScale: 3.4, uSpeed: 0, uRim: 0.2, uAberration: 0, uOctaves: 8 },
  },
  {
    name: 'Cheap mode',
    values: { uOctaves: 1, uWarp: 1.2, uAberration: 0, uGrain: 0.06, uScale: 2.4 },
  },
  {
    name: 'Overdrive',
    values: { uWarp: 7.5, uScale: 4.2, uSpeed: 1.1, uRim: 1.8, uAberration: 0.03, uOctaves: 8 },
  },
]
